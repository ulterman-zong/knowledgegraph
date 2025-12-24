<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useDataStore } from '@/stores/modules/DataStore'
import { useRoute } from 'vue-router'
import markerIcon from '@/assets/bb63e069635472c8c6cfc779ac6874a7.jpg'
import { ElMessage } from 'element-plus'

// 高德配置
const AMAP_CONFIG = {
  jsKey: import.meta.env.VITE_AMAP_JS_KEY?.trim() || '',
  jsApiVersion: '2.0',
  plugins: ['AMap.Marker', 'AMap.InfoWindow']
}

// 状态管理
const mapRef = ref(null)
let mapInstance = null
let infoWindow = null
const markerMap = new Map()
const dataStore = useDataStore()
const route = useRoute()
let unwatchData = null

// 加载高德API（增加版本打印，排查版本问题）
const loadAmapJsApi = () => {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      console.log('当前高德API版本：', window.AMap.version) // 打印版本
      resolve(window.AMap)
      return
    }
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=${AMAP_CONFIG.jsApiVersion}&key=${AMAP_CONFIG.jsKey}&plugin=${AMAP_CONFIG.plugins.join(',')}`
    script.onload = () => {
      console.log('加载的高德API版本：', window.AMap.version)
      resolve(window.AMap)
    }
    script.onerror = () => reject(new Error('高德地图JS API加载失败'))
    document.head.appendChild(script)
  })
}

// 初始化地图
const initMap = async () => {
  try {
    const AMap = await loadAmapJsApi()
    mapInstance = new AMap.Map(mapRef.value, {
      zoom: 8,
      center: [105.07, 36.03],
      resizeEnable: true,
      mapStyle: 'amap://styles/normal'
    })
    infoWindow = new AMap.InfoWindow({
      offset: new AMap.Pixel(0, -30)
    })
    locateNodeByRoute() // 地图初始化后定位
  } catch (err) {
    console.error('地图初始化失败：', err)
  }
}

// 渲染节点（增加坐标校验，确保Marker有效）
const renderSpatialNodes = (spatialNodes) => {
  if (!mapInstance) return
  markerMap.forEach((marker) => mapInstance.remove(marker))
  markerMap.clear()

  const AMap = window.AMap
  const validNodes = spatialNodes.filter((node) => {
    // 排除info中pointType等于'Class'的节点
    return node.info?.pointType !== 'Class'
  })

  validNodes.forEach((node) => {
    // 校验坐标有效性，避免创建无效Marker
    if (
      !node.coords ||
      !Array.isArray(node.coords) ||
      node.coords.length !== 2 ||
      isNaN(node.coords[0]) ||
      isNaN(node.coords[1])
    ) {
      console.warn('跳过无效坐标节点：', node.id)
      return
    }
    // 显式创建LngLat坐标（高德推荐，提升兼容性）
    const marker = new AMap.Marker({
      position: new AMap.LngLat(node.coords[0], node.coords[1]),
      title: node.name,
      map: mapInstance,
      icon: new AMap.Icon({
        size: new AMap.Size(30, 30),
        image: markerIcon,
        imageSize: new AMap.Size(30, 30)
      }),
      draggable: false
    })
    marker.on('click', () => showNodeInfo(node))
    markerMap.set(node.id, marker)
  })
}

// 显示节点信息
const showNodeInfo = (node) => {
  const infoContent = `
    <div style="padding: 10px; min-width: 200px;">
      <h4 style="margin: 0 0 8px 0; color: ${node.color};">${node.name}</h4>
      <div style="font-size: 12px; color: #666;">
        <p>类型：${node.info.type}</p>
        <p>坐标：${node.coords.join(', ')}</p>
        <p>高程：${node.info.z}m</p>
        ${node.info.parentId ? `<p>父节点ID：${node.info.parentId}</p>` : ''}
      </div>
    </div>
  `
  infoWindow.setContent(infoContent)
  infoWindow.open(mapInstance, node.coords)
}

// 核心：定位节点（保留动画+安全校验+修复定位）
const locateNodeByRoute = () => {
  const nodeId = route.query.nodeId
  if (!nodeId || !mapInstance) return

  // 延长延迟到800ms（确保Marker完全渲染，原100ms太短）
  setTimeout(() => {
    // 重新获取最新节点数据（避免数据同步问题）
    const spatialNodes = dataStore.getSpatialNodes()
    const node = spatialNodes.find((item) => item.id === Number(nodeId))

    // 第一步：校验节点和坐标
    if (!node) {
      ElMessage.warning('未找到该节点')
      return
    }
    if (node.info?.pointType === 'Class') {
      ElMessage.warning('该类型节点不支持在地图上显示和定位')
      return
    }
    if (
      !node.coords ||
      !Array.isArray(node.coords) ||
      node.coords.length !== 2 ||
      isNaN(node.coords[0]) ||
      isNaN(node.coords[1])
    ) {
      ElMessage.warning('该节点坐标无效：' + JSON.stringify(node.coords))
      return
    }

    // 第二步：强制定位（核心，确保跳转生效）
    const targetCoords = new window.AMap.LngLat(node.coords[0], node.coords[1])
    mapInstance.setCenter(targetCoords) // 显式用LngLat对象
    mapInstance.setZoom(14)
    // 兜底：强制让节点出现在视野中（即使setCenter失效）
    mapInstance.setFitView([markerMap.get(Number(nodeId))], {
      padding: [50, 50, 50, 50], // 留边避免贴边
      zoomFixed: 14 // 固定缩放级别
    })

    // 第三步：安全调用动画（不影响定位）
    const marker = markerMap.get(Number(nodeId))
    if (marker && typeof marker.setAnimation === 'function') {
      // 用官方常量替代字符串，提升兼容性
      marker.setAnimation(window.AMap?.AMAP_ANIMATION_BOUNCE || 'AMAP_ANIMATION_BOUNCE')
      setTimeout(() => marker.setAnimation(null), 2000)
    } else if (marker) {
      // 动画调用失败时的兜底提示（不阻断定位）
      console.warn('动画方法缺失，跳过动画，但定位已生效')
    }

    // 第四步：显示信息窗（确认定位）
    showNodeInfo(node)
  }, 800) // 关键：延迟从100→800ms，适配Marker渲染
}

// 监听路由参数变化
watch([() => route.query.nodeId], () => {
  if (mapInstance) locateNodeByRoute()
})

onMounted(async () => {
  await initMap()
  unwatchData = dataStore.watchSpatialData((spatialNodes) => {
    renderSpatialNodes(spatialNodes)
    locateNodeByRoute() // 数据更新后重新定位
  })
})

onUnmounted(() => {
  if (mapInstance) mapInstance.destroy()
  if (unwatchData) unwatchData()
  markerMap.clear()
  infoWindow = null
})
</script>

<template>
  <div class="map-container" ref="mapRef"></div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: calc(100vh - 60px);
  border: 1px solid #eee;
}
</style>

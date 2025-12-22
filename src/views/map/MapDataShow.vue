<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useDataStore } from '@/stores/modules/DataStore'
import { useRoute } from 'vue-router' // 新增：读取路由参数
import markerIcon from '@/assets/微信图片_20251222094059_181_57.jpg'
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
const route = useRoute() // 路由参数
let unwatchData = null

// 加载高德API
const loadAmapJsApi = () => {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      resolve(window.AMap)
      return
    }
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=${AMAP_CONFIG.jsApiVersion}&key=${AMAP_CONFIG.jsKey}&plugin=${AMAP_CONFIG.plugins.join(',')}`
    script.onload = () => resolve(window.AMap)
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
    // 地图初始化后，定位路由参数对应的节点
    locateNodeByRoute()
  } catch (err) {
    console.error('地图初始化失败：', err)
  }
}

// 渲染节点
const renderSpatialNodes = (spatialNodes) => {
  if (!mapInstance) return
  markerMap.forEach((marker) => mapInstance.remove(marker))
  markerMap.clear()

  const AMap = window.AMap
  spatialNodes.forEach((node) => {
    const marker = new AMap.Marker({
      position: node.coords,
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

// 核心：根据路由参数定位节点
const locateNodeByRoute = () => {
  const nodeId = route.query.nodeId
  if (!nodeId || !mapInstance) return

  // 修复：延迟100ms，确保节点已渲染到markerMap中
  setTimeout(() => {
    const node = dataStore.getSpatialNodes().find((item) => item.id === Number(nodeId))
    if (!node || !markerMap.has(Number(nodeId))) {
      ElMessage.warning('未找到该节点对应的空间坐标')
      return
    }

    // 地图定位
    mapInstance.setCenter(node.coords)
    mapInstance.setZoom(14)
    // 高亮Marker
    const marker = markerMap.get(Number(nodeId))
    marker.setAnimation('AMAP_ANIMATION_BOUNCE')
    setTimeout(() => marker.setAnimation(null), 2000)
    showNodeInfo(node)
  }, 100)
}
// 监听路由参数变化（若在地图页面内切换节点，也能重新定位）
watch([() => route.query.nodeId], () => {
  if (mapInstance) locateNodeByRoute()
})

onMounted(async () => {
  await initMap()
  unwatchData = dataStore.watchSpatialData((spatialNodes) => {
    renderSpatialNodes(spatialNodes)
    // 数据更新后，重新定位当前路由对应的节点
    locateNodeByRoute()
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
  height: calc(100vh - 60px); /* 占满页面高度 */
  border: 1px solid #eee;
}
</style>

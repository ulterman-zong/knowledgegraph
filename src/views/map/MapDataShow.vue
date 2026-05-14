<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useDataStore } from '@/stores/modules/DataStore'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import markerIcon from '@/assets/屏幕截图 2026-01-06 155443.png'

const AMAP_CONFIG = {
  jsKey: import.meta.env.VITE_AMAP_JS_KEY?.trim() || '',
  jsApiVersion: '2.0',
  plugins: ['AMap.Marker', 'AMap.InfoWindow', 'AMap.Polyline', 'AMap.Polygon', 'AMap.CircleMarker']
}

const mapRef = ref(null)
let mapInstance = null
let infoWindow = null
const markerMap = new Map()
const overlayMap = new Map()
const dataStore = useDataStore()
const route = useRoute()
let unwatchData = null

const loadAmapJsApi = () => {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      console.log('当前高德API版本：', window.AMap.version)
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
    locateNodeByRoute()
  } catch (err) {
    console.error('地图初始化失败：', err)
  }
}

const renderSpatialNodes = (spatialNodes) => {
  if (!mapInstance) return

  markerMap.forEach((marker) => mapInstance.remove(marker))
  markerMap.clear()
  overlayMap.forEach((overlays) => {
    overlays.forEach((overlay) => mapInstance.remove(overlay))
  })
  overlayMap.clear()

  const AMap = window.AMap
  const validNodes = spatialNodes.filter((node) => {
    return node.info?.pointType !== 'Class'
  })

  validNodes.forEach((node) => {
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

    const geometryType = node.info?.geometryType
    const geometry = node.info?.geometry

    if (geometryType && geometry) {
      if (geometryType === 'Point' || geometryType === 'MultiPoint') {
        renderPointData(node, AMap)
      } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
        renderLineData(node, AMap, geometry)
      } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
        renderPolygonData(node, AMap, geometry)
      }
    } else {
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
    }
  })
}

const renderPointData = (node, AMap) => {
  const marker = new AMap.CircleMarker({
    center: new AMap.LngLat(node.coords[0], node.coords[1]),
    radius: 8,
    fillColor: node.color || '#1890ff',
    fillOpacity: 0.8,
    strokeColor: node.color || '#1890ff',
    strokeWeight: 2,
    strokeOpacity: 1,
    map: mapInstance
  })
  marker.on('click', () => showNodeInfo(node))
  markerMap.set(node.id, marker)
}

const renderLineData = (node, AMap, geometry) => {
  const overlays = []

  const processLine = (coords) => {
    const path = coords.map((c) => new AMap.LngLat(c[0], c[1]))
    const polyline = new AMap.Polyline({
      path: path,
      strokeColor: node.color || '#52c41a',
      strokeWeight: 3,
      strokeOpacity: 1,
      map: mapInstance
    })
    polyline.on('click', () => showNodeInfo(node))
    overlays.push(polyline)
  }

  if (geometry.type === 'LineString') {
    processLine(geometry.coordinates)
  } else if (geometry.type === 'MultiLineString') {
    geometry.coordinates.forEach((lineCoords) => processLine(lineCoords))
  }

  overlayMap.set(node.id, overlays)
}

const renderPolygonData = (node, AMap, geometry) => {
  const overlays = []

  const processPolygon = (rings) => {
    const paths = rings.map((ring) => ring.map((c) => new AMap.LngLat(c[0], c[1])))
    const polygon = new AMap.Polygon({
      path: paths,
      fillColor: node.color || '#1890ff',
      fillOpacity: 0.3,
      strokeColor: node.color || '#1890ff',
      strokeWeight: 2,
      strokeOpacity: 1,
      map: mapInstance
    })
    polygon.on('click', () => showNodeInfo(node))
    overlays.push(polygon)
  }

  if (geometry.type === 'Polygon') {
    processPolygon(geometry.coordinates)
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((polygonRings) => processPolygon(polygonRings))
  }

  overlayMap.set(node.id, overlays)
}

const showNodeInfo = (node) => {
  const geometryType = node.info?.geometryType || 'Point'
  const properties = node.info?.geoserverProperties || {}

  let propHtml = ''
  if (Object.keys(properties).length > 0) {
    propHtml = Object.entries(properties)
      .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
      .join('')
  }

  const infoContent = `
    <div style="padding: 10px; min-width: 200px;">
      <h4 style="margin: 0 0 8px 0; color: ${node.color};">${node.name}</h4>
      <div style="font-size: 12px; color: #666;">
        <p>类型：${node.info.type}</p>
        <p>几何类型：${geometryType}</p>
        <p>坐标：${node.coords.join(', ')}</p>
        <p>高程：${node.info.z}m</p>
        ${node.info.parentId ? `<p>父节点ID：${node.info.parentId}</p>` : ''}
        ${propHtml}
      </div>
    </div>
  `
  infoWindow.setContent(infoContent)
  infoWindow.open(mapInstance, node.coords)
}

const locateNodeByRoute = () => {
  const nodeId = route.query.nodeId
  if (!nodeId || !mapInstance) return

  setTimeout(() => {
    const spatialNodes = dataStore.getSpatialNodes()
    const node = spatialNodes.find((item) => item.id === Number(nodeId))

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

    const targetCoords = new window.AMap.LngLat(node.coords[0], node.coords[1])
    mapInstance.setCenter(targetCoords)
    mapInstance.setZoom(14)
    mapInstance.setFitView([markerMap.get(Number(nodeId))], {
      padding: [50, 50, 50, 50],
      zoomFixed: 14
    })

    const marker = markerMap.get(Number(nodeId))
    if (marker && typeof marker.setAnimation === 'function') {
      marker.setAnimation(window.AMap?.AMAP_ANIMATION_BOUNCE || 'AMAP_ANIMATION_BOUNCE')
      setTimeout(() => marker.setAnimation(null), 2000)
    } else if (marker) {
      console.warn('动画方法缺失，跳过动画，但定位已生效')
    }

    showNodeInfo(node)
  }, 800)
}

watch([() => route.query.nodeId], () => {
  if (mapInstance) locateNodeByRoute()
})

onMounted(async () => {
  await initMap()
  unwatchData = dataStore.watchSpatialData((spatialNodes) => {
    renderSpatialNodes(spatialNodes)
    locateNodeByRoute()
  })
})

onUnmounted(() => {
  if (mapInstance) mapInstance.destroy()
  if (unwatchData) unwatchData()
  markerMap.clear()
  overlayMap.clear()
  infoWindow = null
})
</script>

<template>
  <div class="map-wrapper">
    <div class="map-container" ref="mapRef"></div>
  </div>
</template>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: calc(100vh - 60px);
}

.map-container {
  width: 100%;
  height: 100%;
  border: 1px solid #eee;
}
</style>

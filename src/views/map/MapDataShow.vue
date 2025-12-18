<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const mapRef = ref(null)
let mapInstance = null

// 动态加载高德API脚本
const loadAmapApi = () => {
  return new Promise((resolve, reject) => {
    // 避免重复加载
    if (window.AMap) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://webapi.amap.com/maps?v=2.0&key=49ef749446dce0a7c3211defb673d150'
    script.type = 'text/javascript'
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// 初始化地图
const initAmap = async () => {
  try {
    await loadAmapApi() // 先加载API，再初始化
    mapInstance = new window.AMap.Map(mapRef.value, {
      zoom: 12,
      center: [116.397428, 39.90923]
    })
  } catch (err) {
    console.error('高德API加载失败：', err)
  }
}

onMounted(() => {
  if (mapRef.value) initAmap()
})

onUnmounted(() => {
  // 彻底销毁地图实例，释放内存
  if (mapInstance) {
    mapInstance.destroy()
    mapInstance = null
  }
  // 可选：移除动态引入的脚本（避免残留）
  const amapScript = document.querySelector('script[src*="webapi.amap.com/maps"]')
  if (amapScript) amapScript.remove()
})
</script>

<template>
  <div class="map-container" ref="mapRef"></div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 550px;
}
</style>

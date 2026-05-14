import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useGeoServerStore = defineStore('GeoServer', () => {
  const defaultServers = [
    {
      id: 'default',
      name: '本地GeoServer',
      url: import.meta.env.VITE_GEOSERVER_URL || 'http://localhost:8080/geoserver/wfs',
      workspace: import.meta.env.VITE_GEOSERVER_WORKSPACE || 'knowledgegraph',
      description: '默认本地GeoServer服务器',
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ]

  const servers = ref([])
  const currentServerId = ref(null)

  const initServers = () => {
    const savedServers = localStorage.getItem('geoserver_servers')
    if (savedServers) {
      servers.value = JSON.parse(savedServers)
      const activeServer = servers.value.find((s) => s.isActive)
      currentServerId.value = activeServer ? activeServer.id : servers.value[0]?.id
    } else {
      servers.value = defaultServers
      currentServerId.value = 'default'
      syncToLocal()
    }
  }

  const syncToLocal = () => {
    localStorage.setItem('geoserver_servers', JSON.stringify(servers.value))
  }

  const currentServer = computed(() => {
    return servers.value.find((s) => s.id === currentServerId.value) || servers.value[0]
  })

  const addServer = (serverConfig) => {
    const newServer = {
      id: `server_${Date.now()}`,
      name: serverConfig.name,
      url: serverConfig.url,
      workspace: serverConfig.workspace || '',
      description: serverConfig.description || '',
      isActive: false,
      createdAt: new Date().toISOString()
    }
    servers.value.push(newServer)
    syncToLocal()
    return newServer
  }

  const updateServer = (id, updates) => {
    const index = servers.value.findIndex((s) => s.id === id)
    if (index !== -1) {
      servers.value[index] = { ...servers.value[index], ...updates }
      syncToLocal()
    }
  }

  const deleteServer = (id) => {
    if (id === 'default') {
      throw new Error('不能删除默认服务器')
    }
    const index = servers.value.findIndex((s) => s.id === id)
    if (index !== -1) {
      servers.value.splice(index, 1)
      if (currentServerId.value === id) {
        currentServerId.value = servers.value[0]?.id || null
      }
      syncToLocal()
    }
  }

  const switchServer = (id) => {
    const server = servers.value.find((s) => s.id === id)
    if (server) {
      servers.value.forEach((s) => (s.isActive = false))
      server.isActive = true
      currentServerId.value = id
      syncToLocal()
    }
  }

  const testConnection = async (serverConfig) => {
    try {
      const params = {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetCapabilities'
      }

      const url = new URL(serverConfig.url)
      Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]))

      const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status}`)
      }

      const text = await response.text()

      if (text.includes('WFS_Capabilities') || text.includes('ows:Capabilities')) {
        return { success: true, message: '连接成功' }
      } else {
        return { success: false, message: '响应格式不正确，请检查是否为WFS服务' }
      }
    } catch (error) {
      console.error('连接测试失败:', error)
      return {
        success: false,
        message: error.message.includes('Failed to fetch')
          ? '无法连接到服务器，请检查地址或网络连接'
          : error.message
      }
    }
  }

  const getServerById = (id) => {
    return servers.value.find((s) => s.id === id)
  }

  const getAllServers = () => {
    return servers.value
  }

  initServers()

  return {
    servers,
    currentServer,
    currentServerId,
    addServer,
    updateServer,
    deleteServer,
    switchServer,
    testConnection,
    getServerById,
    getAllServers
  }
})

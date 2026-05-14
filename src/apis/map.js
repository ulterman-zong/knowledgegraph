// src/apis/map.js
import request from '@/utils/gaode.js'
import axios from 'axios'

const DEFAULT_GEOSERVER_URL =
  import.meta.env.VITE_GEOSERVER_URL || 'http://localhost:8080/geoserver/wfs'
const DEFAULT_WORKSPACE = import.meta.env.VITE_GEOSERVER_WORKSPACE || 'knowledgegraph'

const createGeoServerAxios = (baseURL) => {
  return axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    },
    params: {
      service: 'WFS',
      version: '1.1.0'
    }
  })
}

export const searchAmapPoiAPI = (params) => {
  const queryStr = new URLSearchParams(params).toString()
  const url = `/place/text?${queryStr}`
  console.log('修正后的请求URL：', url)
  return request.get(url)
}

export const getAmapGeocodeAPI = (params) => {
  return request.get(`/geocode/geo`, {
    params
  })
}

export const fetchGeoServerDataAPI = (params, serverUrl) => {
  const url = serverUrl || DEFAULT_GEOSERVER_URL
  if (!url) {
    return Promise.reject(new Error('未配置GeoServer地址'))
  }
  return request.get(url, {
    params
  })
}

// 在map.js文件末尾添加以下函数

/**
 * 获取WFS服务能力文档
 * @param {Object} serverConfig - 服务器配置 {url, workspace}
 * @returns {Promise}
 */
export const getWFSCapabilities = async (serverConfig = null) => {
  const serverUrl = serverConfig?.url || DEFAULT_GEOSERVER_URL
  const geoserverAxios = createGeoServerAxios(serverUrl)

  const params = {
    request: 'GetCapabilities'
  }

  try {
    const response = await geoserverAxios.get('', { params })
    return response
  } catch (error) {
    console.error('获取WFS能力文档失败:', error)
    throw error
  }
}

/**
 * 从GetCapabilities XML响应中提取FeatureType列表
 * @param {string} xmlString - GetCapabilities返回的XML字符串
 * @param {string} workspace - 工作区名称（可选，用于过滤）
 * @returns {Array} 图层列表
 */
export const extractFeatureTypesFromCapabilities = (xmlString, workspace = null) => {
  const featureTypes = []

  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml')

    const featureTypeNodes = xmlDoc.querySelectorAll('FeatureType')

    featureTypeNodes.forEach((node) => {
      const nameNode = node.querySelector('Name')
      const titleNode = node.querySelector('Title')

      if (!nameNode) return

      const name = nameNode.textContent
      const title = titleNode ? titleNode.textContent : name
      const nameParts = name.split(':')

      if (workspace) {
        if (nameParts.length === 2 && nameParts[0] === workspace) {
          featureTypes.push({
            name: nameParts[1],
            title: title || nameParts[1],
            typeName: name,
            namespace: nameParts[0]
          })
        }
      } else {
        featureTypes.push({
          name: nameParts.length === 2 ? nameParts[1] : name,
          title: title || name,
          typeName: name,
          namespace: nameParts.length === 2 ? nameParts[0] : null
        })
      }
    })
  } catch (error) {
    console.error('解析FeatureType列表失败:', error)
  }

  return featureTypes
}

/**
 * 获取FeatureType描述
 * @param {Object} options - {workspace, serverConfig}
 * @returns {Promise}
 */
export const getWFSFeatureTypes = async (options = {}) => {
  const { workspace, serverConfig } = options
  const serverUrl = serverConfig?.url || DEFAULT_GEOSERVER_URL
  const serverWorkspace = workspace || serverConfig?.workspace || DEFAULT_WORKSPACE
  const geoserverAxios = createGeoServerAxios(serverUrl)

  try {
    const params = {
      request: 'GetCapabilities'
    }

    const response = await geoserverAxios.get('', {
      params,
      responseType: 'text'
    })
    const featureTypes = extractFeatureTypesFromCapabilities(response.data, serverWorkspace)
    return { featureTypes }
  } catch (error) {
    console.error('获取FeatureType描述失败:', error)
    throw error
  }
}

/**
 * 获取WFS要素数据
 * @param {Object} options - {typeName, maxFeatures, outputFormat, bbox, cql_filter, sortBy, propertyName, serverConfig}
 * @returns {Promise}
 */
export const getWFSFeatures = async (options = {}) => {
  const {
    typeName,
    maxFeatures = 1000,
    outputFormat = 'application/json',
    bbox,
    cql_filter,
    sortBy,
    propertyName,
    serverConfig
  } = options

  if (!typeName) {
    throw new Error('typeName参数必填')
  }

  const serverUrl = serverConfig?.url || DEFAULT_GEOSERVER_URL
  const geoserverAxios = createGeoServerAxios(serverUrl)

  const params = {
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName,
    outputFormat,
    maxFeatures,
    srsName: 'EPSG:4326'
  }

  if (bbox) {
    params.bbox = bbox.join(',') + ',EPSG:4326'
  }

  if (cql_filter) {
    params.cql_filter = cql_filter
  }

  if (sortBy) {
    params.sortBy = sortBy
  }

  if (propertyName) {
    params.propertyName = propertyName
  }

  try {
    const response = await geoserverAxios.get('', { params })

    if (outputFormat === 'application/json') {
      return response.data
    }

    return response.data
  } catch (error) {
    console.error('获取WFS要素失败:', error)
    throw error
  }
}

/**
 * 获取要素数量
 * @param {String} typeName - 图层名称
 * @param {String} cql_filter - CQL过滤条件
 * @param {Object} serverConfig - 服务器配置
 * @returns {Promise}
 */
export const getWFSFeatureCount = async (typeName, cql_filter, serverConfig = null) => {
  const serverUrl = serverConfig?.url || DEFAULT_GEOSERVER_URL
  const geoserverAxios = createGeoServerAxios(serverUrl)

  const params = {
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName,
    resultType: 'hits',
    outputFormat: 'application/json'
  }

  if (cql_filter) {
    params.cql_filter = cql_filter
  }

  try {
    const response = await geoserverAxios.get('', { params })
    return response.data
  } catch (error) {
    console.error('获取要素数量失败:', error)
    throw error
  }
}

/**
 * 获取图层详细信息
 * @param {String} typeName - 图层名称
 * @param {Object} serverConfig - 服务器配置
 * @returns {Promise}
 */
export const getWFSLayerInfo = async (typeName, serverConfig = null) => {
  try {
    const workspace = typeName.split(':')[0]
    const [featureType, sampleData] = await Promise.all([
      getWFSFeatureTypes({ workspace, serverConfig }),
      getWFSFeatures({ typeName, maxFeatures: 1, serverConfig })
    ])

    return {
      featureType,
      sampleData,
      geometryType: sampleData?.features?.[0]?.geometry?.type || 'Unknown'
    }
  } catch (error) {
    console.error('获取图层信息失败:', error)
    throw error
  }
}

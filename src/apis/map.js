// src/apis/map.js
import request from '@/utils/gaode.js' // 导入你封装的axios实例

// GeoServer地址（从环境变量读取）
const GEOSERVER_BASE_URL = import.meta.env.VITE_GEOSERVER_URL

/**
 * 高德POI搜索接口
 * @param {Object} params - 请求参数（keywords/city等）
 * @returns {Promise} 请求Promise
 */

// src/apis/map.js
export const searchAmapPoiAPI = (params) => {
  const queryStr = new URLSearchParams(params).toString()
  const url = `/place/text?${queryStr}`
  console.log('修正后的请求URL：', url)
  return request.get(url) // 直接传URL，不通过params参数
}
/**
 * 高德地理编码接口（地址转坐标）
 * @param {Object} params - 请求参数（address/city等）
 * @returns {Promise} 请求Promise
 */
export const getAmapGeocodeAPI = (params) => {
  return request.get(`/geocode/geo`, {
    params
  })
}

/**
 * GeoServer WFS空间数据请求接口
 * @param {Object} params - 请求参数（typeName/outputFormat等）
 * @returns {Promise} 请求Promise
 */
export const fetchGeoServerDataAPI = (params) => {
  if (!GEOSERVER_BASE_URL) {
    return Promise.reject(new Error('未配置GeoServer地址'))
  }
  return request.get(GEOSERVER_BASE_URL, {
    params
  })
}

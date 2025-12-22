// src/utils/gaode.js
import axios from 'axios'

/**
 * 高德API专属axios实例配置
 * 仅负责：创建axios实例 + 响应拦截器（无任何地图相关逻辑）
 */

// 高德API基础配置（可抽离到.env）
const AMAP_AXIOS_CONFIG = {
  baseURL: 'https://restapi.amap.com/v3',
  timeout: 10000
}
// 创建高德API专属axios实例
const amapAxiosInstance = axios.create(AMAP_AXIOS_CONFIG)

/**
 * 响应拦截器：统一处理高德API响应
 * 高德开放平台响应格式：{status: '1', info: 'OK', infocode: '10000', ...}
 */
amapAxiosInstance.interceptors.response.use(
  (response) => {
    const res = response.data
    // 高德API成功状态：status=1
    if (res.status === '1') {
      return res // 直接返回核心数据
    }
    // 非成功状态：抛出错误
    const errorMsg = `高德API请求失败：${res.info}（错误码：${res.infocode}）`
    console.error(errorMsg)
    return Promise.reject(new Error(errorMsg))
  },
  (error) => {
    // 网络/超时错误处理
    let errorMsg = '高德API请求异常'
    if (error.code === 'ECONNABORTED') {
      errorMsg = '高德API请求超时，请检查网络'
    } else if (error.response) {
      errorMsg = `高德API请求失败（${error.response.status}）：${error.response.statusText}`
    }
    console.error(errorMsg, error)
    return Promise.reject(new Error(errorMsg))
  }
)

// 导出axios实例（供map.js使用）
export default amapAxiosInstance

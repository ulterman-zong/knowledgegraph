import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useDataStore = defineStore('Data', () => {
  // 初始化数据：优先从localStorage读取，无则用默认模拟数据
  const initData = () => {
    const localData = localStorage.getItem('dataList')
    if (localData) {
      return JSON.parse(localData)
    } else {
      // 扩展默认数据：补充 color（节点颜色）、parent_id（关联父节点ID）
      return [
        {
          Data_id: 100001,
          Data_name: 'Node 1',
          Data_type: '类型A',
          // 大地坐标（业务数据，不参与ECharts布局）
          x_Coordinates: 120.123456,
          y_Coordinates: 30.654321,
          z_Coordinates: 30,
          // ECharts画布坐标（随机生成，仅用于可视化）
          echart_x: Math.random() * 800 + 100,
          echart_y: Math.random() * 500 + 100,
          color: '#6699cc',
          parent_id: ''
        },
        {
          Data_id: 100002,
          Data_name: 'Node 2',
          Data_type: '类型B',
          x_Coordinates: 120.234567, // 大地坐标
          y_Coordinates: 30.765432,
          z_Coordinates: 35,
          echart_x: Math.random() * 800 + 100, // ECharts画布坐标
          echart_y: Math.random() * 500 + 100,
          color: '#66cc99',
          parent_id: 100001
        }
      ]
    }
  }
  // 空间数据列表（初始化）
  const DataList = ref(initData())
  //连线数据
  const initLinks = () => {
    const localLinks = localStorage.getItem('linkList')
    if (localLinks) return JSON.parse(localLinks)
    return [] // 初始无连线
  }
  const linkList = ref(initLinks())

  // 辅助方法：将数据同步到localStorage（持久化）
  const syncToLocal = () => {
    localStorage.setItem('dataList', JSON.stringify(DataList.value))
    localStorage.setItem('linkList', JSON.stringify(linkList.value))
  }

  // 1. 整体替换数据（模拟后端请求后的赋值）
  const setDataList = (data) => {
    DataList.value = data
    syncToLocal() // 同步到本地存储
  }

  // 2. 新增数据
  const addData = (data) => {
    DataList.value.push(data)
    syncToLocal() // 同步到本地存储
  }

  // 3. 更新数据（按Data_id）
  const updateData = (id, newData) => {
    const index = DataList.value.findIndex((item) => item.Data_id === id)
    if (index !== -1) {
      DataList.value[index] = { ...DataList.value[index], ...newData }
      syncToLocal() // 同步到本地存储
    }
  }

  // 4. 删除数据（按Data_id）
  const deleteData = (id) => {
    DataList.value = DataList.value.filter((item) => item.Data_id !== id)
    linkList.value = linkList.value.filter((link) => link.sourceId !== id && link.targetId !== id)
    syncToLocal() // 同步到本地存储
  }

  // 5. 模拟“查询”数据（无后端时前端过滤）
  const queryData = (params) => {
    let result = [...DataList.value]
    // 按Data_id过滤（若params有Data_id）
    if (params.Data_id) {
      result = result.filter((item) => item.Data_id.toString().includes(params.Data_id.toString()))
    }
    // 按state过滤（若params有state，需数据中包含state字段）
    if (params.state) {
      result = result.filter((item) => item.state === params.state)
    }
    return result
  }
  //连线操作方法
  //添加连线
  const addLink = (link) => {
    // 避免重复连线（源+目标相同视为重复）
    const isDuplicate = linkList.value.some(
      (l) =>
        (l.sourceId === link.sourceId && l.targetId === link.targetId) ||
        (l.sourceId === link.targetId && l.targetId === link.sourceId)
    )
    if (isDuplicate) return false // 重复则返回false
    linkList.value.push({
      linkId: Date.now(), // 生成唯一连线ID
      ...link
    })
    syncToLocal()
    return true
  }
  //修改连线
  const updateLink = (linkId, newData) => {
    const index = linkList.value.findIndex((link) => link.linkId === linkId)
    if (index !== -1) {
      linkList.value[index] = { ...linkList.value[index], ...newData }
      syncToLocal() // 同步到本地存储
    }
  }
  //删除连线
  const deleteLink = (linkId) => {
    linkList.value = linkList.value.filter((link) => link.linkId !== linkId)
    syncToLocal()
  }

  const getLinks = () => {
    return linkList.value
      .map((link) => {
        const sourceNode = DataList.value.find((item) => item.Data_id === link.sourceId)
        const targetNode = DataList.value.find((item) => item.Data_id === link.targetId)
        return {
          source: sourceNode?.Data_name || '', // ECharts用名称匹配节点
          target: targetNode?.Data_name || '',
          label: { show: true, formatter: link.label || '关联' }, // 连线标签
          lineStyle: { curveness: link.curveness || 0.2, width: 2 }
        }
      })
      .filter((link) => link.source && link.target) // 过滤无效连线
  }
  //地图联动相关方法
  const getSpatialNodes = () => {
    return DataList.value
      .filter((item) => {
        return (
          item.x_Coordinates &&
          !isNaN(item.x_Coordinates) &&
          item.y_Coordinates &&
          !isNaN(item.y_Coordinates)
        )
      })
      .map((item) => {
        //转为地图组件所需格式
        return {
          id: item.Data_id,
          name: item.Data_name, // 节点名称
          coords: [item.x_Coordinates, item.y_Coordinates], // 高德坐标[经度, 纬度]
          info: {
            // 弹窗展示的信息（可扩展）
            type: item.Data_type,
            z: item.z_Coordinates,
            parentId: item.parent_id
          },
          color: item.color // 节点颜色（同步知识图谱）
        }
      })
  }
  //监听数据变化的回调
  const watchSpatialData = (callback) => {
    //监听DataLis变化，触发回调
    const unwatch = watch(
      () => DataList.value,
      () => {
        callback(getSpatialNodes()) // 传递最新的空间节点数据
      },
      { deep: true, immediate: true } // 深度监听 + 立即执行一次
    )
    return unwatch // 返回取消监听的方法
  }
  //反向更新节点坐标
  const updateNodeCoords = (dataId, lng, lat) => {
    updateData(dataId, {
      x_Coordinates: lng,
      y_Coordinates: lat
    })
  }
  return {
    DataList,
    linkList,
    setDataList,
    addData,
    updateData,
    deleteData,
    queryData,
    addLink,
    deleteLink,
    getLinks,
    updateLink,
    getSpatialNodes,
    watchSpatialData,
    updateNodeCoords
  }
})

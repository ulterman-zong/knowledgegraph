<script setup>
import * as echarts from 'echarts'
import { useDataStore } from '@/stores/modules/DataStore'
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import DataEdit from '@/components/DataEdit.vue'
import LinkEdit from '@/components/LinkEdit.vue'
import { useRouter } from 'vue-router'
const router = useRouter()

//1.初始化DataStore数据
const dataStore = useDataStore()
const { DataList, linkList } = storeToRefs(dataStore) //监听DataList变化
const { addData, updateData, deleteData, addLink, deleteLink, getLinks, updateLink } = dataStore
//绑定组件实例
const dataEditRef = ref(null)
// 2. 新增：绑定 LinkEdit 组件实例
const linkEditRef = ref(null)

//连线模式状态
const linkMode = ref(false) // 是否进入连线选择模式
const firstSelectedNode = ref(null) // 第一个选中的节点（连线起点）
const selectedLink = ref(null) // 记录选中的连线（Store中的原始数据

//2.Echarts相关变量
//绑定图元素
const chart = ref()
//定义 图表实例
let myChart = null
//当前选中的节点
const selectedNode = ref(null)

//3.Echarts配置
//定义配置项
const option = ref({
  title: { text: '空间数据知识图谱' },
  tooltip: {
    formatter: (params) => {
      if (params.dataType === 'node') {
        return `
          节点名称：${params.data.name}<br>
          大地坐标：X=${params.data.rawData.x_Coordinates}，Y=${params.data.rawData.y_Coordinates}，Z=${params.data.rawData.z_Coordinates}
        `
      } else if (params.dataType === 'edge') {
        return `连线：${params.data.source} → ${params.data.target}`
      }
      return params.name
    }
  },
  series: [
    {
      type: 'graph',
      layout: 'force',
      force: { repulsion: 500, edgeLength: 200 },
      symbolSize: 15,
      draggable: true,
      roam: true,
      label: { show: true },
      edgeSymbol: ['circle', 'arrow'],
      edgeSymbolSize: [4, 10],
      edgeLabel: { fontSize: 14 },
      data: [],
      links: [],
      lineStyle: { opacity: 0.9, width: 2, curveness: 0 }
    }
  ]
})

//4.将Strore数据转换为Echarts格式
const convertStoreToEcharts = () => {
  // 节点数据
  option.value.series[0].data = DataList.value.map((item) => ({
    name: item.Data_name,
    x: item.echart_x,
    y: item.echart_y,
    itemStyle: { color: item.color || '#6699cc' },
    rawData: item
  }))
  // 连线数据（保留原始连线信息）
  const echartsLinks = getLinks()
  // 给每个连线绑定原始Store数据，方便后续高亮/修改
  option.value.series[0].links = echartsLinks.map((link, index) => ({
    ...link,
    rawLink: linkList.value[index] || null // 关联Store中的原始连线数据
  }))
}

// 5. 高亮方法
// 高亮节点（清空连线高亮）
const highlightNode = (nodeName, color = '#ff0000') => {
  const newOption = JSON.parse(JSON.stringify(option.value))
  // 重置所有连线样式
  newOption.series[0].links.forEach((link) => {
    if (link._isSelected) {
      delete link._isSelected
      link.lineStyle = { opacity: 0.9, width: 2, curveness: link.rawLink?.curveness || 0.2 }
    }
  })
  // 高亮目标节点
  newOption.series[0].data.forEach((node) => {
    if (node._isSelected) {
      delete node._isSelected
      node.itemStyle = { color: node.rawData.color }
    }
    if (node.name === nodeName) {
      node._isSelected = true
      node.itemStyle = { color }
    }
  })
  myChart.setOption(newOption)
  // 清空连线选中状态
  selectedLink.value = null
}
//亮点连线方法
const highlightLink = (linkRawData) => {
  const newOption = JSON.parse(JSON.stringify(option.value))
  // 重置所有节点样式
  newOption.series[0].data.forEach((node) => {
    if (node._isSelected) {
      delete node._isSelected
      node.itemStyle = { color: node.rawData.color }
    }
  })
  // 高亮目标连线（红色、加粗、高透明度）
  newOption.series[0].links.forEach((link) => {
    if (link._isSelected) {
      delete link._isSelected
      link.lineStyle = { opacity: 0.9, width: 2, curveness: link.rawLink?.curveness || 0.2 }
    }
    if (link.rawLink?.linkId === linkRawData.linkId) {
      link._isSelected = true
      link.lineStyle = {
        opacity: 1,
        width: 4,
        curveness: link.rawLink.curveness || 0.2,
        color: '#ff0000' // 选中连线红色高亮
      }
    }
  })
  myChart.setOption(newOption)
  // 记录选中的连线
  selectedLink.value = linkRawData
  // 清空节点选中状态
  selectedNode.value = null
}

//5.初始化图表
const initChart = () => {
  //获取显示图表的dom元素
  const chartDom = chart.value
  if (!chartDom) return
  // 初始化图表实例初始化 ECharts 实例
  myChart = echarts.init(chartDom)
  console.log(myChart)
  //同步Store数据到Echarts
  convertStoreToEcharts()
  myChart.setOption(option.value)
  //绑定点击事件，用于选择节点
  // 点击节点：选中并高亮,区分常规模式和连线模式
  myChart.on('click', (params) => {
    if (params.dataType === 'node') {
      const nodeData = params.data.rawData
      if (linkMode.value) {
        // 连线模式：优先处理连线选择
        // 1. 未选择起点 → 记录起点并高亮
        if (!firstSelectedNode.value) {
          firstSelectedNode.value = nodeData
          ElMessage.info(`已选择起点：${nodeData.Data_name}，请选择终点节点`)
          highlightNode(nodeData.Data_name, '#00ff00') // 绿色高亮起点
        }
        // 2. 已选择起点 → 选择终点并调用 LinkEdit 新增弹窗（替换原 MessageBox）
        else {
          if (firstSelectedNode.value.Data_id === nodeData.Data_id) {
            ElMessage.warning('不能选择同一个节点作为起点和终点！')
            return
          }
          // 关键修改：打开 LinkEdit 新增弹窗，传入起点/终点ID
          linkEditRef.value.open({
            isEdit: false,
            sourceId: firstSelectedNode.value.Data_id,
            targetId: nodeData.Data_id
          })
          exitLinkMode() // 退出连线模式
        }
        return // 连线模式下，不再执行后续常规节点选中逻辑
      }

      // 常规模式：选中节点（原有逻辑）
      selectedNode.value = nodeData
      highlightNode(nodeData.Data_name)
    } else if (params.dataType === 'edge') {
      // 点击连线高亮（原有逻辑）
      const linkRawData = params.data.rawLink
      if (!linkRawData) return
      highlightLink(linkRawData)
      ElMessage.info('已选中连线，可点击「修改连线」或「删除连线」按钮操作')
    }

    // 退出连线模式（非连线模式的点击，或连线模式处理完后退出）
    if (linkMode.value) exitLinkMode()
  })

  // 拖拽结束同步echarts的坐标到Store中
  myChart.on('dragend', (params) => {
    if (params.dataType === 'node' && selectedNode.value) {
      updateData(selectedNode.value.Data_id, {
        echart_x: params.data.x, // 仅更新画布坐标
        echart_y: params.data.y
      })
    }
  })
  // 初始化图表时的dblclick事件
  myChart.on('dblclick', (params) => {
    if (params.dataType !== 'node') return
    const nodeData = params.data.rawData
    // 路由跳转到地图页面，并携带节点Data_id作为参数
    router.push({
      path: '/map/mapdatashow',
      query: { nodeId: nodeData.Data_id } // 传递节点ID
    })
  })
}

// 进入连线模式
const enterLinkMode = () => {
  linkMode.value = true
  firstSelectedNode.value = null
  selectedNode.value = null
  selectedLink.value = null // 清空连线选中
  ElMessage.info('请先选择起点节点，再选择终点节点')
  // 重置所有高亮
  const newOption = JSON.parse(JSON.stringify(option.value))
  newOption.series[0].data.forEach((node) => {
    if (node._isSelected) {
      delete node._isSelected
      node.itemStyle = { color: node.rawData.color }
    }
  })
  newOption.series[0].links.forEach((link) => {
    if (link._isSelected) {
      delete link._isSelected
      link.lineStyle = { opacity: 0.9, width: 2, curveness: link.rawLink?.curveness || 0.2 }
    }
  })
  myChart.setOption(newOption)
}

// 退出连线模式
const exitLinkMode = () => {
  linkMode.value = false
  firstSelectedNode.value = null
  // 恢复节点默认颜色
  const newOption = JSON.parse(JSON.stringify(option.value))
  newOption.series[0].data.forEach((node) => {
    node.itemStyle = { color: node.rawData.color }
  })
  myChart.setOption(newOption)
}

//操作逻辑
//增加节点
const handAddNode = () => {
  dataEditRef.value.open({ isEdit: false }) //打开新增数据表单
}

//修改节点
const handleModifyNode = () => {
  if (!selectedNode.value) {
    ElMessage.error('请选择需要修改的节点')
    return
  }
  //打开编辑表单
  dataEditRef.value.open({ isEdit: true, data: { ...selectedNode.value } })
}

//删除节点
const handleDeleteNode = () => {
  if (!selectedNode.value) {
    ElMessage.error('请先选择要删除的节点！')
    return
  }
  ElMessageBox.confirm('确定删除该节点及关联连线吗？', '删除节点', {
    type: 'warning'
  })
    .then(() => {
      deleteData(selectedNode.value.Data_id)
      selectedNode.value = null
      selectedLink.value = null // 清空连线选中
      ElMessage.success('节点删除成功！')
    })
    .catch(() => {
      ElMessage.info('取消删除节点')
    })
}

// 3. 关键修改：修改连线逻辑（替换原 MessageBox 为 LinkEdit 弹窗）
const handleModifyLink = () => {
  if (!selectedLink.value) {
    ElMessage.error('请先选中要修改的连线！')
    return
  }
  // 打开 LinkEdit 编辑弹窗，传入选中的连线数据
  linkEditRef.value.open({
    isEdit: true,
    data: selectedLink.value
  })
}

// 删除选中的连线（原有逻辑不变）
const handleDeleteLink = () => {
  if (!selectedLink.value) {
    ElMessage.error('请先选中要删除的连线！')
    return
  }

  ElMessageBox.confirm('确定删除该连线吗？', '删除连线', {
    type: 'warning'
  })
    .then(() => {
      deleteLink(selectedLink.value.linkId)
      selectedLink.value = null // 清空选中状态
      ElMessage.success('连线删除成功！')
    })
    .catch(() => {
      ElMessage.info('取消删除连线')
    })
}

// 处理LinkEdit提交事件
const handleSubLink = (subData) => {
  if (subData.isEdit) {
    // 编辑连线逻辑...
    updateLink(subData.linkId, {
      label: subData.label,
      curveness: subData.curveness
    })
    highlightLink({ ...selectedLink.value, label: subData.label, curveness: subData.curveness })
    ElMessage.success('连线修改成功！')
  } else {
    // 新增连线
    const success = addLink({
      sourceId: subData.sourceId,
      targetId: subData.targetId,
      label: subData.label,
      curveness: subData.curveness
    })
    if (success) {
      ElMessage.success('成功创建连线')
    } else {
      ElMessage.warning('连线已存在，无需重复创建！')
    }
    firstSelectedNode.value = null
    exitLinkMode()
  }

  // ========== 新增：强制关闭LinkEdit弹窗（兜底） ==========
  if (linkEditRef.value) {
    // 若组件有暴露close方法，直接调用；若无，强制修改dialogVisible
    linkEditRef.value.dialogVisible = false
    // 兼容不同写法：如果组件用defineExpose暴露了close方法，可调用
    // linkEditRef.value.close?.()
  }
}

//6.监听DataEdit的subdata事件，处理新增/修改逻辑
const handleSubData = (subData) => {
  const { isEdit, Data_id, Data_name, Data_type, x_Coordinates, y_Coordinates, z_Coordinates } =
    subData

  if (!isEdit) {
    const newId = Date.now()
    const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16)
    const randomEchartX = Math.random() * 800 + 100
    const randomEchartY = Math.random() * 500 + 100

    // 修复：默认填充真实经纬度（示例用北京坐标，可替换为业务需要的默认值）
    const defaultLng = 116.403874 // 北京经度
    const defaultLat = 39.914888 // 北京纬度

    addData({
      Data_id: newId,
      Data_name,
      Data_type,
      // 有传坐标用传的值，否则用默认真实坐标
      x_Coordinates: x_Coordinates || defaultLng,
      y_Coordinates: y_Coordinates || defaultLat,
      z_Coordinates: z_Coordinates || 0,
      echart_x: randomEchartX,
      echart_y: randomEchartY,
      color: randomColor
    })
  } else {
    updateData(Data_id, {
      Data_name,
      Data_type,
      x_Coordinates,
      y_Coordinates,
      z_Coordinates
    })
  }
}
//监听Store变化，自动更新Echarts
watch(
  [DataList, linkList],
  () => {
    convertStoreToEcharts()
    if (myChart) {
      myChart.setOption(option.value)
    }
  },
  { deep: true }
)

//处理窗口大小变化
const handleResize = () => {
  if (myChart) {
    myChart.resize()
  }
}

onMounted(() => {
  initChart()
  // 监听窗口大小变化，使图表自适应
  window.addEventListener('resize', handleResize)
})

// 组件卸载前销毁图表实例，释放资源
onUnmounted(() => {
  if (myChart) {
    myChart.dispose()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div style="margin-bottom: 10px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap">
    <!-- 节点操作按钮 -->
    <el-button type="primary" @click="handAddNode">增加节点</el-button>
    <el-button type="warning" @click="handleModifyNode" :disabled="!selectedNode"
      >修改节点</el-button
    >
    <el-button type="danger" @click="handleDeleteNode" :disabled="!selectedNode"
      >删除节点</el-button
    >

    <!-- 连线模式按钮 -->
    <el-button
      type="info"
      :icon="linkMode ? 'el-icon-close' : 'el-icon-link'"
      @click="linkMode ? exitLinkMode() : enterLinkMode()"
      :style="{ background: linkMode ? '#f56c6c' : '' }"
    >
      {{ linkMode ? '取消连线' : '连接节点' }}
    </el-button>

    <!-- 新增：连线操作按钮（仅选中连线时可用） -->
    <el-button
      type="warning"
      icon="el-icon-edit"
      @click="handleModifyLink"
      :disabled="!selectedLink"
    >
      修改连线
    </el-button>
    <el-button
      type="danger"
      icon="el-icon-delete"
      @click="handleDeleteLink"
      :disabled="!selectedLink"
    >
      删除连线
    </el-button>
  </div>

  <!-- ECharts容器 -->
  <div ref="chart" class="chart"></div>

  <!-- 组件引入 -->
  <DataEdit ref="dataEditRef" @subdata="handleSubData" />
  <!-- 5. 新增：引入 LinkEdit 组件并绑定事件 -->
  <LinkEdit ref="linkEditRef" @subLink="handleSubLink" />
</template>

<style scoped>
.chart {
  width: 100%;
  height: 500px;
  border: 1px solid #eee;
  border-radius: 4px;
}

/* 可选：优化按钮样式 */
:deep(.el-button) {
  padding: 8px 16px;
}
</style>

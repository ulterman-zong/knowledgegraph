<template>
  <div class="graph-container">
    <!-- ECharts 图表容器 -->
    <div ref="chartRef" class="chart"></div>

    <!-- 操作面板 -->
    <div class="controls">
      <div class="input-group">
        <input v-model="nodeName" placeholder="输入节点名称" @keyup.enter="handleAddNode" />
        <button @click="handleAddNode">添加节点</button>
      </div>

      <div class="action-buttons">
        <button @click="handleModifyNode" :disabled="!selectedNode">修改选中节点</button>
        <button @click="handleDeleteNode" :disabled="!selectedNode" class="danger">
          删除选中节点
        </button>
      </div>
    </div>
  </div>
  <el-button plain @click="open">Click to open Message Box</el-button>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'

const open = () => {
  ElMessageBox.prompt('请输入数据名称', '增加', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: [/^[\u4e00-\u9fa5a-zA-Z0-9\W_]+$/],
    inputErrorMessage: ''
  })
    .then(({ value }) => {
      ElMessage({
        type: 'success',
        message: `添加${value}成功`
      })
    })
    .catch(() => {
      ElMessage({
        type: 'info',
        message: '取消添加'
      })
    })
}

// 1. 模板引用，用于获取 DOM 元素
const chartRef = ref(null)
// 图表实例
let myChart = null

// 2. 响应式数据
// 输入框绑定的值
const nodeName = ref('')
// 当前选中的节点
const selectedNode = ref(null)

// 3. ECharts 配置项 (响应式)
var chartOption = ref({
  title: {
    text: 'Vue3 + ECharts Graph 增删改查示例'
  },
  tooltip: {},
  animationDurationUpdate: 1500,
  animationEasingUpdate: 'quinticInOut',
  series: [
    {
      type: 'graph',
      layout: 'force', // 力导向布局
      force: {
        repulsion: 200, // 节点之间的排斥力
        edgeLength: 100 // 边的长度
      },
      roam: true, // 是否允许缩放和拖拽
      label: {
        show: true
      },
      draggable: true,
      // 节点数据
      data: [
        {
          name: 'Node 1',
          x: 300,
          y: 300,
          itemStyle: { color: '#ff7300' }
        },
        {
          name: 'Node 2',
          x: 700,
          y: 300,
          itemStyle: { color: '#389bb7' }
        },
        {
          name: 'Node 3',
          x: 500,
          y: 100,
          itemStyle: { color: '#9bca63' }
        }
      ],
      // 连线数据
      links: [
        {
          source: 'Node 1',
          target: 'Node 2',
          lineStyle: {
            width: 2,
            curveness: 0.2
          }
        },
        {
          source: 'Node 2',
          target: 'Node 3'
        }
      ],
      lineStyle: {
        opacity: 0.9,
        width: 2,
        curveness: 0
      }
    }
  ]
})

// 4. 核心方法

/**
 * 初始化图表
 */
const initChart = () => {
  // 获取 DOM 元素
  const chartDom = chartRef.value
  if (!chartDom) return

  // 初始化 ECharts 实例
  myChart = echarts.init(chartDom)

  // 绑定点击事件，用于选择节点
  myChart.on('click', (params) => {
    console.log('点击事件参数:', params)
    // params.data 是点击的节点数据
    if (params.data && params.seriesType === 'graph') {
      selectedNode.value = params.data
      // 可以在这里给选中的节点设置一个特殊颜色，以作视觉反馈
      // 为了不污染原始数据，我们可以克隆一个对象来修改
      const newOption = JSON.parse(JSON.stringify(chartOption.value))
      newOption.series[0].data.forEach((node) => {
        // 移除所有节点的高亮样式
        if (node._isSelected) {
          delete node._isSelected
          node.itemStyle = node._originalStyle
          delete node._originalStyle
        }
      })
      // 高亮当前选中的节点
      const clickedNode = newOption.series[0].data.find((n) => n.name === params.data.name)
      if (clickedNode) {
        clickedNode._isSelected = true
        clickedNode._originalStyle = clickedNode.itemStyle
        clickedNode.itemStyle = { color: '#ff0000' } // 选中节点为红色
      }
      myChart.setOption(newOption)
    }
  })

  // 将配置项设置给图表
  myChart.setOption(chartOption.value)
}

/**
 * 添加节点
 */
const handleAddNode = () => {
  if (!nodeName.value.trim()) {
    alert('节点名称不能为空！')
    return
  }

  // 检查节点是否已存在
  const isExist = chartOption.value.series[0].data.some((node) => node.name === nodeName.value)
  if (isExist) {
    alert('该节点已存在！')
    return
  }

  // 为新节点生成一个随机颜色
  const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16)

  // 直接修改响应式的 chartOption
  chartOption.value.series[0].data.push({
    name: nodeName.value,
    itemStyle: { color: randomColor }
  })

  // 手动触发 ECharts 更新
  myChart.setOption(chartOption.value)

  // 清空输入框
  nodeName.value = ''
}

/**
 * 修改选中节点
 */
const handleModifyNode = () => {
  if (!selectedNode.value) return

  // 弹出一个 prompt 让用户输入新名称
  const newName = prompt('请输入新的节点名称:', selectedNode.value.name)

  // 如果用户点击了取消，则 newName 为 null
  if (newName === null) return

  if (!newName.trim()) {
    alert('节点名称不能为空！')
    return
  }

  // 检查新名称是否与其他节点冲突
  const isNameConflict = chartOption.value.series[0].data.some(
    (node) => node.name !== selectedNode.value.name && node.name === newName
  )
  if (isNameConflict) {
    alert('新名称已被其他节点使用！')
    return
  }

  // 找到选中节点在数组中的索引
  const nodeIndex = chartOption.value.series[0].data.findIndex(
    (node) => node.name === selectedNode.value.name
  )

  if (nodeIndex !== -1) {
    // 修改节点名称
    chartOption.value.series[0].data[nodeIndex].name = newName

    // 同时，我们也需要更新所有关联的 link
    chartOption.value.series[0].links.forEach((link) => {
      if (link.source === selectedNode.value.name) {
        link.source = newName
      }
      if (link.target === selectedNode.value.name) {
        link.target = newName
      }
    })

    // 更新 selectedNode 的引用
    selectedNode.value.name = newName

    // 手动触发 ECharts 更新
    myChart.setOption(chartOption.value)
  }
}

/**
 * 删除选中节点
 */
const handleDeleteNode = () => {
  if (!selectedNode.value) return

  if (confirm(`确定要删除节点 "${selectedNode.value.name}" 吗？`)) {
    const nodeNameToDelete = selectedNode.value.name

    // 删除节点
    chartOption.value.series[0].data = chartOption.value.series[0].data.filter(
      (node) => node.name !== nodeNameToDelete
    )

    // 删除所有与该节点相关的连线
    chartOption.value.series[0].links = chartOption.value.series[0].links.filter(
      (link) => link.source !== nodeNameToDelete && link.target !== nodeNameToDelete
    )

    // 清空选中状态
    selectedNode.value = null

    // 手动触发 ECharts 更新
    myChart.setOption(chartOption.value)
  }
}

// 5. 生命周期钩子

// 组件挂载后初始化图表
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

/**
 * 处理窗口大小变化，使图表自适应
 */
const handleResize = () => {
  if (myChart) {
    myChart.resize()
  }
}
</script>

<style scoped>
.graph-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chart {
  flex: 1;
  min-height: 500px;
  border: 1px solid #ccc;
}

.controls {
  padding: 10px;
  background-color: #f0f2f5;
  border-top: 1px solid #ccc;
}

.input-group {
  margin-bottom: 10px;
}

input {
  padding: 8px;
  margin-right: 8px;
  width: 200px;
}

button {
  padding: 8px 16px;
  cursor: pointer;
  border: none;
  background-color: #409eff;
  color: white;
  border-radius: 4px;
}

button:hover {
  background-color: #66b1ff;
}

button:disabled {
  background-color: #c0c4cc;
  cursor: not-allowed;
}

button.danger {
  background-color: #f56c6c;
}

button.danger:hover {
  background-color: #f78989;
}

.action-buttons button {
  margin-right: 10px;
}
</style>

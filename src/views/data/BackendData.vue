<script setup>
import { ref, computed, onMounted } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue' // Element Plus图标
import DataContainer from '@/components/DataContainer.vue'
import DataEdit from '@/components/DataEdit.vue'
import { useDataStore } from '@/stores/modules/DataStore'
import { storeToRefs } from 'pinia'

// 初始化仓库
const DataStore = useDataStore()
const { DataList } = storeToRefs(DataStore)
const { addData, updateData, deleteData, queryData } = DataStore

// 分页参数和状态
const total = ref(0)
const loading = ref(false)
const params = ref({
  pagenum: 1,
  pagesize: 5,
  Data_id: '', // 用于前端过滤的参数
  state: '' // 用于前端过滤的参数（若数据有该字段）
})

// 存储过滤后的数据（替代后端返回的查询结果）
const filteredData = ref([])

// 计算当前页数据（基于过滤后的数据）
const paginatedData = computed(() => {
  const startIndex = (params.value.pagenum - 1) * params.value.pagesize
  const endIndex = startIndex + params.value.pagesize
  return filteredData.value.slice(startIndex, endIndex)
})

// 获取数据（无后端：前端查询+分页）
const getDataList = () => {
  loading.value = true
  try {
    // 调用仓库的查询方法，前端过滤数据
    filteredData.value = queryData(params.value)
    // 更新总条数
    total.value = filteredData.value.length
  } catch (error) {
    console.error('数据查询失败：', error)
  } finally {
    loading.value = false
  }
}

// 分页大小改变
const onSizeChange = (size) => {
  params.value.pagesize = size
  params.value.pagenum = 1 // 重置页码为1
  getDataList() // 重新前端查询+分页
}

// 当前页改变
const onCurrentChange = (page) => {
  params.value.pagenum = page
  getDataList() // 重新计算分页（也可直接复用filteredData，优化性能）
}

// 新增数据
const dialog = ref()
const onAddData = () => {
  dialog.value.open({ isEdit: false })
}

// 编辑数据
const onEditData = (row) => {
  dialog.value.open({ isEdit: true, data: { ...row } })
}

// 删除数据
const onDeleteData = (row) => {
  ElMessageBox.confirm('您确定要删除此数据', '删除数据', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    deleteData(row.Data_id)
    // 重新查询数据，更新分页
    getDataList()
    // 若当前页数据为空，且页码大于1，页码减1
    if (paginatedData.value.length === 0 && params.value.pagenum > 1) {
      params.value.pagenum -= 1
      getDataList()
    }
  })
}

// 提交数据（新增/编辑）
const onSubData = (subData) => {
  if (subData.isEdit) {
    // 编辑数据
    updateData(subData.Data_id, subData)
  } else {
    // 新增数据（生成随机ID）
    const newDataId = generateDataId()
    const newData = { ...subData, Data_id: newDataId }
    addData(newData)
  }
  // 重新查询数据，更新分页
  getDataList()
}

// 提交成功后的处理
const onSuccess = (type) => {
  if (type === 'add') {
    // 新增后跳转到最后一页
    const lastPage = Math.ceil(total.value / params.value.pagesize)
    params.value.pagenum = lastPage
    getDataList()
  }
}

// 生成随机Data_id（6位）
const generateDataId = () => {
  // 确保ID唯一（遍历现有数据，若重复则重新生成）
  let newId
  do {
    newId = Math.floor(Math.random() * 900000 + 100000)
  } while (DataList.value.some((item) => item.Data_id === newId))
  return newId
}

// 组件挂载时初始化数据
onMounted(() => {
  getDataList()
})
</script>
<template>
  <Data-container title="后台数据">
    <template #extra>
      <el-button @click="onAddData">添加数据</el-button>
    </template>
    <!-- 表格区域 -->
    <el-table :data="paginatedData" v-loading="loading">
      <el-table-column label="数据名称" prop="Data_name"> </el-table-column>
      <el-table-column label="数据类型" prop="Data_type"></el-table-column>
      <el-table-column label="x坐标" prop="x_Coordinates"></el-table-column>
      <el-table-column label="y坐标" prop="y_Coordinates"></el-table-column>
      <el-table-column label="z坐标" prop="z_Coordinates"></el-table-column>
      <!-- 利用作用域插槽，row可以获取当前行的数据，等价于v-for遍历item -->
      <el-table-column label="操作">
        <template #default="{ row }">
          <el-button circle plain type="primary" :icon="Edit" @click="onEditData(row)"></el-button>
          <el-button
            circle
            plain
            type="danger"
            :icon="Delete"
            @click="onDeleteData(row)"
          ></el-button>
        </template>
      </el-table-column>
    </el-table>
    <!-- 分页区域 -->
    <el-pagination
      v-model:current-page="params.pagenum"
      v-model:page-size="params.pagesize"
      :page-sizes="[2, 3, 4, 5, 10]"
      layout="jumper, total, sizes, prev, pager, next"
      background
      :total="total"
      @size-change="onSizeChange"
      @current-change="onCurrentChange"
      style="margin-top: 20px; justify-content: flex-end"
    />
    <DataEdit ref="dialog" @success="onSuccess" @subdata="onSubData"></DataEdit>
  </Data-container>
</template>

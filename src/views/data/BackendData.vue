<script setup>
import { ref, computed, onMounted } from 'vue'
import { Edit, Delete, Upload } from '@element-plus/icons-vue'
import DataContainer from '@/components/DataContainer.vue'
import DataEdit from '@/components/DataEdit.vue'
import { useDataStore } from '@/stores/modules/DataStore'
import { storeToRefs } from 'pinia'
import { getWFSFeatures, getWFSFeatureTypes } from '@/apis/map.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const DataStore = useDataStore()
const { DataList } = storeToRefs(DataStore)
const { addData, updateData, deleteData, queryData } = DataStore

const total = ref(0)
const loading = ref(false)
const params = ref({
  pagenum: 1,
  pagesize: 5,
  Data_id: '',
  state: '',
  Point_type: ''
})

const filteredData = ref([])

const paginatedData = computed(() => {
  const startIndex = (params.value.pagenum - 1) * params.value.pagesize
  const endIndex = startIndex + params.value.pagesize
  return filteredData.value.slice(startIndex, endIndex)
})

const getDataList = () => {
  loading.value = true
  try {
    let tempData = queryData(params.value)
    filteredData.value = tempData.filter((item) => {
      return item.Point_type !== 'Class'
    })
    total.value = filteredData.value.length
  } catch (error) {
    console.error('数据查询失败：', error)
  } finally {
    loading.value = false
  }
}

const onSizeChange = (size) => {
  params.value.pagesize = size
  params.value.pagenum = 1
  getDataList()
}

const onCurrentChange = (page) => {
  params.value.pagenum = page
  getDataList()
}

const dialog = ref()
const onAddData = () => {
  dialog.value.open({ isEdit: false })
}

const onEditData = (row) => {
  dialog.value.open({ isEdit: true, data: { ...row } })
}

const onDeleteData = (row) => {
  ElMessageBox.confirm('您确定要删除此数据', '删除数据', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    deleteData(row.Data_id)
    getDataList()
    if (paginatedData.value.length === 0 && params.value.pagenum > 1) {
      params.value.pagenum -= 1
      getDataList()
    }
  })
}

const onSubData = (subData) => {
  if (subData.isEdit) {
    updateData(subData.Data_id, subData)
  } else {
    const newDataId = generateDataId()
    const newData = { ...subData, Data_id: newDataId }
    addData(newData)
  }
  getDataList()
}

const onSuccess = (type) => {
  if (type === 'add') {
    const lastPage = Math.ceil(total.value / params.value.pagesize)
    params.value.pagenum = lastPage
    getDataList()
  }
}

const generateDataId = () => {
  let newId
  do {
    newId = Math.floor(Math.random() * 900000 + 100000)
  } while (DataList.value.some((item) => item.Data_id === newId))
  return newId
}

// GeoServer导入相关
const importDialogVisible = ref(false)
const importLoading = ref(false)
const importForm = ref({
  serverUrl: '',
  workspace: '',
  typeName: '',
  maxFeatures: 1000,
  dataNamePrefix: ''
})
const availableLayers = ref([])
const loadingLayers = ref(false)

const openImportDialog = () => {
  importForm.value = {
    serverUrl: import.meta.env.VITE_GEOSERVER_URL || 'http://localhost:8080/geoserver/wfs',
    workspace: import.meta.env.VITE_GEOSERVER_WORKSPACE || 'knowledgegraph',
    typeName: '',
    maxFeatures: 1000,
    dataNamePrefix: ''
  }
  availableLayers.value = []
  importDialogVisible.value = true
}

const loadAvailableLayers = async () => {
  if (!importForm.value.serverUrl) {
    ElMessage.warning('请输入GeoServer地址')
    return
  }

  loadingLayers.value = true
  try {
    const serverConfig = {
      url: importForm.value.serverUrl,
      workspace: importForm.value.workspace
    }

    const result = await getWFSFeatureTypes({
      workspace: importForm.value.workspace,
      serverConfig
    })

    if (result.featureTypes) {
      availableLayers.value = result.featureTypes.map((ft) => ({
        name: ft.name,
        title: ft.title || ft.name,
        typeName: `${ft.namespace || importForm.value.workspace}:${ft.name}`
      }))
      ElMessage.success(`成功加载 ${availableLayers.value.length} 个图层`)
    }
  } catch (error) {
    console.error('加载图层列表失败:', error)
    ElMessage.error('加载图层列表失败: ' + error.message)
  } finally {
    loadingLayers.value = false
  }
}

const handleImport = async () => {
  if (!importForm.value.typeName) {
    ElMessage.warning('请选择要导入的图层')
    return
  }

  importLoading.value = true
  try {
    const serverConfig = {
      url: importForm.value.serverUrl,
      workspace: importForm.value.workspace
    }

    const geoJsonData = await getWFSFeatures({
      typeName: importForm.value.typeName,
      maxFeatures: importForm.value.maxFeatures,
      serverConfig
    })

    if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) {
      ElMessage.warning('该图层没有数据')
      return
    }

    const importCount = convertGeoJsonToDataList(geoJsonData, importForm.value.dataNamePrefix)

    ElMessage.success(`成功导入 ${importCount} 条数据`)
    importDialogVisible.value = false
    getDataList()

    // 跳转到最后一页查看导入的数据
    const lastPage = Math.ceil(total.value / params.value.pagesize)
    params.value.pagenum = lastPage
    getDataList()
  } catch (error) {
    console.error('导入数据失败:', error)
    ElMessage.error('导入数据失败: ' + error.message)
  } finally {
    importLoading.value = false
  }
}

const convertGeoJsonToDataList = (geoJsonData, namePrefix) => {
  let importCount = 0

  geoJsonData.features.forEach((feature, index) => {
    const geometry = feature.geometry
    const properties = feature.properties || {}

    let coords = null
    let geometryType = geometry.type

    // 提取坐标（根据几何类型）
    if (geometryType === 'Point') {
      coords = geometry.coordinates
    } else if (geometryType === 'LineString') {
      // 线数据取第一个点或中心点
      const lineCoords = geometry.coordinates
      coords = lineCoords[Math.floor(lineCoords.length / 2)]
    } else if (geometryType === 'Polygon') {
      // 面数据取第一个环的中心点
      const ring = geometry.coordinates[0]
      coords = ring[Math.floor(ring.length / 2)]
    } else if (geometryType === 'MultiPoint') {
      coords = geometry.coordinates[0]
    } else if (geometryType === 'MultiLineString') {
      coords = geometry.coordinates[0][0]
    } else if (geometryType === 'MultiPolygon') {
      coords = geometry.coordinates[0][0][0]
    }

    if (!coords || coords.length < 2) {
      console.warn('跳过无效坐标的要素:', index)
      return
    }

    const prefix = namePrefix || 'GeoServer'
    let dataName = properties.name
    if (!dataName) dataName = properties.NAME
    if (!dataName) dataName = properties.Name
    if (!dataName) dataName = properties.title
    if (!dataName) dataName = properties.TITLE
    if (!dataName) dataName = `${prefix}_${index + 1}`

    const newData = {
      Data_id: generateDataId(),
      Data_name: dataName,
      Data_type: geometryType,
      Point_type: 'Data',
      x_Coordinates: coords[0],
      y_Coordinates: coords[1],
      z_Coordinates: properties.z || properties.elevation || 0,
      echart_x: Math.random() * 800 + 100,
      echart_y: Math.random() * 500 + 100,
      color: getRandomColor(),
      parent_id: '',
      // 保存原始属性
      _geoserverProperties: properties,
      _geometryType: geometryType,
      _geometry: geometry
    }

    addData(newData)
    importCount++
  })

  return importCount
}

const getRandomColor = () => {
  const colors = ['#6699cc', '#66cc99', '#cc6699', '#99cc66', '#cc9966', '#669966', '#9966cc']
  return colors[Math.floor(Math.random() * colors.length)]
}

onMounted(() => {
  getDataList()
})
</script>
<template>
  <Data-container title="后台数据">
    <template #extra>
      <el-button @click="onAddData">添加数据</el-button>
      <el-button type="success" :icon="Upload" @click="openImportDialog">从GeoServer导入</el-button>
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

    <!-- GeoServer导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="从GeoServer导入数据"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="importForm" label-width="120px">
        <el-form-item label="GeoServer地址">
          <el-input
            v-model="importForm.serverUrl"
            placeholder="http://localhost:8080/geoserver/wfs"
          />
        </el-form-item>

        <el-form-item label="工作区">
          <el-input v-model="importForm.workspace" placeholder="knowledgegraph" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadAvailableLayers" :loading="loadingLayers">
            加载图层列表
          </el-button>
        </el-form-item>

        <el-form-item label="选择图层" v-if="availableLayers.length > 0">
          <el-select
            v-model="importForm.typeName"
            placeholder="请选择要导入的图层"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="layer in availableLayers"
              :key="layer.typeName"
              :label="`${layer.title} (${layer.typeName})`"
              :value="layer.typeName"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="最大导入数量">
          <el-input-number v-model="importForm.maxFeatures" :min="1" :max="10000" />
        </el-form-item>

        <el-form-item label="数据名称前缀">
          <el-input
            v-model="importForm.dataNamePrefix"
            placeholder="可选，为导入的数据添加名称前缀"
          />
        </el-form-item>

        <el-alert type="info" :closable="false" style="margin-top: 10px">
          <template #title>导入说明</template>
          <div style="font-size: 12px; line-height: 1.6">
            <p>• 支持导入点、线、面数据</p>
            <p>• 线和面数据将提取中心点坐标</p>
            <p>• 导入的数据将统一存储在后台数据中</p>
            <p>• 知识图谱和地图展示将自动使用这些数据</p>
          </div>
        </el-alert>
      </el-form>

      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleImport"
          :loading="importLoading"
          :disabled="!importForm.typeName"
        >
          开始导入
        </el-button>
      </template>
    </el-dialog>
  </Data-container>
</template>

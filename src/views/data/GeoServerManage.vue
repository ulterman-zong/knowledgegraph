<script setup>
import { ref, computed, onMounted } from 'vue'
import { Edit, Delete, Connection, Refresh } from '@element-plus/icons-vue'
import DataContainer from '@/components/DataContainer.vue'
import { useDataStore } from '@/stores/modules/DataStore'
import { storeToRefs } from 'pinia'
import { getWFSFeatureTypes, getWFSLayerInfo } from '@/apis/map.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const dataStore = useDataStore()
const { geoServerConfigs, geoServerLayers } = storeToRefs(dataStore)

const activeTab = ref('servers')
const loading = ref(false)
const testLoading = ref(false)

const serverDialogVisible = ref(false)
const serverDialogTitle = ref('添加服务器')
const serverForm = ref({
  name: '',
  url: '',
  workspace: '',
  description: ''
})
const editingServerId = ref(null)

const layerDialogVisible = ref(false)
const layerDialogTitle = ref('添加图层')
const layerForm = ref({
  serverId: '',
  typeName: '',
  name: '',
  title: '',
  geometryType: '',
  style: {}
})
const editingLayerId = ref(null)
const availableLayers = ref([])
const loadingLayers = ref(false)

const currentServer = computed(() => dataStore.getCurrentGeoServer())

const serverList = computed(() => geoServerConfigs.value)

const layerList = computed(() => {
  if (!currentServer.value) return []
  return geoServerLayers.value.filter((l) => l.serverId === currentServer.value.id)
})

const onAddServer = () => {
  serverDialogTitle.value = '添加服务器'
  serverForm.value = {
    name: '',
    url: '',
    workspace: '',
    description: ''
  }
  editingServerId.value = null
  serverDialogVisible.value = true
}

const onEditServer = (row) => {
  serverDialogTitle.value = '编辑服务器'
  serverForm.value = {
    name: row.name,
    url: row.url,
    workspace: row.workspace,
    description: row.description
  }
  editingServerId.value = row.id
  serverDialogVisible.value = true
}

const onTestConnection = async () => {
  if (!serverForm.value.url) {
    ElMessage.warning('请输入服务器地址')
    return
  }

  testLoading.value = true
  try {
    const params = {
      service: 'WFS',
      version: '2.0.0',
      request: 'GetCapabilities'
    }

    const url = new URL(serverForm.value.url)
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
      ElMessage.success('连接成功！服务器响应正常')
    } else {
      ElMessage.warning('响应格式不正确，请检查是否为WFS服务')
    }
  } catch (error) {
    console.error('连接测试失败:', error)
    ElMessage.error(
      '连接失败: ' +
        (error.message.includes('Failed to fetch')
          ? '无法连接到服务器，请检查地址或网络连接'
          : error.message)
    )
  } finally {
    testLoading.value = false
  }
}

const onSaveServer = () => {
  if (!serverForm.value.name || !serverForm.value.url) {
    ElMessage.warning('请填写服务器名称和地址')
    return
  }

  if (editingServerId.value) {
    dataStore.updateGeoServer(editingServerId.value, serverForm.value)
    ElMessage.success('服务器更新成功')
  } else {
    dataStore.addGeoServer(serverForm.value)
    ElMessage.success('服务器添加成功')
  }

  serverDialogVisible.value = false
}

const onDeleteServer = (row) => {
  if (row.id === 'default') {
    ElMessage.warning('不能删除默认服务器')
    return
  }

  ElMessageBox.confirm(
    `确定要删除服务器 "${row.name}" 吗？删除后该服务器下的图层配置也将被清除。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      dataStore.deleteGeoServer(row.id)
      ElMessage.success('删除成功')
    })
    .catch(() => {})
}

const onSwitchServer = (row) => {
  if (row.id === currentServer.value?.id) return

  dataStore.switchGeoServer(row.id)
  ElMessage.success(`已切换到服务器: ${row.name}`)
}

const loadAvailableLayers = async () => {
  if (!currentServer.value) {
    ElMessage.warning('请先选择服务器')
    return
  }

  loadingLayers.value = true
  availableLayers.value = []

  try {
    const result = await getWFSFeatureTypes({
      workspace: currentServer.value.workspace,
      serverConfig: currentServer.value
    })

    if (result.featureTypes) {
      availableLayers.value = result.featureTypes.map((ft) => ({
        name: ft.name,
        title: ft.title || ft.name,
        typeName: `${ft.namespace || currentServer.value.workspace}:${ft.name}`
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

const onAddLayer = async () => {
  if (!currentServer.value) {
    ElMessage.warning('请先选择服务器')
    return
  }

  layerDialogTitle.value = '添加图层'
  layerForm.value = {
    serverId: currentServer.value.id,
    typeName: '',
    name: '',
    title: '',
    geometryType: '',
    style: {}
  }
  editingLayerId.value = null

  await loadAvailableLayers()
  layerDialogVisible.value = true
}

const onEditLayer = (row) => {
  layerDialogTitle.value = '编辑图层'
  layerForm.value = {
    serverId: row.serverId,
    typeName: row.typeName,
    name: row.name,
    title: row.title,
    geometryType: row.geometryType,
    style: { ...row.style }
  }
  editingLayerId.value = row.id
  layerDialogVisible.value = true
}

const onLayerSelect = async (typeName) => {
  if (!typeName) return

  const selectedLayer = availableLayers.value.find((l) => l.typeName === typeName)
  if (selectedLayer) {
    layerForm.value.name = selectedLayer.name
    layerForm.value.title = selectedLayer.title

    try {
      const layerInfo = await getWFSLayerInfo(typeName, currentServer.value)
      layerForm.value.geometryType = layerInfo.geometryType
    } catch (error) {
      console.error('获取图层信息失败:', error)
    }
  }
}

const onSaveLayer = () => {
  if (!layerForm.value.typeName || !layerForm.value.name) {
    ElMessage.warning('请填写图层信息')
    return
  }

  const defaultStyles = {
    Point: { color: '#1890ff', size: 8, opacity: 0.8 },
    LineString: { color: '#52c41a', width: 3, opacity: 1 },
    Polygon: { fillColor: '#1890ff', fillOpacity: 0.3, strokeColor: '#1890ff', strokeWeight: 2 }
  }

  const layerData = {
    ...layerForm.value,
    style: layerForm.value.style || defaultStyles[layerForm.value.geometryType] || {}
  }

  if (editingLayerId.value) {
    dataStore.updateGeoServerLayer(editingLayerId.value, layerData)
    ElMessage.success('图层更新成功')
  } else {
    dataStore.addGeoServerLayer(layerData)
    ElMessage.success('图层添加成功')
  }

  layerDialogVisible.value = false
}

const onDeleteLayer = (row) => {
  ElMessageBox.confirm(`确定要删除图层 "${row.title}" 吗？`, '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      dataStore.deleteGeoServerLayer(row.id)
      ElMessage.success('删除成功')
    })
    .catch(() => {})
}

const onRefreshLayers = () => {
  loadAvailableLayers()
}

onMounted(() => {})
</script>

<template>
  <Data-container title="GeoServer 数据管理">
    <template #extra>
      <el-button v-if="activeTab === 'servers'" @click="onAddServer" type="primary">
        添加服务器
      </el-button>
      <el-button v-if="activeTab === 'layers'" @click="onAddLayer" type="primary">
        添加图层
      </el-button>
    </template>

    <el-tabs v-model="activeTab" style="margin-bottom: 20px">
      <el-tab-pane label="服务器管理" name="servers">
        <el-alert
          v-if="currentServer"
          :title="`当前服务器: ${currentServer.name}`"
          :description="currentServer.url"
          type="success"
          :closable="false"
          style="margin-bottom: 20px"
        />

        <el-table :data="serverList" v-loading="loading" border>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.id === currentServer?.id ? 'success' : 'info'" size="small">
                {{ row.id === currentServer?.id ? '当前' : '未激活' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="服务器名称" prop="name" width="180" />

          <el-table-column label="服务地址" prop="url" min-width="300">
            <template #default="{ row }">
              <el-text truncated>{{ row.url }}</el-text>
            </template>
          </el-table-column>

          <el-table-column label="工作区" prop="workspace" width="150" />

          <el-table-column label="描述" prop="description" min-width="200">
            <template #default="{ row }">
              <el-text truncated>{{ row.description || '-' }}</el-text>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button
                size="small"
                type="success"
                plain
                @click="onSwitchServer(row)"
                :disabled="row.id === currentServer?.id"
              >
                切换
              </el-button>
              <el-button size="small" type="primary" plain :icon="Edit" @click="onEditServer(row)">
                编辑
              </el-button>
              <el-button
                size="small"
                type="danger"
                plain
                :icon="Delete"
                @click="onDeleteServer(row)"
                :disabled="row.id === 'default'"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="图层管理" name="layers">
        <el-alert
          v-if="currentServer"
          :title="`当前服务器: ${currentServer.name}`"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <template #default>
            <div style="display: flex; justify-content: space-between; align-items: center">
              <span>已配置 {{ layerList.length }} 个图层</span>
              <el-button
                size="small"
                :icon="Refresh"
                @click="onRefreshLayers"
                :loading="loadingLayers"
              >
                刷新图层列表
              </el-button>
            </div>
          </template>
        </el-alert>

        <el-table :data="layerList" v-loading="loading" border>
          <el-table-column label="图层名称" prop="title" width="200" />

          <el-table-column label="类型名" prop="typeName" min-width="250">
            <template #default="{ row }">
              <el-text truncated>{{ row.typeName }}</el-text>
            </template>
          </el-table-column>

          <el-table-column label="几何类型" prop="geometryType" width="120">
            <template #default="{ row }">
              <el-tag size="small">{{ row.geometryType }}</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="可见性" prop="visible" width="100" align="center">
            <template #default="{ row }">
              <el-switch
                v-model="row.visible"
                @change="dataStore.updateGeoServerLayer(row.id, { visible: row.visible })"
              />
            </template>
          </el-table-column>

          <el-table-column label="创建时间" prop="createdAt" width="180">
            <template #default="{ row }">
              {{ new Date(row.createdAt).toLocaleString() }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" plain :icon="Edit" @click="onEditLayer(row)">
                编辑
              </el-button>
              <el-button
                size="small"
                type="danger"
                plain
                :icon="Delete"
                @click="onDeleteLayer(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="serverDialogVisible"
      :title="serverDialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="serverForm" label-width="100px">
        <el-form-item label="服务器名称" required>
          <el-input v-model="serverForm.name" placeholder="例如: 生产环境GeoServer" />
        </el-form-item>

        <el-form-item label="服务地址" required>
          <el-input
            v-model="serverForm.url"
            placeholder="例如: http://192.168.1.100:8080/geoserver/wfs"
          />
        </el-form-item>

        <el-form-item label="工作区">
          <el-input v-model="serverForm.workspace" placeholder="例如: my_workspace" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="serverForm.description"
            type="textarea"
            :rows="3"
            placeholder="服务器描述信息"
          />
        </el-form-item>

        <el-form-item>
          <el-button @click="onTestConnection" :loading="testLoading" :icon="Connection">
            测试连接
          </el-button>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="serverDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSaveServer">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="layerDialogVisible"
      :title="layerDialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="layerForm" label-width="100px">
        <el-form-item label="选择图层" required v-if="!editingLayerId">
          <el-select
            v-model="layerForm.typeName"
            placeholder="请选择图层"
            filterable
            @change="onLayerSelect"
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

        <el-form-item label="图层名称" v-else>
          <el-input v-model="layerForm.title" disabled />
        </el-form-item>

        <el-form-item label="几何类型">
          <el-tag>{{ layerForm.geometryType || '未知' }}</el-tag>
        </el-form-item>

        <el-form-item label="样式配置" v-if="layerForm.geometryType">
          <div v-if="layerForm.geometryType === 'Point'" style="width: 100%">
            <el-row :gutter="10">
              <el-col :span="8">
                <el-form-item label="颜色" label-width="60px">
                  <el-color-picker v-model="layerForm.style.color" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="大小" label-width="60px">
                  <el-input-number v-model="layerForm.style.size" :min="1" :max="50" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="透明度" label-width="60px">
                  <el-slider v-model="layerForm.style.opacity" :min="0" :max="1" :step="0.1" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <div v-else-if="layerForm.geometryType === 'LineString'" style="width: 100%">
            <el-row :gutter="10">
              <el-col :span="8">
                <el-form-item label="颜色" label-width="60px">
                  <el-color-picker v-model="layerForm.style.color" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="线宽" label-width="60px">
                  <el-input-number v-model="layerForm.style.width" :min="1" :max="20" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="透明度" label-width="60px">
                  <el-slider v-model="layerForm.style.opacity" :min="0" :max="1" :step="0.1" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <div v-else-if="layerForm.geometryType === 'Polygon'" style="width: 100%">
            <el-row :gutter="10">
              <el-col :span="12">
                <el-form-item label="填充色" label-width="60px">
                  <el-color-picker v-model="layerForm.style.fillColor" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="填充透明度" label-width="80px">
                  <el-slider v-model="layerForm.style.fillOpacity" :min="0" :max="1" :step="0.1" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="10">
              <el-col :span="12">
                <el-form-item label="边框色" label-width="60px">
                  <el-color-picker v-model="layerForm.style.strokeColor" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="边框宽度" label-width="80px">
                  <el-input-number v-model="layerForm.style.strokeWeight" :min="1" :max="10" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="layerDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSaveLayer">保存</el-button>
      </template>
    </el-dialog>
  </Data-container>
</template>

<style scoped>
.el-alert {
  margin-bottom: 20px;
}
</style>

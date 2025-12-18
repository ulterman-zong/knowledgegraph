<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus' // 补充导入

// 定义表单校验规则
const rules = ref({
  Link_Relationship: [{ required: true, message: '连线关系不能为空', trigger: 'blur' }]
})

// 组件状态
const isEdit = ref(false)
const dialogVisible = ref(false)
// 完善表单字段：包含连线核心属性
const formModel = ref({
  linkId: '', // 连线唯一ID（编辑时必填）
  Link_Relationship: '', // 连线标签/关系
  curveness: 0.2 // 曲线弧度（0-1）
})

// 定义事件：提交数据、关闭弹窗
const emit = defineEmits(['subLink', 'close'])

// 提交表单
const onSubmit = () => {
  // 基础校验：关系不能为空
  if (!formModel.value.Link_Relationship.trim()) {
    ElMessage.warning('请输入连线关系！')
    return
  }
  // 弧度范围校验
  if (formModel.value.curveness < 0 || formModel.value.curveness > 1) {
    ElMessage.warning('曲线弧度需在 0-1 之间！')
    return
  }

  // 整理提交数据
  const subData = {
    isEdit: isEdit.value,
    linkId: formModel.value.linkId,
    label: formModel.value.Link_Relationship.trim(), // 对应Store的label字段
    curveness: Number(formModel.value.curveness) // 确保是数字
  }

  emit('subLink', subData) // 触发提交事件
  ElMessage.success(isEdit.value ? '连线编辑成功' : '连线新增成功')
  dialogVisible.value = false
}

// 打开弹窗（接收外部参数）
const open = (options) => {
  console.log('连线弹窗参数：', options)
  isEdit.value = !!options.isEdit // 布尔值转换
  dialogVisible.value = true

  // 编辑模式：回显已有连线数据
  if (options.isEdit && options.data) {
    formModel.value = {
      linkId: options.data.linkId || '',
      Link_Relationship: options.data.label || options.data.Link_Relationship || '关联',
      curveness: options.data.curveness || 0.2
    }
  }
  // 新增模式：重置表单（保留默认弧度）
  else {
    formModel.value = {
      linkId: '',
      Link_Relationship: '',
      curveness: 0.2
    }
    // 新增时传入起点/终点ID（用于addLink）
    if (options.sourceId && options.targetId) {
      formModel.value.sourceId = options.sourceId
      formModel.value.targetId = options.targetId
    }
  }
}

// 取消弹窗
const onCancel = () => {
  dialogVisible.value = false
  emit('close')
}

// 暴露方法给父组件
defineExpose({
  open
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑连线关系' : '新增连线关系'"
    width="400px"
    @close="onCancel"
  >
    <el-form
      :model="formModel"
      :rules="rules"
      label-width="100px"
      ref="linkFormRef"
      style="padding: 0 10px"
    >
      <!-- 连线关系（标签） -->
      <el-form-item label="连线关系" prop="Link_Relationship">
        <el-input
          v-model="formModel.Link_Relationship"
          placeholder="请输入连线关系（如：父子、包含）"
          maxlength="20"
        />
      </el-form-item>
      <!-- 曲线弧度 -->
      <el-form-item label="曲线弧度">
        <el-input-number
          v-model="formModel.curveness"
          :min="0"
          :max="1"
          :step="0.1"
          style="width: 100%"
          placeholder="0为直线，数值越大弧度越大"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="onCancel">取消</el-button>
        <el-button type="primary" @click="onSubmit">确认</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>

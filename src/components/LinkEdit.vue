<script setup>
import { ref, nextTick } from 'vue'

// 定义表单校验规则
const rules = ref({
  Link_Relationship: [{ required: true, message: '连线关系不能为空', trigger: 'blur' }]
})

// 组件状态
const isEdit = ref(false)
const dialogVisible = ref(false)
const formModel = ref({
  linkId: '',
  sourceId: '',
  targetId: '',
  sourceName: '',
  targetName: '',
  Link_Relationship: '',
  curveness: 0.2
})

// 定义事件
const emit = defineEmits(['subLink', 'close'])

// 提交表单
const onSubmit = () => {
  // 基础校验
  if (!formModel.value.Link_Relationship.trim()) {
    ElMessage.warning('请输入连线关系！')
    return
  }
  if (formModel.value.curveness < 0 || formModel.value.curveness > 1) {
    ElMessage.warning('曲线弧度需在 0-1 之间！')
    return
  }

  // 整理提交数据
  const subData = {
    isEdit: isEdit.value,
    linkId: formModel.value.linkId,
    sourceId: formModel.value.sourceId,
    targetId: formModel.value.targetId,
    sourceName: formModel.value.sourceName,
    targetName: formModel.value.targetName,
    label: formModel.value.Link_Relationship.trim(),
    curveness: Number(formModel.value.curveness)
  }

  // 触发提交事件
  emit('subLink', subData)

  // 强制关闭弹窗（双重保障）
  dialogVisible.value = false
  nextTick(() => {
    dialogVisible.value = false
    emit('close')
  })
}

// 打开弹窗
const open = (options) => {
  console.log('连线弹窗参数：', options)
  isEdit.value = !!options.isEdit
  dialogVisible.value = true

  if (options.isEdit && options.data) {
    formModel.value = {
      linkId: options.data.linkId || '',
      sourceId: options.data.sourceId || '',
      targetId: options.data.targetId || '',
      sourceName: options.data.sourceName || '',
      targetName: options.data.targetName || '',
      Link_Relationship: options.data.label || options.data.Link_Relationship || '关联',
      curveness: options.data.curveness || 0.2
    }
  } else {
    formModel.value = {
      linkId: '',
      sourceId: options.sourceId || '',
      targetId: options.targetId || '',
      sourceName: options.sourceName || '',
      targetName: options.targetName || '',
      Link_Relationship: '',
      curveness: 0.2
    }
  }
}

// 取消弹窗
const onCancel = () => {
  dialogVisible.value = false
  emit('close')
}

// 显式关闭方法
const close = () => {
  dialogVisible.value = false
  emit('close')
}

// 暴露方法
defineExpose({
  open,
  close
})
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑连线关系' : '新增连线关系'"
    width="400px"
    @close="onCancel"
    :close-on-click-modal="false"
  >
    <el-form
      :model="formModel"
      :rules="rules"
      label-width="100px"
      ref="linkFormRef"
      style="padding: 0 10px"
    >
      <el-form-item label="连线关系" prop="Link_Relationship">
        <el-input v-model="formModel.Link_Relationship" maxlength="20" />
      </el-form-item>
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

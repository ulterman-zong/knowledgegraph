<script setup>
import { ref } from 'vue'
const isEdit = ref(false)
const dialogVisible = ref(false)
const formModel = ref({
  Data_id: '',
  Data_name: '',
  Data_type: '',
  x_Coordinates: '',
  y_Coordinates: '',
  z_Coordinates: ''
})
const emit = defineEmits(['success', 'subdata'])
const onSubmit = () => {
  const subData = {
    ...formModel.value,
    isEdit: isEdit.value
  }
  emit('subdata', subData)
  ElMessage.success(isEdit.value ? '编辑成功' : '添加成功')
  dialogVisible.value = false
  emit('success')
}
const open = (options) => {
  console.log('外部传入参数：', options) // 调试用
  // 赋值全局isEdit（外部指定：true=编辑，false=新增）
  isEdit.value = options.isEdit
  // 编辑时回显数据，新增时重置表单
  if (options.isEdit && options.data) {
    formModel.value = { ...options.data } // 编辑：回显数据
  } else {
    // 新增：清空表单（Data_id置空）
    formModel.value = {
      Data_id: '',
      Data_name: '',
      Data_type: '',
      x_Coordinates: '',
      y_Coordinates: '',
      z_Coordinates: ''
    }
  }
  dialogVisible.value = true
}

//向外暴露方法
defineExpose({
  open
})
</script>
<template>
  <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑数据' : '新增数据'" width="30%">
    <el-form :model="formModel" label-width="100px" style="padding-right: 30px">
      <el-form-item label="数据名称" prop="Data_name">
        <el-input v-model="formModel.Data_name" placeholder="请输入数据名称"></el-input>
      </el-form-item>
      <el-form-item label="数据类型" prop="Data_type">
        <el-input v-model="formModel.Data_type" placeholder="请输入数据类型"></el-input>
      </el-form-item>
      <el-form-item label="x坐标" prop="x_Coordinates">
        <el-input v-model="formModel.x_Coordinates" placeholder="请输入x坐标"></el-input>
      </el-form-item>
      <el-form-item label="y坐标" prop="y_Coordinates">
        <el-input v-model="formModel.y_Coordinates" placeholder="请输入y坐标"></el-input>
      </el-form-item>
      <el-form-item label="z坐标" prop="z_Coordinates">
        <el-input v-model="formModel.z_Coordinates" placeholder="请输入z坐标"></el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSubmit"> 确认 </el-button>
      </span>
    </template>
  </el-dialog>
</template>

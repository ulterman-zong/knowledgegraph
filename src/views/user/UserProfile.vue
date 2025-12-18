<script setup>
import { ref } from 'vue'

// 1. 表单实例ref（用于触发校验）
const formRef = ref()

// 2. 校验规则（核心保留）
const rules = {
  nickname: [
    { required: true, message: '请输入用户昵称', trigger: 'blur' },
    { pattern: /^\S{2,10}$/, message: '昵称必须是2-10位的非空字符串', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入用户邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ]
}

// 3. 表单绑定值（校验依赖v-model，必须保留响应式）
const userInfo = ref({
  nickname: '', // 初始空值
  email: '' // 初始空值
})

// 4. 提交方法（仅触发校验，无其他业务逻辑）
const submitForm = async () => {
  if (!formRef.value) return
  // 仅执行表单校验，无接口请求/数据提交等业务逻辑
  try {
    await formRef.value.validate()
    alert('表单校验通过！') // 静态提示（无业务逻辑）
  } catch (error) {
    console.log('表单校验失败：', error)
  }
}
</script>

<template>
  <!-- 静态结构保留，仅保留校验相关属性 -->
  <Data-container title="基本资料">
    <el-row>
      <el-col :span="12">
        <el-form :rules="rules" ref="formRef" label-width="100px" size="large">
          <!-- 静态不可编辑项：登录名称 -->
          <el-form-item label="登录名称">
            <el-input disabled placeholder="登录名称"></el-input>
          </el-form-item>
          <!-- 昵称：带校验prop + v-model -->
          <el-form-item label="用户昵称" prop="nickname">
            <el-input v-model="userInfo.nickname" placeholder="请输入用户昵称"></el-input>
          </el-form-item>
          <!-- 邮箱：带校验prop + v-model -->
          <el-form-item label="用户邮箱" prop="email">
            <el-input v-model="userInfo.email" placeholder="请输入用户邮箱"></el-input>
          </el-form-item>
          <!-- 提交按钮：触发校验 -->
          <el-form-item>
            <el-button @click="submitForm" type="primary">提交修改</el-button>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>
  </Data-container>
</template>

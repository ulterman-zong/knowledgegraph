<script setup>
// 仅保留：核心校验依赖 + 静态结构所需导入（无业务逻辑相关导入）
import { ref } from 'vue'

// 1. 表单绑定值（校验依赖，保留极简初始值）
const pwdForm = ref({
  old_pwd: '',
  new_pwd: '',
  re_pwd: ''
})

// 2. 自定义校验函数（核心保留，仅做字段对比校验）
const checkOldSame = (rule, value, cb) => {
  if (value === pwdForm.value.old_pwd) {
    cb(new Error('原密码和新密码不能一样!'))
  } else {
    cb()
  }
}

const checkNewSame = (rule, value, cb) => {
  if (value !== pwdForm.value.new_pwd) {
    cb(new Error('新密码和确认再次输入的新密码不一样!'))
  } else {
    cb()
  }
}

// 3. 表单校验规则（完整保留）
const rules = {
  old_pwd: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { pattern: /^\S{6,15}$/, message: '密码长度必须是6-15位的非空字符串', trigger: 'blur' }
  ],
  new_pwd: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { pattern: /^\S{6,15}$/, message: '密码长度必须是6-15位的非空字符串', trigger: 'blur' },
    { validator: checkOldSame, trigger: 'blur' }
  ],
  re_pwd: [
    { required: true, message: '请再次确认新密码', trigger: 'blur' },
    { pattern: /^\S{6,15}$/, message: '密码长度必须是6-15位的非空字符串', trigger: 'blur' },
    { validator: checkNewSame, trigger: 'blur' }
  ]
}

// 4. 表单实例ref（用于触发校验/重置）
const formRef = ref()

// 5. 提交方法（仅执行校验，无任何业务逻辑）
const onSubmit = async () => {
  if (!formRef.value) return
  // 仅触发校验，无接口请求、状态修改、路由跳转等
  try {
    await formRef.value.validate()
    // 仅保留校验通过的基础提示（无业务操作）
    console.log('表单校验通过')
  } catch (error) {
    console.log('表单校验失败：', error)
  }
}

// 6. 重置方法（仅重置表单字段，无其他逻辑）
const onReset = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
}
</script>

<template>
  <!-- 保留静态布局结构，仅保留校验相关绑定属性 -->
  <Data-container title="重置密码">
    <el-row>
      <el-col :span="12">
        <el-form :model="pwdForm" :rules="rules" ref="formRef" label-width="100px" size="large">
          <el-form-item label="原密码" prop="old_pwd">
            <el-input
              v-model="pwdForm.old_pwd"
              type="password"
              placeholder="请输入原密码"
            ></el-input>
          </el-form-item>
          <el-form-item label="新密码" prop="new_pwd">
            <el-input
              v-model="pwdForm.new_pwd"
              type="password"
              placeholder="请输入新密码"
            ></el-input>
          </el-form-item>
          <el-form-item label="确认新密码" prop="re_pwd">
            <el-input
              v-model="pwdForm.re_pwd"
              type="password"
              placeholder="请再次输入新密码"
            ></el-input>
          </el-form-item>
          <el-form-item>
            <el-button @click="onSubmit" type="primary">修改密码</el-button>
            <el-button @click="onReset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>
  </Data-container>
</template>

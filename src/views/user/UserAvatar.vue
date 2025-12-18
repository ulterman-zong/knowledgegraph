<script setup>
import { ref } from 'vue'
import { Plus, Upload } from '@element-plus/icons-vue'

// 1. 图片预览地址（初始值改为默认头像，剔除store依赖）
const imgUrl = ref('@/assets/avatar.jpg')

// 2. 上传文件预览逻辑（核心保留，仅做本地预览，无业务操作）
const onUploadFile = (file) => {
  // 基于FileReader读取图片进行本地预览（纯前端交互，无业务逻辑）
  const reader = new FileReader()
  reader.readAsDataURL(file.raw)
  reader.onload = () => {
    imgUrl.value = reader.result
  }
}

// 3. 上传组件ref（用于触发选择文件，保留）
const uploadRef = ref()

// 4. 上传按钮点击方法（仅做控制台提示，无接口/状态操作）
const onUpdateAvatar = () => {
  // 仅提示预览成功，无任何业务逻辑
  if (imgUrl.value !== '@/assets/avatar.jpg') {
    console.log('头像预览成功（静态演示，无实际上传）')
  } else {
    console.log('请先选择图片')
  }
}
</script>

<template>
  <Data-container title="更换头像">
    <el-row>
      <el-col :span="12">
        <el-upload
          ref="uploadRef"
          class="avatar-uploader"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="onUploadFile"
        >
          <img v-if="imgUrl" :src="imgUrl" class="avatar" />
          <img v-else src="@/assets/avatar.jpg" width="278" />
        </el-upload>
        <br />
        <el-button
          @click="uploadRef.$el.querySelector('input').click()"
          type="primary"
          :icon="Plus"
          size="large"
        >
          选择图片
        </el-button>
        <el-button @click="onUpdateAvatar" type="success" :icon="Upload" size="large">
          上传头像
        </el-button>
      </el-col>
    </el-row>
  </Data-container>
</template>

<style lang="scss" scoped>
// 完全保留静态样式，无修改
.avatar-uploader {
  :deep() {
    .avatar {
      width: 278px;
      height: 278px;
      display: block;
    }
    .el-upload {
      border: 1px dashed var(--el-border-color);
      border-radius: 6px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: var(--el-transition-duration-fast);
    }
    .el-upload:hover {
      border-color: var(--el-color-primary);
    }
    .el-icon.avatar-uploader-icon {
      font-size: 28px;
      color: #8c939d;
      width: 278px;
      height: 278px;
      text-align: center;
    }
  }
}
</style>

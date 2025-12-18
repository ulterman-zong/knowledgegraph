<script setup>
//父传子通过props来传递title
defineProps({
  title: {
    required: true,
    type: String
  }
})
</script>

<template>
  <el-card class="Data-container">
    <template #header>
      <div class="header">
        <span>{{ title }}</span>
        <div class="extra">
          <!-- 具名插槽定制右侧额外按钮 -->
          <slot name="extra"></slot>
        </div>
      </div>
    </template>
    <!-- 默认插槽定制主题内容 -->
    <slot> </slot>
  </el-card>
</template>

<style lang="scss" scoped>
.Data-container {
  min-height: 100%; //最小高
  box-sizing: border-box;
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>

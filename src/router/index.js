import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', component: () => import('@/views/login/LoginPage.vue') },
    { path: '/text', component: () => import('@/views/text/TextGraph.vue') },
    {
      path: '/',
      component: () => import('@/views/layout/LayoutContainer.vue'),
      redirect: 'knowledge/knowledgegraph',
      children: [
        {
          path: 'knowledge/knowledgegraph',
          component: () => import('@/views//knowledge/KnowledgeGraph.vue')
        },
        {
          path: '/data/backenddata',
          component: () => import('@/views/data/BackendData.vue')
        },
        {
          path: '/user/profile',
          component: () => import('@/views/user/UserProfile.vue')
        },
        {
          path: '/user/avatar',
          component: () => import('@/views/user/UserAvatar.vue')
        },
        {
          path: '/user/password',
          component: () => import('@/views/user/UserPassword.vue')
        },
        {
          path: '/map/mapdatashow',
          component: () => import('@/views/map/MapDataShow.vue')
        }
      ]
    }
  ]
})

export default router

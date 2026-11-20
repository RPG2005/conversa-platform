import type { Pinia } from 'pinia'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import { useSessionStore } from '../stores/session'
import AccessView from '../views/AccessView.vue'
import HomeView from '../views/HomeView.vue'
import ConversationView from '../views/ConversationView.vue'
import NotificationPreferencesView from '../views/NotificationPreferencesView.vue'
export const router = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: HomeView, meta: { requiresAuth: true } }, { path: '/conversations/:conversationId', component: ConversationView, meta: { requiresAuth: true } }, { path: '/settings', component: NotificationPreferencesView, meta: { requiresAuth: true } }, { path: '/access', component: AccessView }] })
export const installAuthGuard = (targetRouter: Router, pinia: Pinia) => targetRouter.beforeEach(async (to) => {
  const session = useSessionStore(pinia)
  await session.restore()
  if (to.meta.requiresAuth) {
    if (!session.authenticated) return '/access'
  }
  if (to.path === '/access' && session.authenticated) return '/'
  return true
})

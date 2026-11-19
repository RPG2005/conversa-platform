import type { Pinia } from 'pinia'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import { useSessionStore } from '../stores/session'
import AccessView from '../views/AccessView.vue'
import HomeView from '../views/HomeView.vue'
export const router = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: HomeView, meta: { requiresAuth: true } }, { path: '/access', component: AccessView }] })
export const installAuthGuard = (targetRouter: Router, pinia: Pinia) => targetRouter.beforeEach((to) => to.meta.requiresAuth && !useSessionStore(pinia).authenticated ? '/access' : true)

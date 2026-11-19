import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { installAuthGuard } from './index'
import { useSessionStore } from '../stores/session'

describe('auth guard', () => {
  it('redirects anonymous users away from protected routes', async () => {
    const pinia = createPinia()
    const testRouter = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' }, meta: { requiresAuth: true } },
        { path: '/access', component: { template: '<div />' } },
      ],
    })
    installAuthGuard(testRouter, pinia)
    await testRouter.push('/')
    expect(testRouter.currentRoute.value.path).toBe('/access')
    const session = useSessionStore(pinia)
    session.user = { id: 'user-1', email: 'ada@example.test', displayName: 'Ada' }
    session.initialized = true
    await testRouter.push('/')
    expect(testRouter.currentRoute.value.path).toBe('/')
  })
})

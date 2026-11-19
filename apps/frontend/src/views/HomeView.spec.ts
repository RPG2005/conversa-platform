import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '../stores/session'
import HomeView from './HomeView.vue'

afterEach(() => vi.unstubAllGlobals())

const createView = async (fetchMock: ReturnType<typeof vi.fn>) => {
  vi.stubGlobal('fetch', fetchMock)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: HomeView }, { path: '/conversations/:conversationId', component: { template: '<div />' } }],
  })
  await router.push('/')
  await router.isReady()
  const pinia = createPinia()
  const session = useSessionStore(pinia)
  session.user = { id: 'user-1', email: 'ada@example.test', displayName: 'Ada' }
  session.initialized = true
  const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('home view', () => {
  it('shows an empty state when the user has no conversations', async () => {
    const { wrapper } = await createView(vi.fn().mockResolvedValue(new Response(JSON.stringify({ conversations: [] }), { status: 200 })))

    expect(wrapper.text()).toContain('Todavía no tienes chats')
  })

  it('announces conversation creation errors and keeps the email available', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ conversations: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Participant not found' }), { status: 404 }))
    const { wrapper } = await createView(fetchMock)
    await wrapper.get('#participant-email').setValue('bob@example.test')

    await wrapper.get('.inline-form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Participant not found')
    expect((wrapper.get('#participant-email').element as HTMLInputElement).value).toBe('bob@example.test')
  })
})

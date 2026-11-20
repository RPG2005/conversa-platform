import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useSessionStore } from '../stores/session'
import ConversationView from './ConversationView.vue'

afterEach(() => vi.unstubAllGlobals())

const createView = async (fetchMock: ReturnType<typeof vi.fn>) => {
  vi.stubGlobal('fetch', fetchMock)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/conversations/:conversationId', component: ConversationView }, { path: '/', component: { template: '<div />' } }],
  })
  await router.push('/conversations/chat-1')
  await router.isReady()
  const pinia = createPinia()
  const session = useSessionStore(pinia)
  session.user = { id: 'user-1', email: 'ada@example.test', displayName: 'Ada' }
  session.initialized = true
  const wrapper = mount(ConversationView, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return wrapper
}

describe('conversation view', () => {
  it('keeps the draft and announces an error when sending fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [], nextCursor: null }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Temporary failure' }), { status: 503 }))
    const wrapper = await createView(fetchMock)
    await wrapper.get('#message-content').setValue('Please keep this draft')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect((wrapper.get('#message-content').element as HTMLTextAreaElement).value).toBe('Please keep this draft')
    expect(wrapper.get('[role="alert"]').text()).toBe('Temporary failure')
  })

  it('clears the draft and shows the message after a confirmed send', async () => {
    const createdMessage = {
      id: 'message-1', conversationId: 'chat-1', authorId: 'user-1', content: 'Confirmed', attachments: [], createdAt: '2026-01-01T10:00:00.000Z',
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [], nextCursor: null }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: createdMessage }), { status: 201 }))
    const wrapper = await createView(fetchMock)
    await wrapper.get('#message-content').setValue('Confirmed')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect((wrapper.get('#message-content').element as HTMLTextAreaElement).value).toBe('')
    expect(wrapper.text()).toContain('Confirmed')
  })
})

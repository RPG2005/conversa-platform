import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import NotificationPreferencesView from './NotificationPreferencesView.vue'

afterEach(() => vi.unstubAllGlobals())

const createView = async (fetchMock: ReturnType<typeof vi.fn>) => {
  vi.stubGlobal('fetch', fetchMock)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/settings', component: NotificationPreferencesView }, { path: '/', component: { template: '<div />' } }],
  })
  await router.push('/settings')
  await router.isReady()
  const wrapper = mount(NotificationPreferencesView, { global: { plugins: [createPinia(), router] } })
  await flushPromises()
  return wrapper
}

describe('notification preferences view', () => {
  it('loads the saved preference and persists a changed value', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ notification: { emailEnabled: true, updatedAt: null } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ notification: { emailEnabled: false, updatedAt: '2026-01-01T00:00:00.000Z' } }), { status: 200 }))
    const wrapper = await createView(fetchMock)
    expect((wrapper.get('#email-notifications').element as HTMLInputElement).checked).toBe(true)

    await wrapper.get('#email-notifications').setValue(false)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PUT', body: JSON.stringify({ emailEnabled: false }) })
    expect(wrapper.get('[role="status"]').text()).toContain('Preferencias guardadas')
  })

  it('announces a load error and allows retry', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Service unavailable' }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ notification: { emailEnabled: true, updatedAt: null } }), { status: 200 }))
    const wrapper = await createView(fetchMock)

    expect(wrapper.get('[role="alert"]').text()).toContain('Service unavailable')
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect((wrapper.get('#email-notifications').element as HTMLInputElement).checked).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the draft and announces a save error', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ notification: { emailEnabled: true, updatedAt: null } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Could not save preference' }), { status: 503 }))
    const wrapper = await createView(fetchMock)

    await wrapper.get('#email-notifications').setValue(false)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Could not save preference')
    expect((wrapper.get('#email-notifications').element as HTMLInputElement).checked).toBe(false)
  })
})

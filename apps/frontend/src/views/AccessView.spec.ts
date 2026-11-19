import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import AccessView from './AccessView.vue'

afterEach(() => vi.unstubAllGlobals())

const createView = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/access', component: AccessView },
      { path: '/', component: { template: '<div>Inicio</div>' } },
    ],
  })
  await router.push('/access')
  await router.isReady()
  const wrapper = mount(AccessView, { global: { plugins: [createPinia(), router] } })
  return { wrapper, router }
}

describe('access view', () => {
  it('shows registration fields and the backend minimum password length', async () => {
    const { wrapper } = await createView()

    await wrapper.get('.link-button').trigger('click')

    expect(wrapper.find('#displayName').exists()).toBe(true)
    expect(wrapper.get('#password').attributes('minlength')).toBe('12')
  })

  it('announces invalid credentials returned by the API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401 })))
    const { wrapper, router } = await createView()
    await wrapper.get('#email').setValue('ada@example.test')
    await wrapper.get('#password').setValue('incorrect-password')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Invalid email or password')
    expect(router.currentRoute.value.path).toBe('/access')
  })
})

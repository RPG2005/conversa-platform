import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { installAuthGuard, router } from './router'
import { useSessionStore } from './stores/session'
import { useConversationsStore } from './stores/conversations'
import './style.css'
import App from './App.vue'

const pinia = createPinia()
installAuthGuard(router, pinia)
window.addEventListener('auth:expired', () => {
  useSessionStore(pinia).clear()
  useConversationsStore(pinia).clear()
  void router.replace('/access')
})
createApp(App).use(pinia).use(router).mount('#app')

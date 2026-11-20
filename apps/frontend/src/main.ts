import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { installAuthGuard, router } from './router'
import { useSessionStore } from './stores/session'
import { useConversationsStore } from './stores/conversations'
import { usePreferencesStore } from './stores/preferences'
import { installClientErrorReporting } from './services/client-error-reporter'
import './style.css'
import App from './App.vue'

const pinia = createPinia()
installAuthGuard(router, pinia)
const app = createApp(App)
installClientErrorReporting(app)
window.addEventListener('auth:expired', () => {
  useSessionStore(pinia).clear()
  useConversationsStore(pinia).clear()
  usePreferencesStore(pinia).clear()
  void router.replace('/access')
})
app.use(pinia).use(router).mount('#app')

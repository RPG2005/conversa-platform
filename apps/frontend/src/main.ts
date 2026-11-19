import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { installAuthGuard, router } from './router'
import './style.css'
import App from './App.vue'

const pinia = createPinia()
installAuthGuard(router, pinia)
createApp(App).use(pinia).use(router).mount('#app')

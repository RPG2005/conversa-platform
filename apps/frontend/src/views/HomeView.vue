<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import UiState from '../components/UiState.vue'
import { useSessionStore } from '../stores/session'

const router = useRouter()
const session = useSessionStore()
const pending = ref(false)
const error = ref('')
const signOut = async () => {
  pending.value = true
  error.value = ''
  try {
    await session.logout()
    await router.replace('/access')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo cerrar la sesión. Inténtalo de nuevo.'
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <main>
    <header class="home-header">
      <div><p class="eyebrow">CHAT YES/NO</p><h1>Conversaciones</h1></div>
      <button type="button" :disabled="pending" @click="signOut">{{ pending ? 'Cerrando sesión…' : 'Cerrar sesión' }}</button>
    </header>
    <p v-if="session.user" class="welcome">Sesión iniciada como {{ session.user.displayName }} ({{ session.user.email }})</p>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <UiState
      title="Tu chat estará listo pronto"
      detail="Tu cuenta ya está preparada. La lista de conversaciones llegará en la siguiente fase."
    />
  </main>
</template>

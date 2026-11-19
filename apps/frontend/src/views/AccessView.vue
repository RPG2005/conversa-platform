<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session'

const router = useRouter()
const session = useSessionStore()
const registering = ref(false)
const email = ref('')
const displayName = ref('')
const password = ref('')
const pending = ref(false)
const error = ref('')

const submit = async () => {
  error.value = ''
  pending.value = true
  try {
    if (registering.value) await session.register(email.value, displayName.value, password.value)
    else await session.login(email.value, password.value)
    await router.push('/')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo iniciar sesión.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="auth-card">
    <p class="eyebrow">
      CHAT YES/NO
    </p>
    <h1>{{ registering ? 'Crear cuenta' : 'Bienvenido de nuevo' }}</h1>
    <p class="intro">
      {{ registering ? 'Crea tu cuenta para empezar a conversar.' : 'Inicia sesión para ver tus conversaciones.' }}
    </p>
    <p
      v-if="session.restoreError"
      class="form-error"
      role="status"
    >
      {{ session.restoreError }} Puedes volver a intentarlo iniciando sesión.
    </p>
    <form @submit.prevent="submit">
      <label for="email">Correo electrónico</label>
      <input
        id="email"
        v-model="email"
        type="email"
        autocomplete="email"
        required
        maxlength="320"
      >
      <template v-if="registering">
        <label for="displayName">Nombre visible</label>
        <input
          id="displayName"
          v-model="displayName"
          type="text"
          autocomplete="name"
          required
          minlength="1"
          maxlength="80"
        >
      </template>
      <label for="password">Contraseña</label>
      <input
        id="password"
        v-model="password"
        type="password"
        :autocomplete="registering ? 'new-password' : 'current-password'"
        required
        :minlength="registering ? 12 : 1"
        maxlength="128"
      >
      <p
        v-if="error"
        class="form-error"
        role="alert"
      >
        {{ error }}
      </p>
      <button
        type="submit"
        :disabled="pending"
      >
        {{ pending ? 'Un momento…' : registering ? 'Crear cuenta' : 'Iniciar sesión' }}
      </button>
    </form>
    <p class="switch-mode">
      {{ registering ? '¿Ya tienes cuenta?' : '¿Todavía no tienes cuenta?' }}
      <button
        class="link-button"
        type="button"
        @click="registering = !registering; error = ''"
      >
        {{ registering ? 'Inicia sesión' : 'Regístrate' }}
      </button>
    </p>
  </main>
</template>

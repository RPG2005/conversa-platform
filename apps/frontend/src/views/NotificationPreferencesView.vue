<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePreferencesStore } from '../stores/preferences'

const router = useRouter()
const preferences = usePreferencesStore()
const emailEnabled = ref(true)
const saved = ref(false)
const hasPreference = computed(() => preferences.notification !== null)

watch(() => preferences.notification, (notification) => {
  if (notification) emailEnabled.value = notification.emailEnabled
}, { immediate: true })

onMounted(() => preferences.load())

const save = async () => {
  saved.value = false
  saved.value = await preferences.save(emailEnabled.value)
}
</script>

<template>
  <main class="preferences-page">
    <header class="preferences-header">
      <button
        class="secondary-button"
        type="button"
        @click="router.push('/')"
      >
        ← Conversaciones
      </button>
      <p class="eyebrow">
        CONVERSA
      </p>
      <h1>Preferencias de notificación</h1>
      <p class="intro">
        Elige si quieres recibir avisos por correo cuando llegue un mensaje.
      </p>
    </header>

    <div
      v-if="preferences.loading && !hasPreference"
      class="state"
      role="status"
    >
      Cargando preferencias…
    </div>
    <div
      v-else-if="preferences.error && !hasPreference"
      class="form-error"
      role="alert"
    >
      <p>{{ preferences.error }}</p>
      <button
        type="button"
        @click="preferences.load()"
      >
        Volver a intentar
      </button>
    </div>
    <form
      v-else
      class="preferences-form"
      @submit.prevent="save"
    >
      <label
        class="preference-option"
        for="email-notifications"
      >
        <span>
          <strong>Avisos por correo</strong>
          <small>Los mensajes nuevos pueden generar una notificación por email.</small>
        </span>
        <input
          id="email-notifications"
          v-model="emailEnabled"
          type="checkbox"
          :disabled="preferences.saving"
          @change="saved = false"
        >
      </label>
      <p
        v-if="preferences.error"
        class="form-error"
        role="alert"
      >
        {{ preferences.error }}
      </p>
      <p
        v-if="saved"
        class="save-confirmation"
        role="status"
      >
        Preferencias guardadas.
      </p>
      <div class="preferences-actions">
        <button
          class="secondary-button"
          type="button"
          @click="router.push('/')"
        >
          Volver al chat
        </button>
        <button
          type="submit"
          :disabled="preferences.saving || !hasPreference"
        >
          {{ preferences.saving ? 'Guardando…' : 'Guardar preferencias' }}
        </button>
      </div>
    </form>
  </main>
</template>

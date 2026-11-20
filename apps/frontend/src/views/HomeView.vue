<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import UiState from '../components/UiState.vue'
import { useConversationsStore } from '../stores/conversations'
import { useSessionStore } from '../stores/session'
import { formatDateTime } from '../format-date'

const router = useRouter()
const session = useSessionStore()
const conversations = useConversationsStore()
const participantEmail = ref('')
const creating = ref(false)
const createError = ref('')
const signingOut = ref(false)
const signOutError = ref('')

onMounted(() => conversations.loadConversations())

const create = async () => {
  creating.value = true
  createError.value = ''
  try {
    const conversation = await conversations.createConversation(participantEmail.value)
    await router.push(`/conversations/${conversation.id}`)
  } catch (error) {
    createError.value = error instanceof Error ? error.message : 'No se pudo crear la conversación.'
  } finally {
    creating.value = false
  }
}

const signOut = async () => {
  signingOut.value = true
  signOutError.value = ''
  try {
    await session.logout()
    conversations.clear()
    await router.replace('/access')
  } catch (error) {
    signOutError.value = error instanceof Error ? error.message : 'No se pudo cerrar la sesión. Inténtalo de nuevo.'
  } finally {
    signingOut.value = false
  }
}

</script>

<template>
  <main>
    <header class="home-header">
      <div>
        <p class="eyebrow">
          CHAT YES/NO
        </p>
        <h1>Conversaciones</h1>
      </div>
      <button
        type="button"
        :disabled="signingOut"
        @click="signOut"
      >
        {{ signingOut ? 'Cerrando sesión…' : 'Cerrar sesión' }}
      </button>
    </header>
    <p
      v-if="session.user"
      class="welcome"
    >
      Sesión iniciada como {{ session.user.displayName }} ({{ session.user.email }})
    </p>
    <p
      v-if="signOutError"
      class="form-error"
      role="alert"
    >
      {{ signOutError }}
    </p>
    <p
      v-if="conversations.realtimeError"
      class="form-error"
      role="alert"
    >
      {{ conversations.realtimeError }}
    </p>

    <section
      class="create-conversation"
      aria-labelledby="create-title"
    >
      <h2 id="create-title">
        Nueva conversación
      </h2>
      <form
        class="inline-form"
        @submit.prevent="create"
      >
        <label
          class="visually-hidden"
          for="participant-email"
        >
          Correo de la otra persona
        </label>
        <input
          id="participant-email"
          v-model="participantEmail"
          type="email"
          autocomplete="email"
          placeholder="correo@ejemplo.com"
          maxlength="320"
          required
        >
        <button
          type="submit"
          :disabled="creating"
        >
          {{ creating ? 'Creando…' : 'Crear conversación' }}
        </button>
      </form>
      <p
        v-if="createError"
        class="form-error"
        role="alert"
      >
        {{ createError }}
      </p>
    </section>

    <section aria-labelledby="conversation-list-title">
      <h2 id="conversation-list-title">
        Tus chats
      </h2>
      <UiState
        v-if="conversations.loadingConversations"
        title="Cargando conversaciones…"
      />
      <div
        v-else-if="conversations.conversationsError"
        class="form-error"
        role="alert"
      >
        <p>{{ conversations.conversationsError }}</p>
        <button
          type="button"
          @click="conversations.loadConversations()"
        >
          Volver a intentar
        </button>
      </div>
      <UiState
        v-else-if="conversations.conversations.length === 0"
        title="Todavía no tienes chats"
        detail="Escribe el correo de otra persona para iniciar una conversación."
      />
      <ul
        v-else
        class="conversation-list"
      >
        <li
          v-for="conversation in conversations.conversations"
          :key="conversation.id"
        >
          <button
            class="conversation-link"
            type="button"
            @click="router.push(`/conversations/${conversation.id}`)"
          >
            <span class="conversation-title">Chat {{ conversation.id.slice(0, 8) }}</span>
            <span class="conversation-updated">Última actividad: {{ formatDateTime(conversation.updatedAt, 'medium') }}</span>
          </button>
        </li>
      </ul>
    </section>
  </main>
</template>

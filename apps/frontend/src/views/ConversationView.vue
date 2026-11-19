<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiState from '../components/UiState.vue'
import { useConversationsStore } from '../stores/conversations'
import { useSessionStore } from '../stores/session'
import { formatDateTime } from '../format-date'

const route = useRoute()
const router = useRouter()
const conversations = useConversationsStore()
const session = useSessionStore()
const content = ref('')
const sending = ref(false)
const sendError = ref('')
const conversationId = computed(() => String(route.params.conversationId))
const messages = computed(() => conversations.messagesFor(conversationId.value))
const loading = computed(() => conversations.loadingMessagesByConversation[conversationId.value] ?? false)
const loadError = computed(() => conversations.messageErrors[conversationId.value] ?? '')
const hasOlder = computed(() => conversations.hasOlderMessages(conversationId.value))

watch(conversationId, (id) => conversations.loadMessages(id), { immediate: true })

const send = async () => {
  const submittedContent = content.value.trim()
  if (!submittedContent || sending.value) return
  sending.value = true
  sendError.value = ''
  try {
    await conversations.sendMessage(conversationId.value, submittedContent)
    content.value = ''
  } catch (error) {
    sendError.value = error instanceof Error ? error.message : 'No se pudo enviar el mensaje.'
  } finally {
    sending.value = false
  }
}

</script>

<template>
  <main class="chat-page">
    <header class="chat-header">
      <button
        class="secondary-button"
        type="button"
        @click="router.push('/')"
      >
        ← Conversaciones
      </button>
      <h1>Chat {{ conversationId.slice(0, 8) }}</h1>
    </header>

    <section
      class="message-panel"
      aria-label="Mensajes"
    >
      <div class="message-tools">
        <button
          v-if="hasOlder"
          class="secondary-button"
          type="button"
          :disabled="loading"
          @click="conversations.loadMessages(conversationId, true)"
        >
          {{ loading ? 'Cargando…' : 'Cargar mensajes anteriores' }}
        </button>
      </div>

      <UiState
        v-if="loading && messages.length === 0"
        title="Cargando mensajes…"
      />
      <div
        v-else-if="loadError"
        class="form-error"
        role="alert"
      >
        <p>{{ loadError }}</p>
        <button
          type="button"
          @click="conversations.loadMessages(conversationId, messages.length > 0)"
        >
          Volver a intentar
        </button>
      </div>
      <UiState
        v-else-if="messages.length === 0"
        title="Todavía no hay mensajes"
        detail="Envía el primer mensaje para empezar la conversación."
      />
      <ol
        v-else
        class="message-list"
        aria-live="polite"
        aria-relevant="additions"
      >
        <li
          v-for="message in messages"
          :key="message.id"
          class="message-row"
          :class="{ 'message-row-own': message.authorId === session.user?.id }"
        >
          <article class="message-bubble">
            <p class="message-author">
              {{ message.authorId === session.user?.id ? 'Tú' : 'Otra persona' }}
            </p>
            <p class="message-content">
              {{ message.content }}
            </p>
            <time
              class="message-time"
              :datetime="message.createdAt"
            >
              {{ formatDateTime(message.createdAt) }}
            </time>
          </article>
        </li>
      </ol>
    </section>

    <form
      class="message-composer"
      @submit.prevent="send"
    >
      <label for="message-content">Escribe un mensaje</label>
      <textarea
        id="message-content"
        v-model="content"
        rows="3"
        maxlength="4000"
        placeholder="Escribe tu mensaje…"
        required
      />
      <p
        v-if="sendError"
        class="form-error"
        role="alert"
      >
        {{ sendError }}
      </p>
      <div class="composer-footer">
        <span>{{ content.length }}/4000</span>
        <button
          type="submit"
          :disabled="sending || !content.trim()"
        >
          {{ sending ? 'Enviando…' : 'Enviar mensaje' }}
        </button>
      </div>
    </form>
  </main>
</template>

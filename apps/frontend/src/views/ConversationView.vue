<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiState from '../components/UiState.vue'
import { useConversationsStore } from '../stores/conversations'
import { useSessionStore } from '../stores/session'
import { formatDateTime } from '../format-date'
import { useConversationRealtime } from '../composables/useConversationRealtime'
import { useAttachmentUpload } from '../composables/useAttachmentUpload'
import { useAttachmentDownload } from '../composables/useAttachmentDownload'

const route = useRoute()
const router = useRouter()
const conversations = useConversationsStore()
const session = useSessionStore()
const content = ref('')
const sending = ref(false)
const sendError = ref('')
const fileInput = ref()
const attachmentUpload = useAttachmentUpload()
const conversationId = computed(() => String(route.params.conversationId))
const attachmentDownload = useAttachmentDownload(conversationId)
const messages = computed(() => conversations.messagesFor(conversationId.value))
const loading = computed(() => conversations.loadingMessagesByConversation[conversationId.value] ?? false)
const loadError = computed(() => conversations.messageErrors[conversationId.value] ?? '')
const hasOlder = computed(() => conversations.hasOlderMessages(conversationId.value))
const messagePanel = ref()
const realtime = useConversationRealtime(conversationId)
const otherOnlineUsers = computed(() => realtime.onlineUsers.value.filter((userId) => userId !== session.user?.id))
const otherTypingUsers = computed(() => realtime.typingUsers.value.filter((userId) => userId !== session.user?.id))
const statusLabel = computed(() => ({
  connecting: 'Conectando…',
  syncing: 'Sincronizando…',
  connected: 'En línea',
  reconnecting: 'Reconectando…',
  forbidden: 'Sin acceso',
  closed: 'Desconectado',
}[realtime.state.value]))

watch(conversationId, async (id) => {
  await conversations.loadMessages(id)
  await nextTick()
  if (messagePanel.value) messagePanel.value.scrollTop = messagePanel.value.scrollHeight
}, { immediate: true })

watch(messages, async (_next, previous) => {
  const panel = messagePanel.value
  if (!panel || messages.value.length < (previous?.length ?? 0)) return
  const nearBottom = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 100
  if (nearBottom) {
    await nextTick()
    panel.scrollTop = panel.scrollHeight
  }
})

const loadOlder = async () => {
  const panel = messagePanel.value
  const oldHeight = panel?.scrollHeight ?? 0
  await conversations.loadMessages(conversationId.value, true)
  await nextTick()
  if (panel) panel.scrollTop += panel.scrollHeight - oldHeight
}

const selectAttachments = () => {
  const accepted = attachmentUpload.selectFiles(fileInput.value?.files ?? [])
  if (!accepted && fileInput.value) fileInput.value.value = ''
}

const send = async () => {
  const submittedContent = content.value.trim()
  if (!submittedContent || sending.value || attachmentUpload.uploading.value) return
  sending.value = true
  sendError.value = ''
  realtime.stopTyping()
  try {
    const staged = await attachmentUpload.uploadSelected(conversationId.value)
    const attachmentIds = staged?.map(({ attachment }) => attachment.id) ?? []
    await conversations.sendMessage(conversationId.value, submittedContent, attachmentIds)
    content.value = ''
    attachmentUpload.clear()
    if (fileInput.value) fileInput.value.value = ''
    await nextTick()
    if (messagePanel.value) messagePanel.value.scrollTop = messagePanel.value.scrollHeight
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
      <span
        class="connection-state"
        :data-state="realtime.state.value"
        aria-live="polite"
      >
        {{ statusLabel }}
      </span>
    </header>

    <section
      ref="messagePanel"
      class="message-panel"
      aria-label="Mensajes"
    >
      <div class="message-tools">
        <button
          v-if="hasOlder"
          class="secondary-button"
          type="button"
          :disabled="loading"
          @click="loadOlder"
        >
          {{ loading ? 'Cargando…' : 'Cargar mensajes anteriores' }}
        </button>
      </div>

      <UiState
        v-if="loading && messages.length === 0"
        title="Cargando mensajes…"
      />
      <div
        v-if="loadError"
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
        v-if="messages.length === 0 && !loading && !loadError"
        title="Todavía no hay mensajes"
        detail="Envía el primer mensaje para empezar la conversación."
      />
      <ol
        v-if="messages.length > 0"
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
            <ul
              v-if="message.attachments?.length"
              class="message-attachments"
              aria-label="Archivos adjuntos"
            >
              <li
                v-for="attachment in message.attachments"
                :key="attachment.id"
              >
                <span class="attachment-name">{{ attachment.originalName }}</span>
                <span class="attachment-size">{{ (attachment.size / 1024 / 1024).toFixed(2) }} MB</span>
                <button
                  class="link-button attachment-download"
                  type="button"
                  :disabled="attachmentDownload.downloadingId.value === attachment.id"
                  @click="attachmentDownload.download(attachment)"
                >
                  {{ attachmentDownload.downloadingId.value === attachment.id ? 'Descargando…' : 'Descargar' }}
                </button>
                <span
                  v-if="attachmentDownload.errors.value[attachment.id]"
                  class="attachment-error"
                  role="alert"
                >
                  {{ attachmentDownload.errors.value[attachment.id] }}
                </span>
              </li>
            </ul>
            <time
              class="message-time"
              :datetime="message.createdAt"
            >
              {{ formatDateTime(message.createdAt) }}
            </time>
          </article>
        </li>
      </ol>
      <p
        v-if="realtime.syncError"
        class="inline-error"
        role="status"
      >
        La conexión está activa; se reintentará sincronizar: {{ realtime.syncError }}
      </p>
      <p
        v-if="otherOnlineUsers.length"
        class="presence-line"
        role="status"
      >
        {{ otherOnlineUsers.length === 1 ? 'Otra persona está conectada' : `${otherOnlineUsers.length} personas conectadas` }}
      </p>
      <p
        v-if="otherTypingUsers.length"
        class="typing-line"
        role="status"
      >
        {{ otherTypingUsers.length === 1 ? 'Otra persona está escribiendo…' : 'Hay personas escribiendo…' }}
      </p>
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
        @input="realtime.noteTyping"
        @blur="realtime.stopTyping"
        @keydown.enter.exact.prevent="send"
      />
      <div class="attachment-picker">
        <label for="message-attachments">Adjuntar archivos (JPEG, PNG, WebP o PDF; máximo 10 MB cada uno)</label>
        <input
          id="message-attachments"
          ref="fileInput"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          multiple
          :disabled="sending || attachmentUpload.uploading.value"
          @change="selectAttachments"
        >
        <ul
          v-if="attachmentUpload.selectedFiles.value.length"
          class="selected-attachments"
        >
          <li
            v-for="file in attachmentUpload.selectedFiles.value"
            :key="`${file.name}-${file.lastModified}`"
          >
            {{ file.name }} · {{ (file.size / 1024 / 1024).toFixed(2) }} MB
          </li>
        </ul>
        <p
          v-if="attachmentUpload.progress.value"
          class="upload-progress"
          role="status"
        >
          {{ attachmentUpload.progress.value }}
        </p>
        <p
          v-if="attachmentUpload.error.value"
          class="form-error"
          role="alert"
        >
          {{ attachmentUpload.error.value }}
        </p>
      </div>
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
          :disabled="sending || attachmentUpload.uploading.value || !content.trim()"
        >
          {{ attachmentUpload.uploading.value ? 'Subiendo adjuntos…' : sending ? 'Enviando…' : 'Enviar mensaje' }}
        </button>
      </div>
    </form>
  </main>
</template>

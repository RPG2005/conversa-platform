import { computed, onUnmounted, ref, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import type { RealtimeConnectionState } from '../contracts/realtime'
import { useConversationsStore } from '../stores/conversations'
import { ConversationRealtimeClient } from '../services/realtime'

export const useConversationRealtime = (conversationId: Ref<string>) => {
  const router = useRouter()
  const conversations = useConversationsStore()
  const state = ref<RealtimeConnectionState>('connecting')
  const syncError = ref('')
  let client: ConversationRealtimeClient | null = null
  let typingTimer: ReturnType<typeof setTimeout> | undefined
  let expiryTimer: ReturnType<typeof setInterval> | undefined
  let typingActive = false

  const onlineUsers = computed(() => Object.entries(conversations.presenceFor(conversationId.value))
    .filter(([, presence]) => presence.online)
    .map(([userId]) => userId))
  const typingUsers = computed(() => Object.entries(conversations.typingFor(conversationId.value))
    .filter(([, typing]) => typing.active)
    .map(([userId]) => userId))

  const stopTyping = () => {
    if (typingTimer) clearTimeout(typingTimer)
    typingTimer = undefined
    if (typingActive) client?.send({ type: 'typing.stopped' })
    typingActive = false
  }

  const noteTyping = () => {
    if (!typingActive) {
      typingActive = client?.send({ type: 'typing.started' }) ?? false
    }
    if (typingTimer) clearTimeout(typingTimer)
    typingTimer = setTimeout(stopTyping, 1_500)
  }

  watch(conversationId, (id, _previous, onCleanup) => {
    conversations.clearRealtimeError()
    syncError.value = ''
    client = new ConversationRealtimeClient(id, {
      onEvent: (event) => conversations.applyRealtimeEvent(event),
      onStatus: (nextState) => {
        state.value = nextState
        if (nextState === 'reconnecting' || nextState === 'connecting') typingActive = false
      },
      onSync: async () => {
        await conversations.syncMessages(id)
        syncError.value = ''
      },
      onSyncError: (error) => {
        syncError.value = error instanceof Error ? error.message : 'No se pudo sincronizar el chat.'
      },
      onForbidden: () => {
        conversations.realtimeError = 'No se pudo abrir esta conversación. Comprueba que tienes acceso.'
        void router.replace('/')
      },
    })
    client.start()
    expiryTimer = setInterval(() => conversations.expireRealtimeState(id), 1_000)
    onCleanup(() => {
      stopTyping()
      if (expiryTimer) clearInterval(expiryTimer)
      expiryTimer = undefined
      client?.stop()
      client = null
    })
  }, { immediate: true })

  onUnmounted(() => stopTyping())

  return { state, syncError, onlineUsers, typingUsers, noteTyping, stopTyping }
}

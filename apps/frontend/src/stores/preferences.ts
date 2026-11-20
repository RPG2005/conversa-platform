import { defineStore } from 'pinia'
import type { NotificationPreference } from '../contracts/attachments'
import * as preferencesApi from '../services/preferences'

export const usePreferencesStore = defineStore('preferences', {
  state: () => ({
    notification: null as NotificationPreference | null,
    loading: false,
    saving: false,
    error: '',
  }),
  actions: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        const response = await preferencesApi.getNotificationPreference()
        this.notification = response.notification
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'No se pudieron cargar las preferencias.'
      } finally {
        this.loading = false
      }
    },
    async save(emailEnabled: boolean) {
      this.saving = true
      this.error = ''
      try {
        const response = await preferencesApi.updateNotificationPreference(emailEnabled)
        this.notification = response.notification
        return true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'No se pudieron guardar las preferencias.'
        return false
      } finally {
        this.saving = false
      }
    },
    clear() {
      this.notification = null
      this.error = ''
    },
  },
})

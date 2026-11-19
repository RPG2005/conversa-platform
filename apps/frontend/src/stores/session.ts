import { defineStore } from 'pinia'
import { HttpError, request } from '../services/http'

interface User { id: string; email: string; displayName: string }

export const useSessionStore = defineStore('session', {
  state: () => ({ user: null as User | null, loading: false, initialized: false, restoreError: '' }),
  getters: { authenticated: (state) => state.user !== null },
  actions: {
    async restore() {
      if (this.initialized) return
      this.loading = true
      this.restoreError = ''
      try {
        const response = await request<{ user: User }>('/auth/me')
        this.user = response.user
      } catch (error) {
        this.user = null
        if (!(error instanceof HttpError) || error.status !== 401) {
          this.restoreError = error instanceof Error ? error.message : 'No se pudo comprobar la sesión.'
        }
      } finally {
        this.loading = false
        this.initialized = true
      }
    },
    async login(email: string, password: string) {
      const response = await request<{ user: User }>('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      this.user = response.user
      this.initialized = true
      this.restoreError = ''
    },
    async register(email: string, displayName: string, password: string) {
      const response = await request<{ user: User }>('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, displayName, password }) })
      this.user = response.user
      this.initialized = true
      this.restoreError = ''
    },
    async logout() {
      try {
        await request<void>('/auth/logout', { method: 'POST' })
      } catch (error) {
        if (!(error instanceof HttpError) || error.status !== 401) throw error
      }
      this.user = null
      this.initialized = true
      this.restoreError = ''
    },
    clear() { this.user = null; this.initialized = true; this.restoreError = '' },
  },
})

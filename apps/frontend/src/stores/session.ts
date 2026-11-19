import { defineStore } from 'pinia'
export const useSessionStore = defineStore('session', { state: () => ({ authenticated: false }), actions: { markAuthenticated() { this.authenticated = true }, clear() { this.authenticated = false } } })

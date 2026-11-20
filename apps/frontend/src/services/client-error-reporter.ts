import type { App } from 'vue'

export type ClientErrorSource = 'vue' | 'window' | 'unhandled-rejection'

const safeErrorNames = new Set([
  'Error',
  'TypeError',
  'ReferenceError',
  'RangeError',
  'SyntaxError',
  'URIError',
  'EvalError',
])

export const reportClientError = (error: unknown, source: ClientErrorSource) => {
  const name = error instanceof Error && safeErrorNames.has(error.name) ? error.name : 'UnknownError'
  console.error('[client-error]', { name, source, occurredAt: new Date().toISOString() })
}

export const installClientErrorReporting = (app: App) => {
  app.config.errorHandler = (error) => reportClientError(error, 'vue')
  const onWindowError = (event: ErrorEvent) => {
    reportClientError(event.error, 'window')
    event.preventDefault()
  }
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportClientError(event.reason, 'unhandled-rejection')
    event.preventDefault()
  }
  window.addEventListener('error', onWindowError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)
  return () => {
    window.removeEventListener('error', onWindowError)
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
  }
}

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'
import { installClientErrorReporting, reportClientError } from './client-error-reporter'

afterEach(() => vi.restoreAllMocks())

describe('client error reporting', () => {
  it('records only safe error metadata, never the error message or stack', () => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {})
    const sensitiveMessage = 'chat body chat_session=secret https://storage/file?X-Amz-Signature=signed'
    const error = new TypeError(sensitiveMessage)

    reportClientError(error, 'vue')

    const report = JSON.stringify(logger.mock.calls[0])
    expect(report).toContain('TypeError')
    expect(report).not.toContain(sensitiveMessage)
    expect(report).not.toContain('chat_session')
    expect(report).not.toContain('X-Amz-Signature')
    expect(report).not.toContain(error.stack)
  })

  it('uses a safe generic label for unrecognized error names', () => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('private details')
    error.name = 'chat_session=secret'

    reportClientError(error, 'unhandled-rejection')

    expect(logger.mock.calls[0]).toEqual(['[client-error]', expect.objectContaining({
      name: 'UnknownError', source: 'unhandled-rejection',
    })])
    expect(JSON.stringify(logger.mock.calls[0])).not.toContain('private details')
  })

  it('captures global errors without allowing the browser to print their private details', () => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createApp({})
    const uninstall = installClientErrorReporting(app)
    const globalError = new ErrorEvent('error', {
      error: new Error('private message and session secret'),
      cancelable: true,
    })

    window.dispatchEvent(globalError)
    uninstall()

    expect(globalError.defaultPrevented).toBe(true)
    expect(JSON.stringify(logger.mock.calls)).not.toContain('private message')
    expect(JSON.stringify(logger.mock.calls)).not.toContain('session secret')
  })
})

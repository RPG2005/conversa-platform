import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`
const password = 'e2e-Password-123!'

const expectAccessible = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations.map(({ id, impact }) => `${id}:${impact}`)).toEqual([])
}

const register = async (page: Page, email: string, displayName: string, useKeyboard = false) => {
  await page.goto('/access')
  await page.getByRole('button', { name: 'Regístrate' }).click()
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Nombre visible').fill(displayName)
  await page.getByLabel('Contraseña').fill(password)
  const submit = page.getByRole('button', { name: 'Crear cuenta' })
  if (useKeyboard) {
    await page.getByLabel('Correo electrónico').focus()
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Nombre visible')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Contraseña')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(submit).toBeFocused()
    await submit.focus()
    await page.keyboard.press('Enter')
  } else {
    await submit.click()
  }
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText(`Sesión iniciada como ${displayName}`)).toBeVisible()
}

test('two registered users exchange a realtime message and the main view passes accessibility checks', async ({ browser }) => {
  test.setTimeout(90_000)
  const adaContext = await browser.newContext()
  const bobContext = await browser.newContext()
  const adaPage = await adaContext.newPage()
  const bobPage = await bobContext.newPage()

  try {
    const adaEmail = `ada+${runId}@example.test`
    const bobEmail = `bob+${runId}@example.test`
    await register(adaPage, adaEmail, 'Ada', true)
    await expectAccessible(adaPage)
    await register(bobPage, bobEmail, 'Bob')

    await adaPage.getByLabel('Correo de la otra persona').fill(bobEmail)
    await adaPage.getByRole('button', { name: 'Crear conversación' }).click()
    await expect(adaPage).toHaveURL(/\/conversations\/[0-9a-f-]+$/i)
    const conversationPath = new URL(adaPage.url()).pathname

    await bobPage.goto(conversationPath)
    await expect(adaPage.locator('.connection-state')).toHaveAttribute('data-state', 'connected', { timeout: 15_000 })
    await expect(bobPage.locator('.connection-state')).toHaveAttribute('data-state', 'connected', { timeout: 15_000 })
    await expectAccessible(adaPage)

    const message = `mensaje E2E ${runId}`
    await adaPage.getByLabel('Escribe un mensaje').fill(message)
    await adaPage.getByRole('button', { name: 'Enviar mensaje' }).click()
    await expect(adaPage.getByText(message)).toBeVisible()
    await expect(bobPage.getByText(message)).toBeVisible({ timeout: 15_000 })
  } finally {
    await Promise.all([adaContext.close(), bobContext.close()])
  }
})

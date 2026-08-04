import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Limpiar después de cada prueba
afterEach(() => {
  cleanup()
})

// Mock de crypto.randomUUID para pruebas
if (!window.crypto) {
  window.crypto = { randomUUID: () => Math.random().toString(36).substring(2) }
}
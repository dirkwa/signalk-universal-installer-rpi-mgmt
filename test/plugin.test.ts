import { describe, expect, it, vi } from 'vitest'
import type { PluginRouter, ServerAPI } from '@signalk/server-api'
import rpiManager from '../src/index.js'

vi.mock('../src/model.js', () => ({
  readSystemInfo: () =>
    Promise.resolve({ model: 'Raspberry Pi 5 Model B Rev 1.0', isRaspberryPi: true })
}))

type Handler = (req: unknown, res: { json: (body: unknown) => void }) => void

function fakeApp() {
  const setPluginStatus = vi.fn()
  return { app: { setPluginStatus } as unknown as ServerAPI, setPluginStatus }
}

describe('RPI Manager plugin', () => {
  it('starts without configuration and reports the model', async () => {
    const { app, setPluginStatus } = fakeApp()
    const plugin = rpiManager(app)
    plugin.start({}, () => undefined)
    await vi.waitFor(() => {
      expect(setPluginStatus).toHaveBeenCalledWith('Raspberry Pi 5 Model B Rev 1.0')
    })
  })

  it('answers /system with what it read', async () => {
    const { app, setPluginStatus } = fakeApp()
    const plugin = rpiManager(app)
    const routes = new Map<string, Handler>()
    plugin.registerWithRouter?.({
      get: (path: string, handler: Handler) => {
        routes.set(path, handler)
      }
    } as unknown as PluginRouter)
    plugin.start({}, () => undefined)
    await vi.waitFor(() => {
      expect(setPluginStatus).toHaveBeenCalled()
    })
    const json = vi.fn()
    routes.get('/system')?.({}, { json })
    expect(json).toHaveBeenCalledWith({
      model: 'Raspberry Pi 5 Model B Rev 1.0',
      isRaspberryPi: true
    })
  })

  it('has an object schema', () => {
    const plugin = rpiManager(fakeApp().app)
    const schema: unknown = typeof plugin.schema === 'function' ? plugin.schema() : plugin.schema
    expect(schema).toMatchObject({ type: 'object' })
  })
})

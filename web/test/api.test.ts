import { afterEach, describe, expect, it, vi } from 'vitest'
import { runPowerAction } from '../src/api.js'

function answer(status: number, body = ''): Response {
  return new Response(body, { status })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('runPowerAction', () => {
  it('counts a gateway error from a server going down as done', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer(502)))
    await expect(runPowerAction('reboot')).resolves.toBeUndefined()
  })

  it('counts a dropped connection as done', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(runPowerAction('poweroff')).resolves.toBeUndefined()
  })

  it('reports a refusal', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer(409, 'power units not set up')))
    await expect(runPowerAction('reboot')).rejects.toThrow('power units not set up')
  })

  it("restarts through Signal K's own restart when the Updater does not answer", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(answer(404)).mockResolvedValueOnce(answer(200))
    vi.stubGlobal('fetch', fetch)
    await runPowerAction('restart')
    expect(fetch).toHaveBeenLastCalledWith(
      '/skServer/restart',
      expect.objectContaining({ method: 'PUT' })
    )
  })
})

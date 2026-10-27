import { lstat, readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const ICON = new URL('../static/icon.svg', import.meta.url)

describe('app icon', () => {
  it('is a real SVG file, not a symlink', async () => {
    expect((await lstat(ICON)).isFile()).toBe(true)
    expect(await readFile(ICON, 'utf8')).toMatch(/^<svg[\s>]/)
  })
})

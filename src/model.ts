import { readFile } from 'node:fs/promises'

export interface SystemInfo {
  model: string | null
  isRaspberryPi: boolean
}

// Raspberry Pi kernels name the board in /proc/cpuinfo. The device tree is the
// usual source, but podman masks /sys/firmware (and so /proc/device-tree)
// inside the container the Universal Installer runs Signal K in.
const MODEL_SOURCES = ['/proc/cpuinfo', '/proc/device-tree/model'] as const

export function parseModel(source: string, text: string): string | null {
  if (source === '/proc/cpuinfo') {
    const match = /^Model[ \t]*:[ \t]*(.+)$/m.exec(text)
    return match?.[1]?.trim() || null
  }
  return text.replace(/\0/g, '').trim() || null
}

export async function readSystemInfo(
  read: (path: string) => Promise<string> = (path) => readFile(path, 'utf8')
): Promise<SystemInfo> {
  for (const source of MODEL_SOURCES) {
    try {
      const model = parseModel(source, await read(source))
      if (model) return { model, isRaspberryPi: model.startsWith('Raspberry Pi') }
    } catch {
      // not readable on this host; try the next source
    }
  }
  return { model: null, isRaspberryPi: false }
}

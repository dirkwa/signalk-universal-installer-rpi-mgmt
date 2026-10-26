import { describe, expect, it } from 'vitest'
import { parseModel, readSystemInfo } from '../src/model.js'

const PI5_CPUINFO = `processor\t: 3
BogoMIPS\t: 108.00
Features\t: fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp cpuid asimdrdm lrcpc dcpop asimddp
CPU implementer\t: 0x41

Revision\t: d04170
Serial\t\t: 1234567890abcdef
Model\t\t: Raspberry Pi 5 Model B Rev 1.0
`

function reader(files: Record<string, string>) {
  return (path: string): Promise<string> => {
    const text = files[path]
    return text === undefined ? Promise.reject(new Error('ENOENT')) : Promise.resolve(text)
  }
}

describe('parseModel', () => {
  it('reads the Model line of /proc/cpuinfo', () => {
    expect(parseModel('/proc/cpuinfo', PI5_CPUINFO)).toBe('Raspberry Pi 5 Model B Rev 1.0')
  })

  it('finds nothing in a cpuinfo without a Model line', () => {
    expect(parseModel('/proc/cpuinfo', 'processor\t: 0\nmodel name\t: Intel(R) Core(TM)\n')).toBe(
      null
    )
  })

  it('strips the NUL terminator of the device tree model', () => {
    expect(parseModel('/proc/device-tree/model', 'Raspberry Pi 4 Model B Rev 1.4\0')).toBe(
      'Raspberry Pi 4 Model B Rev 1.4'
    )
  })
})

describe('readSystemInfo', () => {
  it('recognises a Raspberry Pi from /proc/cpuinfo', async () => {
    expect(await readSystemInfo(reader({ '/proc/cpuinfo': PI5_CPUINFO }))).toEqual({
      model: 'Raspberry Pi 5 Model B Rev 1.0',
      isRaspberryPi: true
    })
  })

  it('falls back to the device tree', async () => {
    const info = await readSystemInfo(
      reader({
        '/proc/cpuinfo': 'processor\t: 0\n',
        '/proc/device-tree/model': 'Hardkernel ODROID-M1\0'
      })
    )
    expect(info).toEqual({ model: 'Hardkernel ODROID-M1', isRaspberryPi: false })
  })

  it('reports no model when neither source can be read', async () => {
    expect(await readSystemInfo(reader({}))).toEqual({ model: null, isRaspberryPi: false })
  })
})

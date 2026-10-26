import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../src/store.js'

const initial = useStore.getState()

beforeEach(() => {
  useStore.setState(initial, true)
})

describe('receive', () => {
  it('keeps values under the prefix, relative to it', () => {
    useStore.getState().receive(
      'environment.rpi',
      [
        { path: 'environment.rpi.cpu.temperature', value: 320 },
        { path: 'environment.other.cpu.temperature', value: 1 }
      ],
      10_000
    )
    expect(useStore.getState().values).toEqual({ 'cpu.temperature': 320 })
  })

  it('adds a live chart sample at most every five seconds', () => {
    const { receive } = useStore.getState()
    const value = [{ path: 'environment.rpi.cpu.utilisation', value: 0.5 }]
    receive('environment.rpi', value, 10_000)
    receive('environment.rpi', value, 12_000)
    receive('environment.rpi', value, 15_000)
    const live = useStore.getState().live
    expect(live.times).toEqual([10, 15])
    expect(live.columns[1]).toEqual([50, 50])
  })
})

describe('setRange', () => {
  it('keeps the loaded history when the same range is picked again', () => {
    const history = { times: [1], columns: [[1], [2], [3], [4]] }
    useStore.setState({ range: '24h', history })
    useStore.getState().setRange('24h')
    expect(useStore.getState().history).toBe(history)
    useStore.getState().setRange('7d')
    expect(useStore.getState().history).toBeNull()
  })
})

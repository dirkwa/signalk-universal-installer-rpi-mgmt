import { describe, expect, it } from 'vitest'
import type { ValuesResponse } from '@signalk/server-api/history'
import {
  appendSample,
  emptySeries,
  historyQuery,
  RANGES,
  seriesFromHistory
} from '../src/history.js'

describe('historyQuery', () => {
  it('asks for the averages of the charted paths under the prefix', () => {
    const day = RANGES.find((r) => r.id === '24h')
    if (!day) throw new Error('no 24h range')
    const url = new URL(historyQuery('environment.rpi', day), 'http://sk')
    expect(url.pathname).toBe('/signalk/v2/api/history/values')
    expect(url.searchParams.get('paths')).toBe(
      'environment.rpi.cpu.temperature:average,environment.rpi.cpu.utilisation:average,' +
        'environment.rpi.memory.utilisation:average,environment.rpi.storage.utilisation:average'
    )
    expect(url.searchParams.get('duration')).toBe('86400')
    expect(url.searchParams.get('resolution')).toBe('240')
  })
})

describe('seriesFromHistory', () => {
  it('converts rows to chart units and keeps gaps', () => {
    const response = {
      context: 'vessels.self',
      range: { from: '2026-10-26T10:00:00Z', to: '2026-10-26T10:01:00Z' },
      values: [
        { path: 'environment.rpi.cpu.temperature', method: 'average' },
        { path: 'environment.rpi.cpu.utilisation', method: 'average' },
        { path: 'environment.rpi.memory.utilisation', method: 'average' },
        { path: 'environment.rpi.storage.utilisation', method: 'average' }
      ],
      data: [
        ['2026-10-26T10:00:00Z', 323.15, 0.25, 0.5, null],
        ['2026-10-26T10:00:30Z', null, 0.5, 0.5, 0.75]
      ]
    } as unknown as ValuesResponse
    const series = seriesFromHistory(response, 'environment.rpi')
    expect(series.times).toEqual([
      Date.parse('2026-10-26T10:00:00Z') / 1000,
      Date.parse('2026-10-26T10:00:30Z') / 1000
    ])
    expect(series.columns[0]?.[0]).toBeCloseTo(50)
    expect(series.columns[0]?.[1]).toBeNull()
    expect(series.columns[1]).toEqual([25, 50])
    expect(series.columns[3]).toEqual([null, 75])
  })
})

describe('seriesFromHistory with a missing path', () => {
  it('matches columns by path, not by position', () => {
    const response = {
      context: 'vessels.self',
      range: { from: '2026-10-26T10:00:00Z', to: '2026-10-26T10:01:00Z' },
      values: [
        { path: 'environment.rpi.storage.utilisation', method: 'average' },
        { path: 'environment.rpi.cpu.temperature', method: 'average' }
      ],
      data: [['2026-10-26T10:00:00Z', 0.75, 323.15]]
    } as unknown as ValuesResponse
    const series = seriesFromHistory(response, 'environment.rpi')
    expect(series.columns[0]?.[0]).toBeCloseTo(50)
    expect(series.columns[1]).toEqual([null])
    expect(series.columns[2]).toEqual([null])
    expect(series.columns[3]).toEqual([75])
  })
})

describe('appendSample', () => {
  it('drops samples older than the window', () => {
    let data = emptySeries()
    data = appendSample(data, 100, [300, 0.1, 0.2, 0.3], 60)
    data = appendSample(data, 150, [301, 0.1, 0.2, 0.3], 60)
    data = appendSample(data, 200, [302, undefined, 0.2, 0.3], 60)
    expect(data.times).toEqual([150, 200])
    expect(data.columns[1]).toEqual([10, null])
  })
})

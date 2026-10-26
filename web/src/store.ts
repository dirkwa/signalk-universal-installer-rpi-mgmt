import { create } from 'zustand'
import type { Access, PowerAction, StatsPlugin, SystemInfo } from './api.js'
import { appendSample, emptySeries, RANGES, type RangeId, type SeriesData } from './history.js'
import { CHART_SERIES, STAT } from './metrics.js'
import type { Connection, StreamValue } from './stream.js'

export type Values = Record<string, unknown>

export type ActionPhase =
  | { phase: 'idle' }
  | { phase: 'confirm'; action: PowerAction }
  | { phase: 'running'; action: PowerAction }
  | { phase: 'waiting'; action: PowerAction }
  | { phase: 'off' }
  | { phase: 'error'; action: PowerAction; message: string }
  | { phase: 'unconfirmed'; action: PowerAction }

// The live chart samples at most this often, whatever rate the stats plugin
// publishes at.
const LIVE_SAMPLE_MS = 5000
const LIVE_WINDOW_S = RANGES[0]?.seconds ?? 1800

interface State {
  access: Access | null
  stats: StatsPlugin | null
  system: SystemInfo | null
  hostPower: boolean | null
  hasHistory: boolean
  connection: Connection
  // Values relative to the stats prefix, as published (SI units, ratios).
  values: Values
  lastValueAt: number | null
  live: SeriesData
  lastSampleAt: number
  range: RangeId
  history: SeriesData | null
  historyError: string | null
  action: ActionPhase

  setLoaded: (
    loaded: Partial<Pick<State, 'access' | 'stats' | 'system' | 'hostPower' | 'hasHistory'>>
  ) => void
  setConnection: (connection: Connection) => void
  receive: (prefix: string, values: StreamValue[], now?: number) => void
  setRange: (range: RangeId) => void
  setHistory: (history: SeriesData | null, error?: string | null) => void
  setAction: (action: ActionPhase) => void
}

export const useStore = create<State>()((set) => ({
  access: null,
  stats: null,
  system: null,
  hostPower: null,
  hasHistory: false,
  connection: 'connecting',
  values: {},
  lastValueAt: null,
  live: emptySeries(),
  lastSampleAt: 0,
  range: 'live',
  history: null,
  historyError: null,
  action: { phase: 'idle' },

  setLoaded: (loaded) => {
    set(loaded)
  },
  setConnection: (connection) => {
    set({ connection })
  },
  receive: (prefix, incoming, now = Date.now()) => {
    set((state) => {
      const values = { ...state.values }
      const head = `${prefix}.`
      let touched = false
      for (const { path, value } of incoming) {
        if (!path.startsWith(head)) continue
        values[path.slice(head.length)] = value
        touched = true
      }
      if (!touched) return {}
      if (now - state.lastSampleAt < LIVE_SAMPLE_MS) return { values, lastValueAt: now }
      const sample = CHART_SERIES.map((s) => {
        const v = values[STAT[s.key]]
        return typeof v === 'number' ? v : undefined
      })
      return {
        values,
        lastValueAt: now,
        lastSampleAt: now,
        live: appendSample(state.live, now / 1000, sample, LIVE_WINDOW_S)
      }
    })
  },
  setRange: (range) => {
    set((s) => (s.range === range ? s : { range, history: null, historyError: null }))
  },
  setHistory: (history, error = null) => {
    set({ history, historyError: error })
  },
  setAction: (action) => {
    set({ action })
  }
}))

export function numberValue(values: Values, path: string): number | undefined {
  const v = values[path]
  return typeof v === 'number' ? v : undefined
}

export function booleanValue(values: Values, path: string): boolean | undefined {
  const v = values[path]
  return typeof v === 'boolean' ? v : undefined
}

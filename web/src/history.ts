import type { ValuesResponse } from '@signalk/server-api/history'
import { CHART_SERIES, STAT } from './metrics.js'

export type RangeId = 'live' | '1h' | '24h' | '7d'

export interface Range {
  id: RangeId
  label: string
  seconds: number
}

export const RANGES: readonly Range[] = [
  { id: 'live', label: 'Live', seconds: 30 * 60 },
  { id: '1h', label: '1 hour', seconds: 3600 },
  { id: '24h', label: '24 hours', seconds: 86400 },
  { id: '7d', label: '7 days', seconds: 7 * 86400 }
]

// Enough points to draw a smooth line on a wide screen without asking the
// provider for more rows than the Pi needs to serve.
const POINTS_PER_CHART = 360

// One time axis (unix seconds) and one column per chart series, in the
// order of CHART_SERIES; the shape uPlot draws.
export interface SeriesData {
  times: number[]
  columns: (number | null)[][]
}

export function emptySeries(): SeriesData {
  return { times: [], columns: CHART_SERIES.map(() => []) }
}

export function historyQuery(prefix: string, range: Range): string {
  const paths = CHART_SERIES.map((s) => `${prefix}.${STAT[s.key]}:average`).join(',')
  const resolution = Math.max(1, Math.round(range.seconds / POINTS_PER_CHART))
  const params = new URLSearchParams({
    paths,
    duration: String(range.seconds),
    resolution: String(resolution)
  })
  return `/signalk/v2/api/history/values?${params.toString()}`
}

// Columns are matched by path, since a provider may leave out a path it never
// recorded.
export function seriesFromHistory(response: ValuesResponse, prefix: string): SeriesData {
  const data = emptySeries()
  const columnOf = CHART_SERIES.map((series) =>
    response.values.findIndex((v) => v.path === `${prefix}.${STAT[series.key]}`)
  )
  for (const row of response.data) {
    const time = Date.parse(row[0]) / 1000
    if (Number.isNaN(time)) continue
    data.times.push(time)
    CHART_SERIES.forEach((series, i) => {
      const column = columnOf[i] ?? -1
      const value = column < 0 ? null : row[column + 1]
      data.columns[i]?.push(typeof value === 'number' ? series.toDisplay(value) : null)
    })
  }
  return data
}

// Appends one live sample and drops what has scrolled out of the window.
export function appendSample(
  data: SeriesData,
  time: number,
  values: (number | undefined)[],
  windowSeconds: number
): SeriesData {
  const cutoff = time - windowSeconds
  let start = 0
  while (start < data.times.length && (data.times[start] ?? 0) < cutoff) start++
  return {
    times: [...data.times.slice(start), time],
    columns: CHART_SERIES.map((series, i) => {
      const value = values[i]
      return [
        ...(data.columns[i] ?? []).slice(start),
        value === undefined ? null : series.toDisplay(value)
      ]
    })
  }
}

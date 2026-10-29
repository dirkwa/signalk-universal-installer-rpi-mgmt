import { useEffect, useRef } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { fetchHistory } from '../api.js'
import { historyQuery, RANGES, seriesFromHistory, type SeriesData } from '../history.js'
import { CHART_SERIES, type ChartSeries } from '../metrics.js'
import { useStore } from '../store.js'

const CHART_HEIGHT = 160

export function Charts({ prefix }: { prefix: string }) {
  const range = useStore((s) => s.range)
  const hasHistory = useStore((s) => s.hasHistory)
  const live = useStore((s) => s.live)
  const history = useStore((s) => s.history)
  const historyError = useStore((s) => s.historyError)
  const setRange = useStore((s) => s.setRange)
  const setHistory = useStore((s) => s.setHistory)

  useEffect(() => {
    const selected = RANGES.find((r) => r.id === range)
    if (!selected || selected.id === 'live') return
    let cancelled = false
    fetchHistory(historyQuery(prefix, selected))
      .then((response) => {
        if (!cancelled) setHistory(seriesFromHistory(response, prefix))
      })
      .catch((err: unknown) => {
        if (!cancelled) setHistory(null, err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [prefix, range, setHistory])

  const data = range === 'live' ? live : history
  const windowSeconds = RANGES.find((r) => r.id === range)?.seconds ?? 0
  const ranges = hasHistory ? RANGES : RANGES.filter((r) => r.id === 'live')

  return (
    <section className="charts" aria-label="History">
      <div className="range-picker" role="group" aria-label="Time range">
        {ranges.map((r) => (
          <button
            key={r.id}
            type="button"
            className={r.id === range ? 'selected' : ''}
            onClick={() => {
              setRange(r.id)
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
      {!hasHistory && (
        <p className="hint">
          Showing the last 30 minutes since this page opened. Install the history plugin{' '}
          <a href="/admin/#/apps/store/plugin/signalk-questdb" target="_top">
            QuestDB
          </a>{' '}
          to see hours and days.
        </p>
      )}
      {historyError && <p className="hint error">Could not load the history: {historyError}</p>}
      <div className="chart-grid">
        {CHART_SERIES.map((series, i) => (
          <Chart
            key={series.key}
            series={series}
            data={data}
            column={i}
            windowSeconds={windowSeconds}
          />
        ))}
      </div>
    </section>
  )
}

function Chart({
  series,
  data,
  column,
  windowSeconds
}: {
  series: ChartSeries
  data: SeriesData | null
  column: number
  windowSeconds: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const plot = useRef<uPlot | null>(null)
  // Read by the x scale on every redraw, so the chart is created only once.
  const span = useRef({ seconds: windowSeconds, end: 0 })

  useEffect(() => {
    const el = box.current
    if (!el) return
    const style = getComputedStyle(el)
    const color = style.getPropertyValue('--chart-line').trim()
    const grid = style.getPropertyValue('--chart-grid').trim()
    const axis = { stroke: style.color, grid: { stroke: grid }, ticks: { stroke: grid } }
    plot.current = new uPlot(
      {
        width: el.clientWidth,
        height: CHART_HEIGHT,
        legend: { show: false },
        cursor: { drag: { x: false, y: false } },
        scales: {
          // Always the whole time range, so a page opened a minute ago does
          // not stretch its first samples across the chart.
          x: {
            time: true,
            range: () => [span.current.end - span.current.seconds, span.current.end]
          },
          ...(series.unit === '%' ? { y: { range: [0, 100] } } : {})
        },
        axes: [axis, { ...axis, size: 48 }],
        series: [{}, { label: series.label, stroke: color, width: 2, spanGaps: false }]
      },
      [[], []],
      el
    )
    const resize = new ResizeObserver(() => {
      plot.current?.setSize({ width: el.clientWidth, height: CHART_HEIGHT })
    })
    resize.observe(el)
    return () => {
      resize.disconnect()
      plot.current?.destroy()
      plot.current = null
    }
  }, [series])

  useEffect(() => {
    // The axis ends now, so a provider that stopped recording shows as a gap.
    span.current = { seconds: windowSeconds, end: Date.now() / 1000 }
    plot.current?.setData([data?.times ?? [], data?.columns[column] ?? []])
  }, [data, column, windowSeconds])

  const latest = data?.columns[column]?.findLast((v) => v !== null)
  return (
    <figure className="chart">
      <figcaption>
        {series.label}
        <span className="chart-latest">
          {latest === undefined ? '' : `${latest.toFixed(1)} ${series.unit}`}
        </span>
      </figcaption>
      <div ref={box} className="chart-box" />
    </figure>
  )
}

import {
  fillLevel,
  formatBytes,
  formatCelsius,
  formatDuration,
  formatFrequency,
  formatPercent,
  formatVolts,
  temperatureLevel,
  type Level
} from '../format.js'
import { CORE_PATH, STAT } from '../metrics.js'
import { booleanValue, numberValue, useStore } from '../store.js'

export function PowerWarning() {
  const values = useStore((s) => s.values)
  const underVoltage = booleanValue(values, STAT.underVoltage)
  const throttled = booleanValue(values, STAT.throttled)
  // Without low voltage, a capped clock or the soft limit can only come from heat.
  const warm = booleanValue(values, STAT.softTempLimit) || booleanValue(values, STAT.freqCapped)
  const occurred =
    booleanValue(values, STAT.underVoltageOccurred) || booleanValue(values, STAT.throttledOccurred)

  if (underVoltage) {
    return (
      <div className="banner alarm" role="alert">
        <strong>Supply voltage too low</strong> The computer is not getting enough power. Check the
        power supply and its cable; a weak supply corrupts SD cards.
      </div>
    )
  }
  if (throttled) {
    return (
      <div className="banner alarm" role="alert">
        <strong>CPU slowed down</strong> The computer is too hot and runs slower to protect itself.
        Give it more air or a fan.
      </div>
    )
  }
  if (warm) {
    return (
      <div className="banner warn" role="status">
        <strong>CPU getting hot</strong> The computer has started to run a little slower to stay
        cool. Give it more air or a fan.
      </div>
    )
  }
  if (occurred) {
    return (
      <div className="banner warn">
        <strong>Power or heat problem since the last start.</strong> It has cleared, but the supply
        voltage dropped or the CPU slowed down at some point.
      </div>
    )
  }
  return null
}

export function Tiles() {
  const values = useStore((s) => s.values)
  const n = (path: string) => numberValue(values, path)

  const temperature = n(STAT.temperature)
  const memory = n(STAT.memoryUtilisation)
  const storage = n(STAT.storageUtilisation)
  const cores = Object.entries(values)
    .map(([path, value]) => {
      const match = CORE_PATH.exec(path)
      return match && typeof value === 'number' ? { core: Number(match[1]), value } : null
    })
    .filter((c): c is { core: number; value: number } => c !== null)
    .sort((a, b) => a.core - b.core)
  const load = [n(STAT.load1m), n(STAT.load5m), n(STAT.load15m)]
  const backlight = n(STAT.backlight)
  const voltage = n(STAT.coreVoltage)

  return (
    <section className="tiles" aria-label="Status">
      <Tile
        title="CPU temperature"
        value={formatCelsius(temperature)}
        level={temperatureLevel(temperature)}
      />
      <Tile title="CPU load" value={formatPercent(n(STAT.utilisation))}>
        {cores.length > 0 && (
          <div className="cores">
            {cores.map(({ core, value }) => (
              <div key={core} className="core" title={`Core ${core}: ${formatPercent(value)}`}>
                <div className="core-fill" style={{ height: `${Math.round(value * 100)}%` }} />
              </div>
            ))}
          </div>
        )}
      </Tile>
      <Tile title="CPU clock" value={formatFrequency(n(STAT.frequency))}>
        {voltage !== undefined && <small>Core {formatVolts(voltage)}</small>}
      </Tile>
      <Tile title="Memory" value={formatPercent(memory)} level={fillLevel(memory)} fill={memory}>
        <small>
          {formatBytes(n(STAT.memoryUsed))} of {formatBytes(n(STAT.memoryTotal))}
        </small>
      </Tile>
      <Tile
        title="Storage"
        value={formatPercent(storage)}
        level={fillLevel(storage)}
        fill={storage}
      >
        <small>
          {formatBytes(n(STAT.storageUsed))} of {formatBytes(n(STAT.storageCapacity))}
        </small>
      </Tile>
      <Tile title="Running for" value={formatDuration(n(STAT.uptime))}>
        <small>Load {load.map((l) => (l === undefined ? '–' : l.toFixed(2))).join(' · ')}</small>
      </Tile>
      {backlight !== undefined && (
        <Tile title="Screen brightness" value={formatPercent(backlight)} />
      )}
    </section>
  )
}

function Tile({
  title,
  value,
  level = 'ok',
  fill,
  children
}: {
  title: string
  value: string
  level?: Level
  fill?: number
  children?: React.ReactNode
}) {
  return (
    <div className={`tile ${level}`}>
      <div className="tile-title">{title}</div>
      <div className="tile-value">{value}</div>
      {fill !== undefined && (
        <div className="bar">
          <div className="bar-fill" style={{ width: `${Math.round(fill * 100)}%` }} />
        </div>
      )}
      {children}
    </div>
  )
}

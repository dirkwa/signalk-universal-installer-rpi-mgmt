const KELVIN_OFFSET = 273.15
const GIB = 1024 ** 3
const MIB = 1024 ** 2

export function kelvinToCelsius(kelvin: number): number {
  return kelvin - KELVIN_OFFSET
}

export function formatCelsius(kelvin: number | undefined): string {
  return kelvin === undefined ? '–' : `${kelvinToCelsius(kelvin).toFixed(1)} °C`
}

export function formatPercent(ratio: number | undefined): string {
  return ratio === undefined ? '–' : `${Math.round(ratio * 100)} %`
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return '–'
  if (bytes >= GIB) return `${(bytes / GIB).toFixed(1)} GB`
  return `${Math.round(bytes / MIB)} MB`
}

export function formatFrequency(hz: number | undefined): string {
  if (hz === undefined) return '–'
  return hz >= 1e9 ? `${(hz / 1e9).toFixed(2)} GHz` : `${Math.round(hz / 1e6)} MHz`
}

export function formatVolts(volts: number | undefined): string {
  return volts === undefined ? '–' : `${volts.toFixed(2)} V`
}

export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined) return '–'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days} d ${hours} h`
  if (hours > 0) return `${hours} h ${minutes} min`
  return `${minutes} min`
}

export type Level = 'ok' | 'warn' | 'alarm'

// The Pi firmware starts to throttle at 80 °C (85 °C on the Pi 5's hard limit),
// so warn well before that.
const TEMPERATURE_WARN_C = 70
const TEMPERATURE_ALARM_C = 80
const FILL_WARN = 0.8
const FILL_ALARM = 0.9

export function temperatureLevel(kelvin: number | undefined): Level {
  if (kelvin === undefined) return 'ok'
  const celsius = kelvinToCelsius(kelvin)
  if (celsius >= TEMPERATURE_ALARM_C) return 'alarm'
  return celsius >= TEMPERATURE_WARN_C ? 'warn' : 'ok'
}

export function fillLevel(ratio: number | undefined): Level {
  if (ratio === undefined) return 'ok'
  if (ratio >= FILL_ALARM) return 'alarm'
  return ratio >= FILL_WARN ? 'warn' : 'ok'
}

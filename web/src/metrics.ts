import { kelvinToCelsius } from './format.js'

// What signalk-rpi-stats publishes, relative to its configured prefix
// (environment.rpi unless the user changed it).
export const STAT = {
  temperature: 'cpu.temperature',
  utilisation: 'cpu.utilisation',
  frequency: 'cpu.frequency',
  coreVoltage: 'cpu.coreVoltage',
  load1m: 'cpu.load.1m',
  load5m: 'cpu.load.5m',
  load15m: 'cpu.load.15m',
  memoryUtilisation: 'memory.utilisation',
  memoryUsed: 'memory.used',
  memoryTotal: 'memory.total',
  storageUtilisation: 'storage.utilisation',
  storageUsed: 'storage.used',
  storageCapacity: 'storage.capacity',
  uptime: 'uptime',
  underVoltage: 'throttling.underVoltage',
  throttled: 'throttling.throttled',
  freqCapped: 'throttling.freqCapped',
  softTempLimit: 'throttling.softTempLimit',
  underVoltageOccurred: 'throttling.underVoltageOccurred',
  throttledOccurred: 'throttling.throttledOccurred',
  backlight: 'display.backlight'
} as const

export type StatKey = keyof typeof STAT

export const CORE_PATH = /^cpu\.core\.(\d+)\.utilisation$/

export interface ChartSeries {
  key: StatKey
  label: string
  unit: string
  // Converts the Signal K value (SI units, ratios) to what the chart shows.
  toDisplay: (value: number) => number
}

const percent = (ratio: number): number => ratio * 100

export const CHART_SERIES: readonly ChartSeries[] = [
  { key: 'temperature', label: 'CPU temperature', unit: '°C', toDisplay: kelvinToCelsius },
  { key: 'utilisation', label: 'CPU load', unit: '%', toDisplay: percent },
  { key: 'memoryUtilisation', label: 'Memory in use', unit: '%', toDisplay: percent },
  { key: 'storageUtilisation', label: 'Storage in use', unit: '%', toDisplay: percent }
]

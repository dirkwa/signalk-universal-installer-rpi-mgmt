import { describe, expect, it } from 'vitest'
import {
  fillLevel,
  formatBytes,
  formatCelsius,
  formatDuration,
  formatFrequency,
  temperatureLevel
} from '../src/format.js'

describe('formatting', () => {
  it('shows kelvin as Celsius', () => {
    expect(formatCelsius(324.95)).toBe('51.8 °C')
    expect(formatCelsius(undefined)).toBe('–')
  })

  it('picks GB or MB for sizes', () => {
    expect(formatBytes(16872812544)).toBe('15.7 GB')
    expect(formatBytes(512 * 1024 * 1024)).toBe('512 MB')
  })

  it('picks GHz or MHz for the clock', () => {
    expect(formatFrequency(1.8e9)).toBe('1.80 GHz')
    expect(formatFrequency(600e6)).toBe('600 MHz')
  })

  it('shows uptime in its largest units', () => {
    expect(formatDuration(3 * 86400 + 5 * 3600 + 7)).toBe('3 d 5 h')
    expect(formatDuration(2 * 3600 + 15 * 60)).toBe('2 h 15 min')
    expect(formatDuration(59)).toBe('0 min')
  })
})

describe('levels', () => {
  it('warns from 70 °C and alarms from 80 °C', () => {
    expect(temperatureLevel(273.15 + 69.9)).toBe('ok')
    expect(temperatureLevel(273.15 + 70)).toBe('warn')
    expect(temperatureLevel(273.15 + 80)).toBe('alarm')
  })

  it('warns from 80 % full and alarms from 90 %', () => {
    expect(fillLevel(0.79)).toBe('ok')
    expect(fillLevel(0.8)).toBe('warn')
    expect(fillLevel(0.95)).toBe('alarm')
  })
})

import type { HistoryProviders, ValuesResponse } from '@signalk/server-api/history'

export const PLUGIN_ID = 'signalk-universal-installer-rpi-mgmt'
export const STATS_PLUGIN_ID = 'signalk-rpi-stats'
export const DEFAULT_STATS_PREFIX = 'environment.rpi'
const UPDATER_CONSOLE = '/plugins/signalk-updater/console'

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message)
  }
}

// Returns unknown; callers narrow what comes back.
async function request(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(path, { credentials: 'include', ...init })
  const text = await res.text()
  let body: unknown = text
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    // not JSON; keep the text for the error message
  }
  if (!res.ok) {
    const message =
      typeof body === 'string' && body
        ? body
        : isRecord(body) && typeof body.error === 'string'
          ? body.error
          : isRecord(body) && typeof body.message === 'string'
            ? body.message
            : `${res.status} ${res.statusText}`
    throw new HttpError(res.status, message)
  }
  return body
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export interface Access {
  isAdmin: boolean
  loggedIn: boolean
}

export async function fetchAccess(): Promise<Access> {
  const body = await request('/skServer/loginStatus')
  if (!isRecord(body)) return { isAdmin: false, loggedIn: false }
  if (body.authenticationRequired === false) return { isAdmin: true, loggedIn: true }
  const loggedIn = body.status === 'loggedIn'
  return { isAdmin: loggedIn && body.userLevel === 'admin', loggedIn }
}

export interface StatsPlugin {
  installed: boolean
  enabled: boolean
  prefix: string
}

// Only an admin may list plugins; anyone else gets the defaults and the page
// shows whatever arrives under them.
export async function fetchStatsPlugin(): Promise<StatsPlugin> {
  const body = await request('/skServer/plugins')
  const plugin = Array.isArray(body)
    ? (body as unknown[]).find((p) => isRecord(p) && p.id === STATS_PLUGIN_ID)
    : undefined
  if (!isRecord(plugin)) return { installed: false, enabled: false, prefix: DEFAULT_STATS_PREFIX }
  const data = isRecord(plugin.data) ? plugin.data : {}
  const config = isRecord(data.configuration) ? data.configuration : {}
  const prefix =
    typeof config.prefix === 'string' && config.prefix.trim()
      ? config.prefix.trim()
      : DEFAULT_STATS_PREFIX
  return { installed: true, enabled: data.enabled === true, prefix }
}

export interface SystemInfo {
  model: string | null
  isRaspberryPi: boolean
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  const body = await request(`/plugins/${PLUGIN_ID}/system`)
  if (!isRecord(body)) return { model: null, isRaspberryPi: false }
  return {
    model: typeof body.model === 'string' ? body.model : null,
    isRaspberryPi: body.isRaspberryPi === true
  }
}

// null when the Updater is not installed; false when it is but the installer
// has not set up the power units on this host.
export async function fetchHostPowerAvailable(): Promise<boolean | null> {
  try {
    const body = await request(`${UPDATER_CONSOLE}/api/host/power`)
    return isRecord(body) && body.available === true
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return null
    throw err
  }
}

export type PowerAction = 'restart' | 'reboot' | 'poweroff'

// A proxy in front of a server that went down mid-request answers with one of
// these instead of dropping the connection.
const GATEWAY_ERRORS = new Set([502, 503, 504])
const ACTION_TIMEOUT_MS = 15_000

// Each action takes the server, and the request with it, down: a request that
// gets no answer has done its job. That covers a dropped connection (fetch
// rejects with a TypeError), a gateway error, and a request still hanging
// when the server is already gone (the timeout).
async function requestUntilDown(path: string, method: string): Promise<void> {
  try {
    await request(path, { method, signal: AbortSignal.timeout(ACTION_TIMEOUT_MS) })
  } catch (err) {
    if (err instanceof TypeError) return
    if (err instanceof DOMException && err.name === 'TimeoutError') return
    if (err instanceof HttpError && GATEWAY_ERRORS.has(err.status)) return
    throw err
  }
}

export async function runPowerAction(action: PowerAction): Promise<void> {
  if (action !== 'restart') {
    await requestUntilDown(`${UPDATER_CONSOLE}/api/host/${action}`, 'POST')
    return
  }
  try {
    await requestUntilDown(`${UPDATER_CONSOLE}/api/signalk/restart`, 'POST')
  } catch (err) {
    // Without a working Updater the server restarts itself.
    if (!(err instanceof HttpError)) throw err
    await requestUntilDown('/skServer/restart', 'PUT')
  }
}

export async function fetchHasHistory(): Promise<boolean> {
  try {
    const body = (await request('/signalk/v2/api/history/_providers')) as HistoryProviders | null
    return isRecord(body) && Object.keys(body).length > 0
  } catch {
    return false
  }
}

export async function fetchHistory(query: string): Promise<ValuesResponse> {
  return (await request(query)) as ValuesResponse
}

export async function serverIsUp(): Promise<boolean> {
  try {
    const res = await fetch('/signalk', { cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}

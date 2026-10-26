export type Connection = 'connecting' | 'open' | 'closed'

export interface StreamValue {
  path: string
  value: unknown
}

const RETRY_MIN_MS = 1000
const RETRY_MAX_MS = 10_000

function streamUrl(): string {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${window.location.host}/signalk/v1/stream?subscribe=none`
}

function valuesOf(message: unknown): StreamValue[] {
  if (typeof message !== 'object' || message === null) return []
  const updates = (message as { updates?: unknown }).updates
  if (!Array.isArray(updates)) return []
  const out: StreamValue[] = []
  for (const update of updates as unknown[]) {
    const values = (update as { values?: unknown } | null)?.values
    if (!Array.isArray(values)) continue
    for (const v of values as unknown[]) {
      const path = (v as { path?: unknown } | null)?.path
      if (typeof path === 'string') out.push({ path, value: (v as { value?: unknown }).value })
    }
  }
  return out
}

// Subscribes to everything under the prefix and keeps reconnecting, with a
// growing pause, until closed: a restart of Signal K drops the socket.
export function openStream(
  prefix: string,
  onValues: (values: StreamValue[]) => void,
  onConnection: (state: Connection) => void
): () => void {
  let socket: WebSocket | null = null
  let retryMs = RETRY_MIN_MS
  let timer: ReturnType<typeof setTimeout> | undefined
  let closed = false

  const connect = (): void => {
    const ws = new WebSocket(streamUrl())
    socket = ws
    ws.onopen = () => {
      retryMs = RETRY_MIN_MS
      onConnection('open')
      ws.send(
        JSON.stringify({
          context: 'vessels.self',
          subscribe: [{ path: `${prefix}.*`, policy: 'instant' }]
        })
      )
    }
    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const values = valuesOf(JSON.parse(event.data))
        if (values.length) onValues(values)
      } catch {
        // not a delta; ignore
      }
    }
    ws.onclose = () => {
      if (closed) return
      onConnection('closed')
      timer = setTimeout(connect, retryMs)
      retryMs = Math.min(retryMs * 2, RETRY_MAX_MS)
    }
  }

  onConnection('connecting')
  connect()
  return () => {
    closed = true
    clearTimeout(timer)
    socket?.close()
  }
}

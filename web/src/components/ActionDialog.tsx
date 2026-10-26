import { useEffect, useState } from 'react'
import { runPowerAction, serverIsUp, type PowerAction } from '../api.js'
import { useStore } from '../store.js'
import { ACTION_TEXT } from './PowerPanel.js'

const POLL_MS = 3000
// A tick this late means the browser slept, and the server may have gone
// down and come back unseen.
const MISSED_POLL_MS = 3 * POLL_MS
// A restart that never takes the server down in this time has finished
// before the first check could see it gone.
const RESTART_SETTLE_MS = 30_000
// A reboot takes the server down within seconds; one still up after this
// never started.
const REBOOT_GIVE_UP_MS = 120_000

export function ActionDialog() {
  const action = useStore((s) => s.action)
  const setAction = useStore((s) => s.setAction)

  if (action.phase === 'idle') return null

  if (action.phase === 'off') {
    return (
      <Overlay>
        <h2>The computer is shutting down</h2>
        <p>
          Wait until its activity light has stopped blinking (about 30 seconds) before you cut the
          power.
        </p>
      </Overlay>
    )
  }

  const text = ACTION_TEXT[action.action]

  if (action.phase === 'confirm') {
    return (
      <Overlay>
        <h2>{text.question}</h2>
        <p>{text.detail}</p>
        <div className="dialog-buttons">
          <button
            type="button"
            className="dialog-button"
            onClick={() => {
              setAction({ phase: 'idle' })
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`dialog-button ${text.tone}`}
            onClick={() => {
              void start(action.action, setAction)
            }}
          >
            {text.label}
          </button>
        </div>
      </Overlay>
    )
  }

  if (action.phase === 'error') {
    return (
      <Overlay>
        <h2>{text.label} failed</h2>
        <p>{action.message}</p>
        <div className="dialog-buttons">
          <button
            type="button"
            className="dialog-button"
            onClick={() => {
              setAction({ phase: 'idle' })
            }}
          >
            Close
          </button>
        </div>
      </Overlay>
    )
  }

  return <Waiting action={action.action} sent={action.phase === 'waiting'} />
}

async function start(
  action: PowerAction,
  setAction: ReturnType<typeof useStore.getState>['setAction']
): Promise<void> {
  setAction({ phase: 'running', action })
  try {
    await runPowerAction(action)
    setAction(action === 'poweroff' ? { phase: 'off' } : { phase: 'waiting', action })
  } catch (err) {
    setAction({ phase: 'error', action, message: err instanceof Error ? err.message : String(err) })
  }
}

function Waiting({ action, sent }: { action: PowerAction; sent: boolean }) {
  const [seconds, setSeconds] = useState(0)
  const setAction = useStore((s) => s.setAction)

  useEffect(() => {
    if (!sent) return
    const startedAt = Date.now()
    let sawDown = false
    let stopped = false
    let lastTick = startedAt
    const timer = setInterval(() => {
      const now = Date.now()
      if (now - lastTick > MISSED_POLL_MS) sawDown = true
      lastTick = now
      setSeconds(Math.round((now - startedAt) / 1000))
      void serverIsUp().then((up) => {
        if (stopped) return
        if (!up) sawDown = true
        const elapsed = Date.now() - startedAt
        if (up && !sawDown && action === 'reboot' && elapsed > REBOOT_GIVE_UP_MS) {
          stopped = true
          setAction({
            phase: 'error',
            action,
            message: 'The computer did not restart. Signal K is still running.'
          })
          return
        }
        const settled = action === 'restart' && elapsed > RESTART_SETTLE_MS
        if (up && (sawDown || settled)) {
          stopped = true
          window.location.reload()
        }
      })
    }, POLL_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [action, sent, setAction])

  return (
    <Overlay>
      <div className="spinner" aria-hidden="true" />
      <h2>{action === 'restart' ? 'Signal K is restarting' : 'The computer is rebooting'}</h2>
      <p>
        {sent
          ? `This page reloads when Signal K answers again. ${seconds > 0 ? `${seconds} s` : ''}`
          : 'Sending the request…'}
      </p>
    </Overlay>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="dialog">{children}</div>
    </div>
  )
}

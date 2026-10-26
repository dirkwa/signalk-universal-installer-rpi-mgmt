import type { PowerAction } from '../api.js'
import { useStore } from '../store.js'

export const ACTION_TEXT: Record<
  PowerAction,
  { label: string; question: string; detail: string; tone: string }
> = {
  restart: {
    label: 'Restart Signal K',
    question: 'Restart Signal K?',
    detail:
      'The data stops for about a minute while the server restarts. The computer keeps running.',
    tone: 'blue'
  },
  reboot: {
    label: 'Reboot computer',
    question: 'Reboot the computer?',
    detail:
      'Everything on this computer restarts. Signal K is back after a few minutes; this page reconnects by itself.',
    tone: 'amber'
  },
  poweroff: {
    label: 'Power off',
    question: 'Power off the computer?',
    detail:
      'The computer shuts down and stays off. To start it again, switch its power off and on. Wait until it has shut down before you cut the power.',
    tone: 'red'
  }
}

const ACTIONS: readonly PowerAction[] = ['restart', 'reboot', 'poweroff']

export function PowerPanel() {
  const access = useStore((s) => s.access)
  const hostPower = useStore((s) => s.hostPower)
  const setAction = useStore((s) => s.setAction)
  const isAdmin = access?.isAdmin === true

  let hint: string | null = null
  if (access && !isAdmin) hint = 'Log in as an administrator to use these buttons.'
  else if (hostPower === null)
    hint = 'Rebooting and powering off need the Updater plugin of the Universal Installer.'
  else if (!hostPower)
    hint = 'Rebooting and powering off are not set up on this computer; run the installer again.'

  return (
    <section className="power" aria-label="Power">
      <div className="power-buttons">
        {ACTIONS.map((action) => {
          const text = ACTION_TEXT[action]
          const disabled = !isAdmin || (action !== 'restart' && hostPower !== true)
          return (
            <button
              key={action}
              type="button"
              className={`power-button ${text.tone}`}
              disabled={disabled}
              onClick={() => {
                setAction({ phase: 'confirm', action })
              }}
            >
              <PowerIcon action={action} />
              <span>{text.label}</span>
            </button>
          )
        })}
      </div>
      {hint && (
        <p className="hint">
          {hint}{' '}
          {access && !isAdmin && (
            <a href="/admin/#/login" target="_top">
              Log in
            </a>
          )}
        </p>
      )}
    </section>
  )
}

function PowerIcon({ action }: { action: PowerAction }) {
  if (action === 'poweroff') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v9" />
        <path d="M6.3 7.3a8 8 0 1 0 11.4 0" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
      {action === 'restart' && <circle cx="12" cy="12" r="2.5" />}
    </svg>
  )
}

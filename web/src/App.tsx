import { useEffect } from 'react'
import {
  DEFAULT_STATS_PREFIX,
  fetchAccess,
  fetchHasHistory,
  fetchHostPowerAvailable,
  fetchStatsPlugin,
  fetchSystemInfo,
  type StatsPlugin
} from './api.js'
import { ActionDialog } from './components/ActionDialog.js'
import { Charts } from './components/Charts.js'
import { PowerPanel } from './components/PowerPanel.js'
import { PowerWarning, Tiles } from './components/Tiles.js'
import { openStream } from './stream.js'
import { useStore } from './store.js'

// Used when the plugin list cannot be read (it is admin-only): assume the
// stats plugin runs with its default prefix and show what arrives.
const ASSUMED_STATS: StatsPlugin = {
  installed: true,
  enabled: true,
  prefix: DEFAULT_STATS_PREFIX
}

export function App() {
  const access = useStore((s) => s.access)
  const stats = useStore((s) => s.stats)
  const system = useStore((s) => s.system)
  const connection = useStore((s) => s.connection)
  const lastValueAt = useStore((s) => s.lastValueAt)
  const setLoaded = useStore((s) => s.setLoaded)
  const setConnection = useStore((s) => s.setConnection)
  const receive = useStore((s) => s.receive)

  useEffect(() => {
    void fetchAccess()
      .then((access) => {
        setLoaded({ access })
        if (!access.isAdmin) {
          setLoaded({ stats: ASSUMED_STATS })
          return
        }
        void fetchStatsPlugin()
          .then((stats) => {
            setLoaded({ stats })
          })
          .catch(() => {
            setLoaded({ stats: ASSUMED_STATS })
          })
        void fetchSystemInfo()
          .then((system) => {
            setLoaded({ system })
          })
          .catch(() => undefined)
        void fetchHostPowerAvailable()
          .then((hostPower) => {
            setLoaded({ hostPower })
          })
          .catch(() => {
            setLoaded({ hostPower: false })
          })
      })
      .catch(() => {
        setLoaded({
          access: { isAdmin: false, loggedIn: false },
          stats: ASSUMED_STATS
        })
      })
    void fetchHasHistory().then((hasHistory) => {
      setLoaded({ hasHistory })
    })
  }, [setLoaded])

  const prefix = stats?.prefix
  useEffect(() => {
    if (!prefix) return
    return openStream(
      prefix,
      (values) => {
        receive(prefix, values)
      },
      setConnection
    )
  }, [prefix, receive, setConnection])

  const title = system?.model ?? 'This computer'

  return (
    <main>
      <header>
        <div>
          <h1>RPI Manager</h1>
          <p className="subtitle">{title}</p>
        </div>
        <span className={`connection ${connection}`}>
          {connection === 'open' ? 'Live' : connection === 'connecting' ? 'Connecting…' : 'Offline'}
        </span>
      </header>
      <PowerPanel />
      {stats && !stats.installed && (
        <div className="banner warn">
          The plugin <strong>signalk-rpi-stats</strong> is not installed; it measures what this page
          shows. <a href="/admin/#/apps/store">Open the App Store</a>
        </div>
      )}
      {stats?.installed && !stats.enabled && (
        <div className="banner warn">
          The plugin <strong>signalk-rpi-stats</strong> is turned off.{' '}
          <a href="/admin/#/serverConfiguration/plugins/signalk-rpi-stats">Turn it on</a>
        </div>
      )}
      {stats?.enabled && connection === 'open' && lastValueAt === null && (
        <p className="hint">Waiting for the first measurements…</p>
      )}
      <PowerWarning />
      <Tiles />
      {prefix && <Charts prefix={prefix} />}
      <ActionDialog />
      {access === null && <p className="hint">Loading…</p>}
    </main>
  )
}

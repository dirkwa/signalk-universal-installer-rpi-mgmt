import type { Plugin, PluginRouter, ServerAPI } from '@signalk/server-api'
import { ConfigSchema } from './config.js'
import { readSystemInfo, type SystemInfo } from './model.js'

const PLUGIN_ID = 'signalk-universal-installer-rpi-mgmt'

export default function rpiManager(app: ServerAPI): Plugin {
  let info: SystemInfo = { model: null, isRaspberryPi: false }

  return {
    id: PLUGIN_ID,
    name: 'RPI Manager',
    description: 'Computer health, history and power buttons for Universal Installer setups',
    schema: () => ConfigSchema,

    start() {
      void readSystemInfo().then((read) => {
        info = read
        app.setPluginStatus(read.model ?? 'Computer model not reported')
      })
    },

    stop() {},

    // Plugin routes are for admins only, which is what the page needs anyway:
    // its power buttons are admin actions.
    registerWithRouter(router: PluginRouter) {
      router.get('/system', (_req, res) => {
        res.json(info)
      })
    }
  }
}

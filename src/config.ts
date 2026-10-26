import { Type, type Static } from 'typebox'

// RPI Manager has nothing to configure: what it shows comes from
// signalk-rpi-stats, and the power actions from the Updater.
export const ConfigSchema = Type.Object({})

export type Config = Static<typeof ConfigSchema>

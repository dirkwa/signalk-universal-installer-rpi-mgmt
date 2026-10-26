# RPI Manager

Signal K plugin and webapp for Universal Installer setups: shows the health
of the computer Signal K runs on (from signalk-rpi-stats), its history (from
the History API), and buttons to restart Signal K, reboot or power off.

## Layout

- `src/` — the server plugin (Node, ESM, built by `vite.config.ts` into
  `plugin/`). It only reports the computer model at `GET /system`.
- `web/` — the page (React, Zustand, uPlot, built by `vite.web.config.ts`
  into `public/`). `web/tsconfig.json` is its own project with DOM libs; its
  tests live in `web/test/`.

## Contracts it depends on

- **signalk-rpi-stats paths**, relative to its configurable prefix
  (`environment.rpi` by default), listed in `web/src/metrics.ts`. Never ask
  that plugin to change them.
- **Updater console API** through the signalk-updater proxy at
  `/plugins/signalk-updater/console`: `GET /api/host/power`,
  `POST /api/host/{reboot,poweroff}`, `POST /api/signalk/restart`. A request
  that gets no answer counts as success: the action takes the server down.
- **History API** `/signalk/v2/api/history/{_providers,values}`.

## Gotchas

- Plugin routes are admin-only; the page is an admin tool, so that is fine.
- `/proc/device-tree` is masked inside podman; the model comes from
  `/proc/cpuinfo` first.
- Schema defaults are not applied at runtime; there is no configuration.
- No install scripts; the only runtime dependency is `typebox`. The webapp's
  libraries are devDependencies, bundled into `public/`.
- `appIcon` resolves against `public/`; `static/icon.svg` links the root icon
  so Vite copies it there.

## Commands

- `npm run format` — prettier + eslint --fix
- `npm run ci-lint` — read-only lint + format check (what CI runs)
- `npm run typecheck` — tsc over the plugin, the tests and the webapp
- `npm run build` — both Vite builds; type errors fail them
- `npm test` — vitest
- `npm run build:all` — all of the above, run before every commit

## Workflow

- Conventional commits and PR titles: `<type>(<scope>): <subject>`.
- One logical change per PR. Never bump the version by hand; release-please.
- Branch names use hyphens, no `/`.
- No AI attribution in commits or PRs.

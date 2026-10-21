# Flâne

[![checks](https://github.com/Torof/flane/actions/workflows/checks.yml/badge.svg)](https://github.com/Torof/flane/actions/workflows/checks.yml)

The travel companion that whispers where to stop, to make the trip part of the journey.

Flâne is a mobile app (Android first) that suggests the right stops on a trip: viewpoints, picnic spots, village bakeries, dog walks, swimming spots. It relies on open data (OpenStreetMap, DATAtourisme), computes everything on the phone, and leaves navigation to Google Maps or Waze.

- Vision and framework: [`docs/VISION.md`](docs/VISION.md)
- How it is built: [`docs/METHOD.md`](docs/METHOD.md); versions: [`CHANGELOG.md`](CHANGELOG.md)
- Where the project stands: [`docs/JOURNAL.md`](docs/JOURNAL.md) and [`docs/BACKLOG.md`](docs/BACKLOG.md)

## The app

The Expo app (React Native, TypeScript) lives in [`app/`](app/).

```sh
tools/dev/setup.sh        # git hooks, gitleaks, Node (version from app/.nvmrc, via nvm)
cd app
nvm use                   # Node 24
npm ci                    # dependencies, without install scripts (.npmrc)
npm run check             # types, lint, formatting, SPDX notices, tests
npm start                 # development server (Metro)
```

Tests only: `npm test`. Production licence inventory: `npm run licenses`.

Builds with EAS Build (Expo account needed, `eas login`; eas-cli 16.27.0 used here):

```sh
tools/dev/make-dev-keystore.sh                 # once, before the first build: development keystore
cd app
EXPO_NO_TELEMETRY=1 eas build -p android -e preview        # standalone APK « Flâne (dev) », to test without a PC
EXPO_NO_TELEMETRY=1 eas build -p android -e development    # development client, to code with Metro
```

With each slice, the test variant receives the new code by instant update (`eas update --channel preview`, see `docs/CONVENTIONS.md`); a new APK is only needed when the native version changes. Both profiles produce the `app.flane.dev` variant; `app.flane` is reserved for the published version (`production` profile, no key for now: T5.4). The keystore and `app/credentials.json` stay on this PC, ignored by git: do not copy them anywhere. To turn off Expo tools telemetry in your shell: `export EXPO_NO_TELEMETRY=1`. To read the permissions of a built APK: `python3 -I tools/dev/read-manifest.py file.apk`.

## Contributing to the repository

After cloning: `tools/dev/setup.sh` enables the project's git hooks (commit format, secret scanning, checks before push), installs gitleaks in `~/.local/bin` and the expected Node version. Every pull request goes through the automatic checks (`.github/workflows/checks.yml`: types, lint, formatting, SPDX notices, tests, licences, app bundling, secrets, dependency audit, version bump, tests of the repository scripts); `main` refuses the merge until they are green (the dependency audit only blocks if the pull request touches the package files). Method and conventions: [`docs/METHOD.md`](docs/METHOD.md), [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md).

## Licence

Copyright (C) 2026 Torof.

Flâne is free software, distributed under the GNU Affero General Public License, version 3 or later (AGPL-3.0-or-later). See [`LICENSE`](LICENSE). The name « Flâne » is not covered by this licence.

Map data © OpenStreetMap contributors, under the ODbL licence.

Project under construction.

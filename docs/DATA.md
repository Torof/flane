# Data inventory

Every piece of data Flâne touches, where it lives, why, and for how long. The privacy policy and the Google Play and App Store forms will derive from this inventory. **Any slice that touches data updates this table.**

## User data (Flâne alone)

| Data | Why | Where it lives | Leaves the phone? | Retention |
| --- | --- | --- | --- | --- |
| Current position | Suggestions on the road | Phone memory, during an active trip | Only during a recalculation after a detour: sent as the new start to the routing server | Not kept after the trip (to be confirmed in a slice) |
| Start and destination of a trip | Route computation | Phone | Yes, to the routing server. The start is often the user's position | For the duration of the computation; server chosen to keep nothing |
| Chosen destination and waypoints | Navigation | Phone | Yes, to Google Maps or Waze, by link, when the user asks for it. They are then subject to Google's or Waze's privacy rules | Out of our control once sent |
| Planned trips | Planned mode | App private storage | No | Until deleted by the user |
| Preferences (dogs, picnic, max detour…) | Personalise suggestions | App private storage | No | Until deleted by the user |
| Personal ratings (« j'aime », « pas pour moi ») | Learn tastes | App private storage | No | Until deleted by the user |
| Technical logs | Diagnose bugs | App private storage | Only if the user exports them themselves | Short rotation (to be defined); **never any position** |
| IP address | Technical effect of any connection | — | Visible to the pack server (with the requested region) and to the routing server | To be limited server side (no logging or short logging) |
| Call to the update server (test variant `app.flane.dev`, `preview` channel, D-023) | Receive the code of the new slice without reinstalling | App private space: installation identifier, update database, downloaded files, `expo-updates` log (24 h), fatal error log; `allowBackup` disabled | Yes, at each launch, to Expo's servers (manifest on `u.expo.dev`, assets on their CDN; the IP address is seen in both places): platform, protocol versions, native version (fingerprint), channel, a random identifier specific to the installation (`EAS-Client-ID`), the identifier of the current update and of the embedded one, the list of recently failed updates, and the text of any fatal `expo-updates` error at the previous launch (1024 characters at most, internal to the module). Expo derives launch counts and failure rates per update from it. Never any position, trip or preference; the app version is not in the request. The development client does not fetch updates on its own (it can load one on request from its launcher); the published variant `app.flane` does not call this server, decision in T5.4 | On Expo's side, according to their policy; on the phone, until uninstall |

No user account, no advertising identifier, no analytics tool.

**Automatic checks (GitHub Actions, T0.2)**: they touch no usage data. GitHub receives the repository code, already public, and the runners download npm packages and gitleaks; `npm audit` sends the npm registry the list of packages in the lock file (public data). Job logs and summaries are public: secret scanning output is redacted (rule, file, line, never the value) and leaves no report.

**User feedback through GitHub Issues** (public repository since T0.1): what a user writes there is public and out of our control. The issue templates ask for an approximate stretch (« entre Briançon et Embrun ») and forbid coordinates, addresses and screenshots showing the position. The app's « report a problem » button (T5.3) will follow the same rule: log export without position, never any position in an issue.

## Project steering (T0.4a)

No app usage data. Pull request bodies and Claude's comments are **public**, like the repository: content bounded by `docs/CONVENTIONS.md` (no position, trip, preference, address, or detail of an open vulnerability). `tools/dev/owner-signals.mjs` reads these public comments through `gh`, on the PC, and sends them nowhere; it does not display the text of comments from other accounts. Its local state, `.git/flane-signals.json`, only contains dates and pull request states, outside the repository. `tools/dev/session-state.sh` (session opening hook) reads the local git state, the titles and authors of open pull requests, the signals and the state of the checks, and displays them in Claude's local context, without sending anything. `tools/dev/stop-gate.mjs` (hook before each command) reads the command locally and only calls `gh` for a merge, a publish or a build.

## Public data used

| Source | Use | Licence | Obligations |
| --- | --- | --- | --- |
| OpenStreetMap | Places, roads, base maps | ODbL | Display « © les contributeurs d'OpenStreetMap » **in the app** (map, place page or « À propos » screen); reshare the derived place database under ODbL, since the packs are distributed |
| DATAtourisme | Tourist places, labels | Licence Ouverte Etalab 2.0 | Cite the source and the date of the last update |
| Label lists (e.g. Plus Beaux Villages de France) | Ranking rules | To be checked | To be specified before use |

## At stage 2 (to be completed when the time comes)

Reviews and tags, shared trips, possible accounts. Each must be added here before it is built.

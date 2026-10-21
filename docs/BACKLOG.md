# Backlog

Statuses: **Idea** → **Ready** (sheet approved) → **In progress** → **To try on the road** → **Done**. Only one slice « In progress » at a time. Budgets are in sessions and are set at the Plan step.

## In progress

No slice in progress. **Milestone 0 review in progress**: product, method, security pass and parking done; milestone 1 waits for the design brainstorm (`docs/vision-draft-2026-10-21.md`, mockups) to be finished with the owner.

## Open questions

- [ ] **Two-factor authentication on the Expo account**: postponed on 2026-10-20. To enable before the first personal data stored by the test variant, together with update signing (trigger in `docs/SECURITY.md`).
- [ ] **« Flâne » trademark filing (INPI)**: when? Since the repository went public (D-019), the name is the only thing the license does not protect. Planned in T5.5; to bring forward if possible.
- [x] **Region of the first pack** (milestone 1): the Hautes-Alpes (05). *Answered on 2026-10-20.*
- [x] **Reference trip**: Briançon–Embrun (a trip known by heart); long trip: Briançon–Marseille. *Answered on 2026-10-20.*
- [x] **GitHub repository name and app identifier**: repository `flane`, Android package identifier `app.flane`, display name « Flâne » (see D-015). *Answered on 2026-10-20.*

---

## Milestone 0 — The workshop is ready

*Criterion: a change automatically goes through all the checks, and an empty Flâne app installs on the owner's phone.*

| ID | Slice | Status |
| --- | --- | --- |
| T0.1 | Repository and conventions: local git hooks in `.githooks/` (secrets with gitleaks, commit format, pre-push), `.editorconfig`, AGPL-3.0 license and going public, issue and PR templates, GitHub settings (rule on `main`, secret scanning, alerts), D-017 to D-019. Claude's guardrail delivered here was removed afterwards (D-022) | Done |
| T0.1b | Claude kit: « accept edits » mode, D-021 (who decides what). The frozen `allow` list and the hardened guardrail were removed (D-022) | Done, then simplified |
| T0.2 | Automatic checks (GitHub Actions): types, lint, tests, dependency audit, secret scanning, licenses; required by the rule on `main`; Dependabot; short failure summary for Claude | Done |
| T0.3 | Expo app skeleton: strict TypeScript, ESLint and Prettier, translation files, SPDX notice at the top of files, `.npmrc` (`ignore-scripts`, `save-exact`), `.nvmrc`, three empty tabs, `app.flane.dev` / `app.flane` variants, `preview` APK and development client through EAS Build | Done |
| T0.5 | Instant updates (EAS Update) for the test variant `app.flane.dev`, visible native version, one version per slice (D-023); done before T0.2 at the owner's request to speed up the test loop | Done |
| T0.4a | Steering, seeing and stopping: pinned issue « État de Flâne », pull request followed live from the first commit, veto (signals read by `tools/dev/owner-signals.mjs` at each checkpoint), the agents' « Noticed on the way ». Sheet `docs/slices/T0.4-pilotage.md`; real veto postponed to T0.6 | Done |
| T0.6 | Our method, live: a shared ritual and reflexes instead of gates, `METHOD.md` and `CLAUDE.md` in English, D-027 (language), D-028 (ritual), D-029 (named versions), descriptive commits, « État » issue removed, session-opening and veto hooks | Done |
| T0.8 | Monthly dependencies, October 2026: `@types/node` 24.19.2 (Dependabot #13 redone, D-025). Sheet `docs/slices/T0.8-deps-2026-10.md` | Done |
| T0.7 | Translate the rest of the repository into English (D-027): vision, security, data, conventions, glossary, backlog, journal, agents, scripts' messages | Done |
| T0.4b | Full CI: the app assembles in `app-check`, `version-check` (version goes up when the app changes, every tool test on GitHub), required on `main`. Sheet `docs/slices/T0.4b-full-ci.md` | Done |
| T0.4c | Type-only packages (`@types/*`, `undici-types`) do not count as an app change in `version-check`. Sheet `docs/slices/T0.4c-types-packages.md` | Done |

## Milestone 1 — I see the good spots in my region

*Criterion: on the viewer, the owner recognizes the places they love, with few false positives.*

| ID | Slice | Status |
| --- | --- | --- |
| T1.1 | Stop types in configuration: schema, validation, first list (see `docs/VISION.md` and the list below) | Idea |
| T1.2 | OSM extraction for a region: fetching, filtering by type, stable identifiers | Idea |
| T1.3 | DATAtourisme (Licence Ouverte Etalab 2.0: cite the source and the update date): integration and matching with OSM | Idea |
| T1.4 | Sorting rules and source tiers (tiers 3 and 4 for now) | Idea |
| T1.5 | Regional pack: local database format, signature, pack checker | Idea |
| T1.6 | Place viewer and « why this place? » | Idea |

## Milestone 2 — I prepare a trip

*Criterion: the owner prepares their next real trip in less than ten minutes, and the proposed stops make them want to go.*

| ID | Slice | Status |
| --- | --- | --- |
| T2.0 | Signing of instant updates, two-factor authentication on the Expo and GitHub accounts, rights of the `gh` token; before T2.3 (first personal data stored) | Idea |
| T2.0b | Interface direction (mockups, visual choices), to decide together before T2.5 | Idea |
| T2.1 | Local storage and data model: the trip as an object, changes as actions, stable identifiers, offline first | Idea |
| T2.2 | Loading and verifying a regional pack in the app | Idea |
| T2.3 | Preferences, entered once | Idea |
| T2.4 | Trip: start, destination, route calculation (choice of engine and service) | Idea |
| T2.5 | Moments and stops proposed along the trip (structured request: type, moment, criteria) | Idea |
| T2.6 | Place sheet, « © OpenStreetMap contributors » credit visible in the app, and « See on Google Maps » button (without a Google identifier, this link is a search: check that it opens the right place) | Idea |
| T2.7 | Sending the trip to Google Maps (waypoints) or Waze (stop by stop) | Idea |
| T2.8 | Test bench for suggestions on the reference trip | Idea |

## Milestone 3 — Flâne comes along on the road

*Criterion: on a real trip, Flâne speaks at the right moment, never disturbs, and does not drain the battery.*

| ID | Slice | Status |
| --- | --- | --- |
| T3.1 | Trip simulator: record a real trip, replay it, sped up | Idea |
| T3.2 | Location during a trip: permissions, limited to the active trip. Study a foreground service (visible notification during the trip), which can avoid the background location permission and simplify Google Play review | Idea |
| T3.3 | Engine on the road: levels 1, 3 and 4, automatic switches, recalculation after a detour | Idea |
| T3.4 | Suggestion while moving: short sentence, two buttons, calm moments, spacing | Idea |
| T3.5 | Voice: Android text-to-speech, sentence listener, coexistence with music | Idea |
| T3.6 | Battery measurement on a simulated trip | Idea |

## Milestone 4 — Flâne learns from me

*Criterion: after a few trips, the owner feels that the suggestions are more like them.*

| ID | Slice | Status |
| --- | --- | --- |
| T4.1 | « J'aime » and « pas pour moi », recorded to become the future reviews | Idea |
| T4.2 | Tier 2 (personal notes) and a tone that follows confidence | Idea |
| T4.3 | Trip notes (quick note during a test trip) | Idea |

## Milestone 5 — I hand it to a friend

*Criterion: a friend installs Flâne and uses it on one of their trips, without help.*

| ID | Slice | Status |
| --- | --- | --- |
| T5.1 | Packs for other regions and partial updates | Idea |
| T5.2 | Privacy policy (based on `docs/DATA.md`) | Idea |
| T5.3 | « Report a problem » button (log export, without position) | Idea |
| T5.4 | Closed testing release on Google Play (data form, location justification) | Idea |
| T5.5 | License: legal advice, final decision, trademark filing | Idea |

---

## First list of stop types (for T1.1)

- **Eat**: bakery, market, delicatessen and local products, farm shop, caterer, café with a terrace, ice cream shop.
- **Break**: picnic table, bench with a view, shady spot.
- **Nature**: viewpoint, short walk, riverside or lakeside, swimming spot, waterfall, forest.
- **Dogs**: place to let them off the leash, short walk.
- **Heritage**: pretty village, castle or ruin, chapel, wash house or fountain, unusual place.
- **Moments**: sunset spot.
- **Practical**: toilets, drinking water, fuel, electric charging, children's playground.

---

## Parking

Ideas written down, handled at the end of a milestone. Do not tackle them before.

**Stage 2 (already decided in the vision)**
- Flâneurs' reviews: « was it worth the detour? » stars, short comment, factual labels, rating after a verified stop.
- Shared Flâne: driver and passenger views, trip shared through actions, ephemeral, offline.
- Supabase for reviews and sharing.

**Later**
- Home-screen widget: « tu es là, j'ai des suggestions », on foot too (design brainstorm, 2026-10-21).
- A third category of places, « made here, by people »: small markets, local producers, craftspeople (design brainstorm; where to draw the line is open).
- Revenue model: to discuss when the owner is ready (design brainstorm).
- Importing a trip from Google Maps (level 2).
- Voice answer « oui » / « non », then natural-language requests with an AI.
- Professionals (shops, tourist offices) with verification.
- CarPlay and Android Auto.
- Convoy of several cars.
- Bike, motorbike, van; home-to-work use; other countries; iOS.
- Full journey tests (Maestro), screen gallery (Storybook), trip notes transcribed by Claude.

**Tooling** (never decided alone: Claude asks the owner whether it is needed now — milestone 0 review)
- `github-settings.sh --check` also checks secret scanning and push protection (milestone 0 security pass).
- A guard against an accidental build of the public `production` profile before T5.4 (milestone 0 security pass).
- Dark mode (night mode for driving) and landscape orientation: light theme and portrait only since T0.3; to handle with the moving view (milestone 3), through `app/src/ui/theme.ts`.
- English and detection of the phone's language: an `en.json` file next to `fr.json`, no code to change.
- Final icon and splash screen (the Expo template icon kept in T0.3).
- Local build of the app (Android SDK on the PC): EAS Build is enough for now.
- `+not-found` route and reading the parameters of the `flane` scheme: at the first slice that receives a link.
- Move the tests of the repository tools (`app/src/tools/`) out of the app when `data-pipeline/` has its own.
- Test bench in PRs: the test bench runs on the reference trip on every pull request and posts the difference with `main` (after T2.8).
- A root-level `SECURITY.md` and vulnerability disclosure policy (milestone 5).
- Debug log in the test variant, without position: to decide in the sheet of the first slice of milestone 1 that touches the app.
- Claude running without an open session (scheduled tasks, cloud agents): to revisit when development has a rhythm.
- **Owner's moment at the first pull request of milestone 1** (settings the owner commits): `rm -r -f`/`rm -Rf` ask like `rm -rf` (T0.6 audit); `Read(./**/credentials.json)` denied (milestone 0 security pass); and the real veto test, never done yet.
- `version-check` that compares the built app itself (fingerprint of the export) between `main` and the pull request, instead of guessing from the files (T0.4c).
- Observe more deeply what the agents do (quality of their reports, what they miss, their cost): at a milestone review, once we have some distance.
- Next slice that touches the app: the comment in `app/app.config.ts` still names `docs/DONNEES.md` (now `docs/DATA.md`); left out of T0.7 so as not to change the app without a version.
- A check that flags accented French words in non-history files (T0.7 review).
- Automatic check for dead references (`METHODE.md`, vocabulary of the gates) in `app-check`.

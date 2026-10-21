# Glossary

The same words everywhere: in the documents, in conversations and in the code. The « In code » column gives the English name to use (types, variables, files). Any slice that introduces a term adds it here.

## The product

| Term | Definition | In code |
| --- | --- | --- |
| Flâne | The app. | `flane` |
| Flâneur (a Flâne user) | A user of Flâne. | `user` |
| Trip (trajet) | A journey from a start to a destination, planned or not. A full-fledged object, with a stable identifier. | `Trip` |
| Stop (halte) | A stop chosen in a trip. | `Stop` |
| Place (lieu) | A spot where you can stop, taken from the data. Stable identifier. | `Place` |
| Stop type (type d'arrêt) | A category of place (bakery, viewpoint…), defined in configuration. | `StopType` |
| Family (famille) | A grouping of stop types (Manger, Pause, Nature, Chiens, Patrimoine, Moments, Pratique). | `StopFamily` |
| Preferences (préférences) | The user's permanent settings (dogs, picnic, max detour…). | `Preferences` |
| Moment (moment) | A need placed in time on the trip (« manger vers 2 h de route »). | `Moment` |
| Request (demande) | A structured search: stop type, moment or position, criteria. What voice or an AI will produce later. | `StopRequest` |
| Suggestion (suggestion) | A place offered in answer to a request, with its justification. | `Suggestion` |
| Corridor (couloir) | The area around the route where stops are searched for, according to the maximum detour. | `Corridor` |
| Detour (détour) | The extra time or distance to reach a stop. | `detour` |
| Action (action) | An elementary change to a trip (« halte ajoutée », « halte retirée »). Basis of future sharing. | `TripAction` |

## What Flâne knows about the route

| Term | Definition | In code |
| --- | --- | --- |
| Route knowledge level (niveau de connaissance) | What Flâne knows about the route: 1 planned, 2 imported, 3 destination only, 4 nothing (around me). | `RouteKnowledge` (`planned`, `imported`, `destination`, `none`) |
| Discovery mode (mode découverte) | Level 4: suggestions around you, shorter and more cautious. | `discovery` |
| Quiet window (moment calme) | A moment when Flâne is allowed to speak (not in town, not on an interchange, not before an exit). | `quietWindow` |

## The data

| Term | Definition | In code |
| --- | --- | --- |
| Regional pack (paquet régional) | The place database of a region, downloaded onto the phone, signed. | `RegionPack` |
| Data pipeline (chaîne de fabrication) | The script that produces the packs from OSM and DATAtourisme. | `data-pipeline` |
| Source tier (palier de source) | The source that judges a place: 1 reviews, 2 personal ratings, 3 rules, 4 raw OSM. | `SourceTier` |
| Ranking rule (règle de tri) | A simple rule that moves a place up or down (named, present in DATAtourisme, labelled…). | `RankingRule` |
| Confidence score (note de confiance) | The strength of what Flâne knows about a place; it decides the tone. | `confidence` |
| Tag (étiquette) | A factual feature of a place (shaded, dogs welcome…). | `Tag` |
| Tab (onglet) | One of the entries at the bottom of the screen (Trajet, Préférences, À propos). | `Tabs`, `(tabs)/` |
| Thin route | A file in `src/app/` that only names the screen to display; the screen itself lives in `src/ui/`. | `src/app/(tabs)/about.tsx` |
| Translation | A displayed text, always read through `t('clé')` from a language file, never hard-coded. | `t`, `src/i18n/fr.json` |

## The method

Beware of the French word **« étape »**, which has three meanings. To remove the ambiguity:
- **moment of the ritual**: one of the seven moments of a session, from opening to closing (`docs/METHOD.md`, D-028);
- **product stage**: Flâne alone (stage 1), community and shared Flâne (stage 2);
- **stop** (« halte », not « étape ») for a stop on a trip. « Étapes » are only used for the waypoints sent to Google Maps (`waypoints` in code).

| Term | Definition |
| --- | --- |
| Slice | A small complete feature, finishable in one to three sessions. Identifier `Tx.y`. |
| Milestone | A moment of real use with a verifiable criterion. Identifier `Jx`. |
| Slice sheet | The planning document of a slice (`docs/slices/`). |
| Budget | The number of sessions allocated to a slice. |
| Parking | The list of new ideas, reviewed at the end of a milestone. |
| Definition of « done » | The checklist that says a slice is finished. |
| Journal | The file that says where we stand (`docs/JOURNAL.md`). |
| Trip notes | The notes taken during a test trip (`docs/trip-notes/`). |
| Reference trip | The fixed scenario used to test and compare all versions. |
| Test bench | The tool that outputs the list of suggestions on the reference trip. |
| Trip simulator | The tool that replays a recorded trip. |
| Gate | Former name (D-016) of the moments when the owner validates; replaced by the moments of the ritual (D-028): their yes on the sheet, the trial. |
| Guardrail | An automatic check that blocks a forbidden action: git hook (`.githooks/`), GitHub rule on `main`. The Claude Code hook that analysed every command has been removed (D-022). |
| Variant | A version of the app built with its own Android identifier: `app.flane.dev` for development and trials, `app.flane` for publication (D-015). Both coexist on a phone. Chosen by `APP_VARIANT` in `app/app.config.ts`. |
| Development client | The app built with `expo-dev-client`: it loads the code from the PC (Metro) and accepts native modules. Does not work without the PC. EAS profile `development`. |
| Trial APK | The app built with the code embedded, installable and usable without a PC. It is the one tested during the trial. EAS profile `preview`. |
| Instant update | The JavaScript code of a slice delivered to the trial APK without reinstalling (EAS Update, `expo-updates`), published by Claude at the trial on the `preview` channel. Reserved for `app.flane.dev` (D-023). |
| Native version | The fingerprint of the APK's native modules (`runtimeVersion`). An instant update only applies to the same native version; when it changes, a new APK is needed. Visible in « À propos ». |
| Channel | The name under which an APK receives its instant updates (`preview`). A future `beta` channel will serve friend testers. |
| Automatic checks | The GitHub Actions workflow `checks` (`app-check`, `secrets-check`, `deps-check`, `version-check`) that checks every pull request. All four are **required**: the `protect-main` rule refuses the merge until they are green; `deps-check` only turns red on a pull request if it touches the package files. |
| Accepted alert | A high or critical `npm audit` alert that `deps-check` does not block, because the package is loaded by no module of the app (tooling on the PC). Recorded in `tools/dev/audit-accepted.json` with its paths and date (`docs/CONVENTIONS.md`). |
| Dependencies slice | The short slice that takes over a Dependabot pull request between two slices (D-025). |
| Veto | The stop requested by the owner, at any time: pull request closed or turned back into a draft, comment starting with « veto » or « stop ». |
| Checkpoint | The moment when Claude reads the owner's signals (`tools/dev/owner-signals.mjs`): before each commit, push, agent, publish, build and merge, and at the opening of each session. |
| Claude's signature | The hidden line `<!-- flane:claude -->` at the top of each comment posted by Claude, which uses the owner's account. |
| Noticed on the way (remarqué en route) | The closing section of every agent report and every pull request: three remarks at most, *problem*, *success* or *idea*. |
| Ritual | The sequence of moments of a session (opening, idea, sheet, build, security pass, trial, closing) that Claude leads and announces, with its reflexes (D-028, `docs/METHOD.md`). |
| Reflex | What Claude says on its own at the right moment: parking, cut, new version, security pass, discovery, step aside (`docs/METHOD.md`). |
| Step aside | A point outside the task that Claude raises at opening and closing: a rising risk, another way of doing things, a parking idea that has become ripe. |
| Inbox | GitHub Issues: feedback and ideas from outside, emptied into the backlog or the parking at the start of each session (D-017). |

## Stage 2 (for the record)

| Term | Definition | In code |
| --- | --- | --- |
| Review (avis) | The « ça valait le détour ? » rating, a comment and tags. | `Review` |
| Driver view / passenger view (vue conducteur / vue passager) | The two displays of the app in a shared trip. | `driverView` / `passengerView` |
| Shared trip (trajet partagé) | A trip followed by several phones in the same car. | `SharedTrip` |

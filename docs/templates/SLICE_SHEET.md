# Tx.y — Slice name

**Milestone**: Jx — …
**Moment of the ritual**: idea | sheet | building | security pass | trial | closing
**Status in the backlog**: Idea | Ready | In progress | To try on the road | Done
**Budget**: … session(s)
**Branch**: `feat/Tx.y-short-name` (or `fix/`, `chore/` depending on the nature of the slice)
**Approved on**: (date of the owner's yes on the sheet)

## Goal

One or two sentences: what the owner will be able to do at the end.

## Success criterion

How we will know, concretely, that it worked. Checkable by the owner.

## In

- …

## Out

- … (and where it will go: another slice, parking)

## Approach

The technical outline. The files or folders concerned.

## Added dependencies

| Library | Why | Alternatives | License | Maintenance |
| --- | --- | --- | --- | --- |
| — | | | | |

## Data touched

Which data, where it lives, whether it leaves the phone. Update `docs/DATA.md`.

## Security risks

The risks specific to this slice, and their countermeasure. Refer to `docs/SECURITY.md`.

## Test plan

- Nominal case: …
- Edge cases: no network, no place found, permission denied, invalid data, low battery…
- Test on the phone: …

## Plan without building

What this slice prepares for later (sharing, reviews, iOS), without developing it.

## Common gaps

To go through before the devil's advocate. For each point: handled in the sheet, not concerned, or referred to another slice.

- [ ] No network, no place found, permission denied, invalid data: behavior defined
- [ ] Text shown: all in the translation files
- [ ] Data touched: listed, with what leaves the phone (`docs/DATA.md`)
- [ ] New terms: in the glossary, and in the names in the code
- [ ] New dependencies: justified, license checked
- [ ] New Android permissions: necessary and justified
- [ ] Instant updates: does the slice cross the signing trigger (sensitive permission, stored personal data, second device or channel)? If so, signing comes first (`docs/SECURITY.md`)
- [ ] What the slice leaves in place for later (stable identifiers, actions, separate display)
- [ ] What the owner will need to see at the trial, and how

## Devil's advocate objections

(The three best objections, with the answer chosen for each one.)

## Definition of « done »

- [ ] Success criterion reached and seen by the owner
- [ ] Tests written and green, edge cases included
- [ ] Automatic checks green
- [ ] Security audit: no blocking point open
- [ ] Review: no blocking point open
- [ ] `DATA.md`, glossary, decisions up to date if needed
- [ ] Version bumped in `app/package.json` (one per slice, see `docs/CONVENTIONS.md`); new APK if the native version changes
- [ ] Journal and backlog up to date
- [ ] Integrated into `main` through a pull request

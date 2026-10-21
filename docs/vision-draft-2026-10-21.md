# Vision draft — design brainstorm of 2026-10-21

**Status: draft, not decided.** Written at the end of a brainstorm between the owner and Claude, to be read again together, corrected, and then merged into `docs/VISION.md` and the decisions. Nothing here is built yet. Mockups: [Flâne — maquettes](https://claude.ai/artifact/5iEQ4geivZUWWUr4727Qt1) (private to the owner).

## 1. What Flâne is, said again

- **Not only the car.** Flâne is for discovering: on foot in a village, by bike, in a city you do not know, as much as on a car trip. The car stays the first use we build (the reference trip), but nothing in the interface should lock Flâne into it.
- **The aggregator of pleasant places with no purpose.** Every app has a precise use (climbing spots, shops, hikes). Nobody gathers the places that are simply pleasant: a bench facing the valley, a drinking fountain, a riverbank, a small market. Flâne is where those places exist, first from open data, then above all from the people who found them.
- **Suggestion and community are one loop.** Open data gives plausible candidates; Flâne suggests them; people who stop there say how it was; good places rise, poor ones fade. The first judges are the owner and close friends, on the ground they know (milestone 1 criterion).

## 2. Three layers of places

| Layer | What | How Flâne shows it |
| --- | --- | --- |
| **Flâne's soul** | Neither commercial nor industrial: viewpoints, fountains and water points, riverbanks, places to rest, dog walks, toilets, small markets, churches, short walks | Put forward. Rich pages: description, photos, comments, feelings, labels |
| **Made here, by people** (open question) | Small markets, local producers, craftspeople (an artist blacksmith…) | To think about later: commercial, yet exactly what one discovers by wandering; where to draw the line is open |
| **Shops** | Restaurants, bars, bakeries, grocers | Discreet on the map. Name, type, Flâne's own stars, at most one free image, a link to Google Maps for everything else (hours, phone, reviews). No description, no comments, no photo gallery |

Shops come from OpenStreetMap, not from Google: Google's terms forbid showing its place data on a non-Google map or storing it, it is paid per request, and querying it around the user would send their position (D-010).

## 3. Three modes, complementary

| Mode | The question | When |
| --- | --- | --- |
| **Suggestion** | « Suggest things while I drive » | Switched on, then the floating bubble over Google Maps or Waze whispers the right places on the road |
| **Planning** | « Build me a beautiful trip » | Before leaving: start, destination, wishes (« pause vers 10 h 30 »), proposed stops |
| **Flâne** | « I am here: what can I do? » | Anywhere, on foot, by bike or by car: a small market, a church, a 25-minute walk with a viewpoint. Includes « J'ai une heure »: a short loop of two or three places for the time and the way of moving given |

They chain: you wander, you keep a place in your notebook; you plan, then suggestion takes over on the road.

## 4. Feedback: feeling, labels, comment

When you leave a place, Flâne asks softly « alors ? ». Under ten seconds, nothing required beyond the first tap.

- **Feeling**: one gesture, four levels (0 = didn't like, 1 = liked, 2 = liked a lot, 3 = loved). The symbol is open (heart, smiling face, a leaf, a sun…), to choose on the mockups. Shown on each person's comment, never as a score of the place; the top of the comments reads in words: « 15 personnes sont passées, 8 ont adoré ». Flâne uses feelings behind the scenes to choose what to suggest and how confidently to say it.
- **Labels**: they say *what it is like*, to help someone who has not been there. Descriptive, not aesthetic verdicts (« joli/moche » is the feeling's job):
  - lasting: vue dégagée, ombragé, on entend l'eau, calme, accessible en fauteuil, chiens bienvenus;
  - current state, **fading with time** unless confirmed: sale, bondé, en travaux, fontaine coupée.
- **Comment**: free and optional.
- **Stars** stay for shops only (utility); soul places have feelings and labels (pleasure).

## 5. What nourishes Flâne's soul

- **The right moment, not only the right place**: a viewpoint at golden hour, shade and a fountain at 32°, shelter when it rains, the market on market day, autumn colours.
- **« J'ai une heure »** (in the Flâne mode).
- **Sensory labels** rather than grades.
- **A one-line story**: « cette fontaine date de 1850 » (open heritage data, Wikidata).
- **My private notebook**: the places where I stopped and loved, kept on my phone; **« mes pépites »** = the places *I* gave the highest feeling to (personal, never a public ranking).
- **The local status**: people living near a place can protect it (mark it « coin de locaux », ask to hide it) — protection and moderation by the public itself.
- **Accessibility**: wheelchair, pushchair, children, dogs.
- **Places named by what they are** (« Fontaine », « Point de vue »), no house brand name; « halte » stays a planned stop in a trip.

## 6. What would hurt it

- **Rankings and « top 10 »**: everyone goes to the same places. No ranking, ever, not even of shops.
- **The infinite feed**: Flâne should make you close the app and go.
- **Notifications outside a trip or an open app**.
- **Gamified contributions**: points, levels, best contributor.
- **The mechanics around photos** (not photos themselves: people need to see a place): no likes on photos, no « most beautiful » contest, no photographer profiles to follow.
- **Unsafe advice**: rivers in flood, cliffs, private land — warnings and a way to report danger.
- **Disguised surveillance**: checking that someone stopped before they give feedback happens on the phone only, never by sending a movement history.
- **Selling visibility in suggestions** (Claude's red line; the owner's idea of a premium for shops « like SEO » is to be discussed with the revenue model, looking for a version compatible with the soul: e.g. an enriched, clearly labelled page with no priority in suggestions).

## 7. Protecting the locals' places (the Park4Night problem)

- **Removal on request**: several requests with an explanation, then a moderation decision; the place can be **hidden at once** while it is decided, so it is not exposed meanwhile. A single request can be abused (someone keeping a spot to themselves).
- **Prevention before removal**: Flâne suggests rather than lists. A discreet place is shown to someone passing by at the right moment, not in a catalogue browsed from the sofa; suggestions rotate to spread visits; a fragile or « locals' » place can be shown as an approximate area, or not at all.

## 8. Screens (validated on the mockups, « Alpage » direction)

White, catchy yet soft; pine green for identity; sun orange reserved for « On y va »; slightly round, warm headings.

- **Explore**: full-screen map around the user, filters by wish; the Flâne mode lives here (a « Qu'est-ce que je fais ici ? » button).
- **Short sheet** rising from the bottom over the map; **full place page** to scroll.
- **Planning** (Trajet): start, destination, wishes, proposed stops on a timeline, « Partir avec Google Maps ».
- **Me**: preferences, notebook, about.
- **On the road**: the floating bubble over the GPS app (permission « afficher par-dessus les autres applis », chosen by the owner; a heads-up notification as fallback if refused); one sentence, two tags, two big buttons.

## 9. Open questions

1. The feeling symbol (heart, face, leaf, sun…).
2. The « made here, by people » category: where is the line?
3. Revenue: when the owner is ready.
4. Opening Explore on the user's position needs T2.0 first (update signing, Expo two-factor authentication, data-extraction rules): order of milestone 1 to decide.
5. How the community starts (the owner, then friends; when to open it more widely) and how moderation works in practice.
6. Where open facts go back: objective facts (a fountain exists) could be contributed to OpenStreetMap, while Flâne keeps the subjective (feelings, labels, comments).

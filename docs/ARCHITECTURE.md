# Architecture

The principle: **the phone does almost everything**. Places are stored on it, suggestions are computed on it, and the position only leaves it in the cases listed below. Servers are limited to distributing packs and computing routes.

## Flâne alone

```mermaid
flowchart LR
  subgraph Coulisses["Behind the scenes (regularly)"]
    OSM[(OpenStreetMap)] --> PIPE[Data pipeline<br/>filtering · ranking rules · signing]
    DT[(DATAtourisme)] --> PIPE
    CFG[Stop types<br/>configuration] --> PIPE
    PIPE --> PACKS[(Signed<br/>regional packs)]
  end

  subgraph Telephone["Phone"]
    STORE[(Local storage<br/>trips · preferences · ratings)]
    LOCAL[(Verified<br/>regional pack)]
    ENGINE[Suggestion engine<br/>levels 1 · 3 · 4]
    UI[Interface<br/>full view · on-the-move view · voice]
    GPS[Position<br/>during a trip]
    LOCAL --> ENGINE
    STORE --> ENGINE
    GPS --> ENGINE
    ENGINE --> UI
    UI --> STORE
  end

  PACKS -- HTTPS download --> LOCAL
  ENGINE -- start and destination<br/>position during a recalculation --> ROUTE[Routing server<br/>OSRM · Valhalla · GraphHopper<br/>no logging]
  ROUTE -- route --> ENGINE
  UI -- link --> NAV[Google Maps / Waze]
  UI -- link --> GFICHE[Google Maps page of the place]
```

## What leaves the phone

| To | What | When |
| --- | --- | --- |
| Pack server | The requested region (and, technically, the IP address) | When a region is downloaded |
| Routing server | Start and destination; the current position during a recalculation (and the IP address) | When planning, or when recalculating after a detour |
| Google Maps / Waze | The destination or the waypoints, by link | When the user taps « On y va » or sends their trip |

## At stage 2

Supabase (Postgres and PostGIS) is added for reviews and shared trips. Reviews enrich the packs (tier 1). Shared trips go through actions (`TripAction`) sent from one phone to the other.

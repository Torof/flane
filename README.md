# Flâne

Le compagnon de route qui te souffle où t'arrêter, pour faire du trajet une partie du voyage.

Flâne est une appli mobile (Android d'abord) qui suggère les bons arrêts sur un trajet : points de vue, pique-nique, boulangeries de village, balades pour les chiens, baignades. Elle s'appuie sur des données ouvertes (OpenStreetMap, DATAtourisme), calcule tout sur le téléphone, et laisse la navigation à Google Maps ou Waze.

- Vision et cadre : [`docs/VISION.md`](docs/VISION.md)
- Méthode de construction : [`docs/METHODE.md`](docs/METHODE.md)
- Où en est le projet : [`docs/JOURNAL.md`](docs/JOURNAL.md) et [`docs/BACKLOG.md`](docs/BACKLOG.md)

## L'appli

L'appli Expo (React Native, TypeScript) vit dans [`app/`](app/).

```sh
tools/dev/setup.sh        # hooks git, gitleaks, Node (version de app/.nvmrc, par nvm)
cd app
nvm use                   # Node 24
npm ci                    # dépendances, sans script d'installation (.npmrc)
npm run check             # types, lint, formatage, notices SPDX, tests
npm start                 # serveur de développement (Metro)
```

Tests seuls : `npm test`. Inventaire des licences de production : `npm run licenses`.

Compilation par EAS Build (compte Expo nécessaire, `eas login` ; eas-cli 16.27.0 utilisé ici) :

```sh
tools/dev/make-dev-keystore.sh                 # une fois, avant la première compilation : keystore de développement
cd app
EXPO_NO_TELEMETRY=1 eas build -p android -e preview        # APK autonome « Flâne (dev) », pour tester sans PC
EXPO_NO_TELEMETRY=1 eas build -p android -e development    # client de développement, pour coder avec Metro
```

Les deux profils produisent la variante `app.flane.dev` ; `app.flane` est réservé à la version publiée (profil `production`, sans clé pour l'instant : T5.4). Le keystore et `app/credentials.json` restent sur ce PC, ignorés par git : ne les copier nulle part. Pour couper la télémétrie des outils Expo dans votre shell : `export EXPO_NO_TELEMETRY=1`. Pour lire les permissions d'un APK produit : `python3 -I tools/dev/read-manifest.py fichier.apk`.

## Contribuer au dépôt

Après avoir cloné : `tools/dev/setup.sh` active les hooks git du projet (format des commits, recherche de secrets, vérifications avant envoi), installe gitleaks dans `~/.local/bin` et la version de Node attendue. Méthode et conventions : [`docs/METHODE.md`](docs/METHODE.md), [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md).

## Licence

Copyright (C) 2026 Torof.

Flâne est un logiciel libre, distribué sous la licence GNU Affero General Public License, version 3 ou ultérieure (AGPL-3.0-or-later). Voir [`LICENSE`](LICENSE). Le nom « Flâne » n'est pas couvert par cette licence.

Données cartographiques © les contributeurs d'OpenStreetMap, sous licence ODbL.

Projet en construction.

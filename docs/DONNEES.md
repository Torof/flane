# Inventaire des données

Chaque donnée que Flâne touche, où elle vit, pourquoi, et combien de temps. C'est de cet inventaire que découleront la politique de confidentialité et les formulaires de Google Play et de l'App Store. **Toute tranche qui touche une donnée met ce tableau à jour.**

## Données de l'utilisateur (Flâne seule)

| Donnée | Pourquoi | Où elle vit | Quitte le téléphone ? | Durée de conservation |
| --- | --- | --- | --- | --- |
| Position en cours | Suggestions en route | Mémoire du téléphone, pendant un trajet actif | Seulement lors d'un recalcul après détour : envoyée comme nouveau départ au serveur d'itinéraire | Pas conservée après le trajet (à confirmer en tranche) |
| Départ et arrivée d'un trajet | Calcul de l'itinéraire | Téléphone | Oui, vers le serveur d'itinéraire. Le départ est souvent la position de l'utilisateur | Le temps du calcul ; serveur choisi pour ne rien conserver |
| Destination et étapes choisies | Navigation | Téléphone | Oui, vers Google Maps ou Waze, par lien, quand l'utilisateur le demande. Elles sont alors soumises aux règles de confidentialité de Google ou de Waze | Hors de notre contrôle une fois transmises |
| Trajets planifiés | Mode planifié | Stockage privé de l'appli | Non | Jusqu'à suppression par l'utilisateur |
| Préférences (chiens, pique-nique, détour max…) | Personnaliser les suggestions | Stockage privé de l'appli | Non | Jusqu'à suppression par l'utilisateur |
| Notes personnelles (« j'aime », « pas pour moi ») | Apprendre les goûts | Stockage privé de l'appli | Non | Jusqu'à suppression par l'utilisateur |
| Journaux techniques | Diagnostiquer les bugs | Stockage privé de l'appli | Seulement si l'utilisateur les exporte lui-même | Rotation courte (à définir) ; **jamais de position** |
| Adresse IP | Effet technique de toute connexion | — | Visible par le serveur de paquets (avec la région demandée) et par le serveur d'itinéraire | À limiter côté serveur (pas de journalisation ou journalisation courte) |
| Appel au serveur de mises à jour (variante de test `app.flane.dev`, canal `preview`, D-023) | Recevoir le code de la nouvelle tranche sans réinstaller | Espace privé de l'appli : identifiant d'installation, base des mises à jour, fichiers téléchargés, journal d'`expo-updates` (24 h), journal d'erreur fatale ; `allowBackup` désactivé | Oui, à chaque ouverture, vers les serveurs d'Expo (manifeste sur `u.expo.dev`, ressources sur leur CDN ; l'adresse IP est vue aux deux endroits) : plateforme, versions du protocole, version native (empreinte), canal, un identifiant aléatoire propre à l'installation (`EAS-Client-ID`), l'identifiant de la mise à jour en cours et de celle embarquée, la liste des mises à jour récemment en échec, et le texte d'une éventuelle erreur fatale d'`expo-updates` au lancement précédent (1024 caractères au plus, interne au module). Expo en tire des comptes de lancements et des taux d'échec par mise à jour. Jamais de position, de trajet ni de préférence ; la version de l'appli ne figure pas dans la requête. Le client de développement ne va pas chercher de mise à jour tout seul (il peut en charger une sur demande depuis son lanceur) ; la variante publiée `app.flane` n'appelle pas ce serveur, décision en T5.4 | Côté Expo, selon leur politique ; sur le téléphone, jusqu'à la désinstallation |

Aucun compte utilisateur, aucun identifiant publicitaire, aucun outil de statistiques.

**Vérifications automatiques (GitHub Actions, T0.2)** : elles ne touchent aucune donnée d'usage. GitHub reçoit le code du dépôt, déjà public, et les runners téléchargent les paquets npm et gitleaks ; `npm audit` envoie au registre npm la liste des paquets du fichier de verrouillage (données publiques). Journaux et résumés des jobs sont publics : la recherche de secrets sort expurgée (règle, fichier, ligne, jamais la valeur) et ne dépose aucun rapport.

**Retours des utilisateurs par GitHub Issues** (dépôt public depuis T0.1) : ce qu'un utilisateur y écrit est public et hors de notre contrôle. Les modèles d'issues demandent un tronçon approximatif (« entre Briançon et Embrun ») et interdisent coordonnées, adresses et captures d'écran montrant la position. Le bouton « signaler un problème » de l'appli (T5.3) suivra la même règle : export des journaux sans position, jamais de position dans une issue.

## Pilotage du projet (T0.4a)

Aucune donnée d'usage de l'appli. Le corps des pull requests et les commentaires de Claude sont **publics**, comme le dépôt : contenu borné par `docs/CONVENTIONS.md` (ni position, ni trajet, ni préférence, ni adresse, ni détail d'une faille ouverte). `tools/dev/owner-signals.mjs` lit ces commentaires publics par `gh`, sur le PC, et ne les envoie nulle part ; il n'affiche pas le texte des commentaires d'autres comptes. Son état local, `.git/flane-signals.json`, ne contient que des dates et des états de pull request, hors du dépôt. `tools/dev/session-state.sh` (hook d'ouverture de session) lit l'état git local, les titres et auteurs des pull requests ouvertes, les signaux et l'état des vérifications, et les affiche dans le contexte local de Claude, sans rien envoyer. `tools/dev/stop-gate.mjs` (hook avant chaque commande) lit la commande localement et n'appelle `gh` que pour une fusion, une publication ou une compilation.

## Données publiques utilisées

| Source | Usage | Licence | Obligations |
| --- | --- | --- | --- |
| OpenStreetMap | Lieux, routes, fonds de carte | ODbL | Afficher « © les contributeurs d'OpenStreetMap » **dans l'appli** (carte, fiche du lieu ou écran « À propos ») ; repartager sous ODbL la base de lieux dérivée, puisque les paquets sont distribués |
| DATAtourisme | Lieux touristiques, labels | Licence Ouverte Etalab 2.0 | Citer la source et la date de dernière mise à jour |
| Listes de labels (ex. Plus Beaux Villages de France) | Règles de tri | À vérifier | À préciser avant usage |

## À l'étape 2 (à compléter le moment venu)

Avis et étiquettes, trajets partagés, éventuels comptes. Chacun devra être ajouté ici avant d'être construit.

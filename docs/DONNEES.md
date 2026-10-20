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

Aucun compte utilisateur, aucun identifiant publicitaire, aucun outil de statistiques.

## Données publiques utilisées

| Source | Usage | Licence | Obligations |
| --- | --- | --- | --- |
| OpenStreetMap | Lieux, routes, fonds de carte | ODbL | Afficher « © les contributeurs d'OpenStreetMap » **dans l'appli** (carte, fiche du lieu ou écran « À propos ») ; repartager sous ODbL la base de lieux dérivée, puisque les paquets sont distribués |
| DATAtourisme | Lieux touristiques, labels | Licence Ouverte Etalab 2.0 | Citer la source et la date de dernière mise à jour |
| Listes de labels (ex. Plus Beaux Villages de France) | Règles de tri | À vérifier | À préciser avant usage |

## À l'étape 2 (à compléter le moment venu)

Avis et étiquettes, trajets partagés, éventuels comptes. Chacun devra être ajouté ici avant d'être construit.

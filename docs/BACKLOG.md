# Backlog

Statuts : **Idée** → **Prête** (fiche validée) → **En cours** → **À tester sur la route** → **Faite**. Une seule tranche « En cours » à la fois. Les budgets sont en sessions et se fixent à l'étape Planifier.

## En cours

Aucune tranche en cours. Prochaine : **T0.3** (squelette de l'appli, pour commencer à coder), puis T0.2 (vérifications automatiques, qui ont besoin de l'appli pour avoir quelque chose à vérifier).

## Questions ouvertes

- [ ] **Dépôt de marque « Flâne » (INPI)** : quand ? Depuis le passage en public (D-019), le nom est la seule chose que la licence ne protège pas. Prévu en T5.5 ; à avancer si possible.
- [x] **Région du premier paquet** (jalon 1) : les Hautes-Alpes (05). *Répondu le 2026-10-20.*
- [x] **Trajet de référence** : Briançon–Embrun (trajet connu par cœur) ; trajet long : Briançon–Marseille. *Répondu le 2026-10-20.*
- [x] **Nom du dépôt GitHub et identifiant de l'appli** : dépôt `flane`, identifiant de paquet Android `app.flane`, nom affiché « Flâne » (voir D-015). *Répondu le 2026-10-20.*

---

## Jalon 0 — L'atelier est prêt

*Critère : une modification passe automatiquement toutes les vérifications, et une appli Flâne vide s'installe sur le téléphone de l'utilisateur.*

| ID | Tranche | Statut |
| --- | --- | --- |
| T0.1 | Dépôt et conventions : hooks git locaux dans `.githooks/` (secrets avec gitleaks, format des commits, pré-push), `.editorconfig`, licence AGPL-3.0 et passage en public, modèles d'issues et de PR, réglages GitHub (règle sur `main`, recherche de secrets, alertes), D-017 à D-019. Le garde-fou de Claude livré ici a été retiré ensuite (D-022) | Faite |
| T0.1b | Kit Claude : mode « accept edits », D-021 (qui décide quoi). La liste `allow` figée et le garde-fou durci ont été retirés (D-022) | Faite, puis simplifiée |
| T0.2 | Vérifications automatiques (GitHub Actions) : types, lint, tests, audit des dépendances, recherche de secrets, licences ; exigées par la règle sur `main` ; Dependabot ; résumé court des échecs pour Claude | Idée |
| T0.3 | Squelette de l'appli Expo : TypeScript strict, ESLint et Prettier, fichiers de traduction, notice SPDX en tête des fichiers, `.npmrc` (`ignore-scripts`, `save-exact`), `.nvmrc`, compilation de développement installée sur Android | Idée |
| T0.4 | Historique des versions automatique (à partir des messages de commit) et version par jalon | Idée |

## Jalon 1 — Je vois les bons coins de ma région

*Critère : sur le visualiseur, l'utilisateur reconnaît les lieux qu'il aime, avec peu de faux positifs.*

| ID | Tranche | Statut |
| --- | --- | --- |
| T1.1 | Types d'arrêts en configuration : schéma, validation, première liste (voir `docs/VISION.md` et la liste ci-dessous) | Idée |
| T1.2 | Extraction OSM d'une région : récupération, filtrage selon les types, identifiants stables | Idée |
| T1.3 | DATAtourisme (Licence Ouverte Etalab 2.0 : citer la source et la date de mise à jour) : intégration et rapprochement avec OSM | Idée |
| T1.4 | Règles de tri et paliers de sources (paliers 3 et 4 pour l'instant) | Idée |
| T1.5 | Paquet régional : format de base locale, signature, vérificateur de paquets | Idée |
| T1.6 | Visualiseur de lieux et « pourquoi ce lieu ? » | Idée |

## Jalon 2 — Je prépare un trajet

*Critère : l'utilisateur prépare son prochain vrai trajet en moins de dix minutes, et les haltes proposées lui donnent envie.*

| ID | Tranche | Statut |
| --- | --- | --- |
| T2.1 | Stockage local et modèle de données : le trajet comme objet, les modifications comme actions, identifiants stables, hors ligne d'abord | Idée |
| T2.2 | Chargement et vérification d'un paquet régional dans l'appli | Idée |
| T2.3 | Préférences, saisies une fois | Idée |
| T2.4 | Trajet : départ, arrivée, calcul d'itinéraire (choix du moteur et du service) | Idée |
| T2.5 | Moments et haltes proposées le long du trajet (demande structurée : type, moment, critères) | Idée |
| T2.6 | Fiche du lieu, mention « © les contributeurs d'OpenStreetMap » visible dans l'appli, et bouton « Voir sur Google Maps » (sans identifiant Google, ce lien est une recherche : vérifier qu'il ouvre le bon lieu) | Idée |
| T2.7 | Envoi du trajet vers Google Maps (étapes) ou Waze (étape par étape) | Idée |
| T2.8 | Banc d'essai des suggestions sur le trajet de référence | Idée |

## Jalon 3 — Flâne m'accompagne en route

*Critère : sur un vrai trajet, Flâne parle au bon moment, sans jamais déranger, et sans vider la batterie.*

| ID | Tranche | Statut |
| --- | --- | --- |
| T3.1 | Simulateur de trajet : enregistrer un vrai trajet, le rejouer, en accéléré | Idée |
| T3.2 | Localisation pendant un trajet : autorisations, limitée au trajet actif. Étudier un service de premier plan (notification visible pendant le trajet), qui peut éviter l'autorisation de localisation en arrière-plan et simplifier la validation Google Play | Idée |
| T3.3 | Moteur en route : niveaux 1, 3 et 4, bascules automatiques, recalcul après détour | Idée |
| T3.4 | Suggestion en mouvement : phrase courte, deux boutons, moments calmes, espacement | Idée |
| T3.5 | Voix : synthèse vocale d'Android, écouteur de phrases, coexistence avec la musique | Idée |
| T3.6 | Mesure de la batterie sur un trajet simulé | Idée |

## Jalon 4 — Flâne apprend de moi

*Critère : après quelques trajets, l'utilisateur sent que les suggestions lui ressemblent davantage.*

| ID | Tranche | Statut |
| --- | --- | --- |
| T4.1 | « J'aime » et « pas pour moi », enregistrés pour devenir les futurs avis | Idée |
| T4.2 | Palier 2 (notes personnelles) et ton qui suit la confiance | Idée |
| T4.3 | Carnet de route (note rapide pendant un trajet test) | Idée |

## Jalon 5 — Je le confie à un ami

*Critère : un ami installe Flâne et l'utilise sur un de ses trajets, sans aide.*

| ID | Tranche | Statut |
| --- | --- | --- |
| T5.1 | Paquets pour d'autres régions et mises à jour partielles | Idée |
| T5.2 | Politique de confidentialité (à partir de `docs/DONNEES.md`) | Idée |
| T5.3 | Bouton « signaler un problème » (export des journaux, sans position) | Idée |
| T5.4 | Diffusion en test fermé sur Google Play (formulaire des données, justification de la localisation) | Idée |
| T5.5 | Licence : avis juridique, décision finale, dépôt de marque | Idée |

---

## Première liste de types d'arrêts (pour T1.1)

- **Manger** : boulangerie, marché, épicerie fine et produits locaux, vente à la ferme, traiteur, café avec terrasse, glacier.
- **Pause** : table de pique-nique, banc avec vue, coin ombragé.
- **Nature** : point de vue, balade courte, bord de rivière ou de lac, baignade, cascade, forêt.
- **Chiens** : endroit pour les lâcher, petite balade.
- **Patrimoine** : joli village, château ou ruine, chapelle, lavoir ou fontaine, lieu insolite.
- **Moments** : coin pour le coucher de soleil.
- **Pratique** : toilettes, eau potable, essence, recharge électrique, aire de jeux pour enfants.

---

## Parking

Idées notées, traitées en fin de jalon. Ne pas s'y attaquer avant.

**Étape 2 (déjà décidée dans la vision)**
- Avis des flâneurs : étoiles « ça valait le détour ? », commentaire court, étiquettes factuelles, notation après arrêt vérifié.
- Flâne partagée : vues conducteur et passager, trajet partagé par actions, éphémère, hors ligne.
- Supabase pour les avis et le partage.

**Plus tard**
- Import d'un trajet depuis Google Maps (niveau 2).
- Réponse vocale « oui » / « non », puis demandes en langage naturel avec une IA.
- Professionnels (commerces, offices de tourisme) avec vérification.
- CarPlay et Android Auto.
- Convoi de plusieurs voitures.
- Vélo, moto, van ; usage domicile-travail ; autres pays ; iOS.
- Tests de parcours complets (Maestro), galerie d'écrans (Storybook), carnet de route transcrit par Claude.

**Outillage**
- Banc d'essai en PR : le banc d'essai tourne sur le trajet de référence à chaque pull request et poste la différence avec `main` (après T2.8).
- `SECURITY.md` et politique de signalement des failles (jalon 5).
- Démarrage automatique de session (hook `SessionStart` qui charge journal, backlog et issues), si `/debut` devient lourd.

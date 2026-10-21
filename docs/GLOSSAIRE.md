# Glossaire

Les mêmes mots partout : dans les documents, dans les conversations et dans le code. La colonne « Dans le code » donne le nom anglais à utiliser (types, variables, fichiers). Toute tranche qui introduit un terme l'ajoute ici.

## Le produit

| Terme | Définition | Dans le code |
| --- | --- | --- |
| Flâne | L'appli. | `flane` |
| Flâneur | Un utilisateur de Flâne. | `user` |
| Trajet | Un déplacement d'un départ à une arrivée, planifié ou non. Objet à part entière, avec un identifiant stable. | `Trip` |
| Halte | Un arrêt retenu dans un trajet. | `Stop` |
| Lieu | Un endroit où l'on peut s'arrêter, issu des données. Identifiant stable. | `Place` |
| Type d'arrêt | Une catégorie de lieu (boulangerie, point de vue…), définie en configuration. | `StopType` |
| Famille | Un regroupement de types d'arrêts (Manger, Pause, Nature, Chiens, Patrimoine, Moments, Pratique). | `StopFamily` |
| Préférences | Les réglages permanents de l'utilisateur (chiens, pique-nique, détour max…). | `Preferences` |
| Moment | Un besoin placé dans le temps sur le trajet (« manger vers 2 h de route »). | `Moment` |
| Demande | Une recherche structurée : type d'arrêt, moment ou position, critères. Ce que la voix ou une IA fabriquera plus tard. | `StopRequest` |
| Suggestion | Un lieu proposé en réponse à une demande, avec sa justification. | `Suggestion` |
| Couloir | La zone autour de l'itinéraire où l'on cherche des haltes, selon le détour maximum. | `Corridor` |
| Détour | Le temps ou la distance supplémentaire pour rejoindre une halte. | `detour` |
| Action | Une modification élémentaire d'un trajet (« halte ajoutée », « halte retirée »). Base du futur partage. | `TripAction` |

## Ce que Flâne sait de la route

| Terme | Définition | Dans le code |
| --- | --- | --- |
| Niveau de connaissance | Ce que Flâne sait de la route : 1 planifié, 2 importé, 3 destination seule, 4 rien (autour de moi). | `RouteKnowledge` (`planned`, `imported`, `destination`, `none`) |
| Mode découverte | Le niveau 4 : suggestions autour de soi, plus courtes et plus prudentes. | `discovery` |
| Moment calme | Un moment où Flâne a le droit de parler (pas en ville, pas sur un échangeur, pas avant une sortie). | `quietWindow` |

## Les données

| Terme | Définition | Dans le code |
| --- | --- | --- |
| Paquet régional | La base de lieux d'une région, téléchargée sur le téléphone, signée. | `RegionPack` |
| Chaîne de fabrication | Le script qui produit les paquets à partir d'OSM et de DATAtourisme. | `data-pipeline` |
| Palier de source | La source qui juge un lieu : 1 avis, 2 notes personnelles, 3 règles, 4 OSM brut. | `SourceTier` |
| Règle de tri | Une règle simple qui fait monter ou descendre un lieu (nommé, présent dans DATAtourisme, labellisé…). | `RankingRule` |
| Note de confiance | La force de ce que Flâne sait d'un lieu ; elle décide du ton. | `confidence` |
| Étiquette | Une caractéristique factuelle d'un lieu (ombragé, chiens bienvenus…). | `Tag` |
| Onglet | Une des entrées du bas de l'écran (Trajet, Préférences, À propos). | `Tabs`, `(tabs)/` |
| Route mince | Un fichier de `src/app/` qui ne fait que désigner l'écran à afficher ; l'écran lui-même vit dans `src/ui/`. | `src/app/(tabs)/about.tsx` |
| Traduction | Un texte affiché, toujours lu par `t('clé')` dans un fichier de langue, jamais écrit en dur. | `t`, `src/i18n/fr.json` |

## La méthode

Attention au mot **« étape »**, qui a trois sens. Pour lever l'ambiguïté :
- **étape du cycle** : l'une des sept étapes d'une tranche (Planifier… Valider) ;
- **étape du produit** : Flâne seule (étape 1), Flâne communautaire et partagée (étape 2) ;
- **halte** (et non « étape ») pour un arrêt d'un trajet. On ne parle d'« étapes » que pour les points de passage envoyés à Google Maps (`waypoints` dans le code).

| Terme | Définition |
| --- | --- |
| Tranche | Une petite fonctionnalité complète, finissable en une à trois sessions. Identifiant `Tx.y`. |
| Jalon | Un moment d'usage réel avec un critère vérifiable. Identifiant `Jx`. |
| Fiche de tranche | Le document de planification d'une tranche (`docs/tranches/`). |
| Budget | Le nombre de sessions alloué à une tranche. |
| Parking | La liste des idées nouvelles, revues en fin de jalon. |
| Définition de « fini » | La liste de contrôle qui dit qu'une tranche est terminée. |
| Journal | Le fichier qui dit où on en est (`docs/JOURNAL.md`). |
| Carnet de route | Les notes prises pendant un trajet test (`docs/carnet-de-route/`). |
| Trajet de référence | Le scénario fixe utilisé pour tester et comparer toutes les versions. |
| Banc d'essai | L'outil qui sort la liste des suggestions sur le trajet de référence. |
| Simulateur de trajet | L'outil qui rejoue un trajet enregistré. |
| Porte | Ancien nom (D-016) des moments où l'utilisateur valide ; remplacé par les moments du rituel (D-028) : son oui sur la fiche, l'essai. |
| Garde-fou | Un contrôle automatique qui bloque une action interdite : hook git (`.githooks/`), règle GitHub sur `main`. Le hook de Claude Code qui analysait chaque commande a été retiré (D-022). |
| Variante | Une version de l'appli construite avec son propre identifiant Android : `app.flane.dev` pour le développement et les essais, `app.flane` pour la publication (D-015). Les deux cohabitent sur un téléphone. Choisie par `APP_VARIANT` dans `app/app.config.ts`. |
| Client de développement | L'appli compilée avec `expo-dev-client` : elle charge le code depuis le PC (Metro) et accepte les modules natifs. Ne marche pas sans le PC. Profil EAS `development`. |
| APK d'essai | L'appli compilée avec le code embarqué, installable et utilisable sans PC. C'est elle qu'on teste à l'essai. Profil EAS `preview`. |
| Mise à jour instantanée | Le code JavaScript d'une tranche livré à l'APK d'essai sans réinstallation (EAS Update, `expo-updates`), publié par Claude à l'essai sur le canal `preview`. Réservé à `app.flane.dev` (D-023). |
| Version native | L'empreinte des modules natifs de l'APK (`runtimeVersion`). Une mise à jour instantanée ne s'applique qu'à la même version native ; quand elle change, il faut un nouvel APK. Visible dans « À propos ». |
| Canal | Le nom sous lequel un APK reçoit ses mises à jour instantanées (`preview`). Un futur canal `beta` servira aux testeurs amis. |
| Vérifications automatiques | Le workflow GitHub Actions `checks` (`app-check`, `secrets-check`, `deps-check`, `version-check`) qui contrôle chaque pull request. Les quatre sont **obligatoires** : la règle `protect-main` refuse la fusion tant qu'ils ne sont pas verts ; `deps-check` ne passe au rouge sur une pull request que si elle touche les fichiers de paquets. |
| Alerte acceptée | Une alerte `npm audit` haute ou critique que `deps-check` ne bloque pas, parce que le paquet n'est chargé par aucun module de l'appli (outillage sur le PC). Inscrite dans `tools/dev/audit-accepted.json` avec ses chemins et sa date (`docs/CONVENTIONS.md`). |
| Tranche de dépendances | La tranche courte qui reprend une pull request Dependabot entre deux tranches (D-025). |
| Veto | L'arrêt demandé par l'utilisateur, à tout moment : pull request fermée ou repassée en brouillon, commentaire qui commence par « veto » ou « stop ». |
| Point de contrôle | Le moment où Claude lit les signaux de l'utilisateur (`tools/dev/owner-signals.mjs`) : avant chaque commit, push, agent, publication, compilation et fusion, et à l'ouverture de chaque session. |
| Signature de Claude | La ligne cachée `<!-- flane:claude -->` en tête de chaque commentaire posté par Claude, qui utilise le compte de l'utilisateur. |
| Noticed on the way (remarqué en route) | La rubrique de fin de chaque rapport d'agent et de chaque pull request : trois remarques au plus, *problème*, *réussite* ou *idée*. |
| Rituel | La suite de moments d'une session (ouverture, idée, fiche, construction, passe de sécurité, essai, clôture) que Claude mène et annonce, avec ses réflexes (D-028, `docs/METHOD.md`). |
| Réflexe | Ce que Claude dit de lui-même au bon moment : parking, couper, nouvelle version, passe de sécurité, découverte, pas de côté (`docs/METHOD.md`). |
| Pas de côté | Un point hors de la tâche que Claude soulève à l'ouverture et à la clôture : risque qui monte, autre façon de faire, idée du parking devenue mûre. |
| Boîte de réception | GitHub Issues : les retours et idées venus de l'extérieur, vidés vers le backlog ou le parking à chaque début de session (D-017). |

## L'étape 2 (pour mémoire)

| Terme | Définition | Dans le code |
| --- | --- | --- |
| Avis | La note « ça valait le détour ? », un commentaire et des étiquettes. | `Review` |
| Vue conducteur / vue passager | Les deux affichages de l'appli dans un trajet partagé. | `driverView` / `passengerView` |
| Trajet partagé | Un trajet suivi par plusieurs téléphones d'une même voiture. | `SharedTrip` |

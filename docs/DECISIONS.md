# Journal des décisions

Les choix structurants, avec leurs raisons. Une décision n'est jamais effacée : si elle change, on en ajoute une nouvelle qui la remplace. Modèle : `docs/modeles/DECISION.md`. Les plus récentes en haut.

---

## D-016 — Trois portes de validation, autonomie entre elles · 2026-10-20 · Acceptée
La validation explicite de l'utilisateur est obligatoire à trois portes : **Choisir** (la fiche de tranche validée autorise le code, dans son périmètre et pas au-delà), **Observer** (l'utilisateur constate le résultat) et **Intégrer** (fusion de la pull request, délégable à Claude tranche par tranche). Entre les portes, Claude enchaîne seul : branche, code par petits morceaux, tests, commits, push, pull request, agents de vérification, correction de leurs points bloquants dans le périmètre de la fiche, journal et backlog. Il s'arrête et demande pour tout ce qui sort du périmètre : dépendance non prévue, donnée non listée dans la fiche, exception à la méthode. **Pourquoi** : l'utilisateur décide et teste, il n'opère pas ; un accord à chaque commit n'ajoute aucun contrôle utile et ralentit tout. Les garde-fous (hooks, vérifications automatiques, agents) tiennent le rôle de la relecture pas à pas. Inventaire dans `docs/OUTILLAGE.md`. **Vigilance** : le périmètre de la fiche devient la frontière de l'autonomie ; une fiche floue donne trop de latitude. L'avocat du diable y veille.

## D-015 — Identifiant de l'appli : `app.flane` · 2026-10-20 · Acceptée
Identifiant de paquet Android `app.flane` ; nom affiché « Flâne » ; dépôt GitHub `flane`. **Pourquoi** : l'identifiant est définitif une fois publié sur Google Play ; il doit donc être court, sans accent et sans référence à un pays, pour une appli qui commence en France mais vise l'international. `fr.flane` écarté pour cette raison ; `com.flane.app` et `io.flane` écartés car plus longs sans avantage. Correspond au domaine `flane.app`, non acheté à ce jour. **Vigilance** : vérifier à la première publication (T5.4) qu'aucune appli ne porte déjà cet identifiant ; envisager l'achat du domaine `flane.app`.

## D-014 — Méthode de construction · 2026-10-20 · Acceptée
Cycle en sept temps par tranche, jalons d'usage plutôt que sprints, une seule tranche en cours, budget par tranche, parking, journal de session, définition de « fini ». Claude fait respecter la méthode ; les exceptions sont consignées. **Pourquoi** : construire à deux (humain et IA) demande de la continuité entre sessions et un contradicteur, pas des rituels d'équipe. Détail : `docs/METHODE.md`.

## D-013 — Licence : direction AGPL-3.0, dépôt privé au départ · 2026-10-20 · À confirmer
Le dépôt reste privé au début. La direction est l'AGPL-3.0, avec un dépôt de marque « Flâne » à l'INPI. Avis juridique avant de rendre le dépôt public. **Pourquoi** : rester open source sans qu'on puisse refermer le code ; la valeur de Flâne est dans les données, les partenariats et le nom. **Vigilance** : compatibilité GPL/AGPL avec l'App Store ; accord de contribution si d'autres contribuent.

## D-012 — Aucun outil tiers de suivi · 2026-10-20 · Acceptée
Ni statistiques, ni publicité, ni SDK qui envoie des données ailleurs. **Pourquoi** : ce sont les principales sources de fuite de position dans les applis.

## D-011 — Voix : synthèse vocale d'Android, réponse par boutons · 2026-10-20 · Acceptée
Dès la première version, Flâne parle ; l'utilisateur répond par deux gros boutons. Ensuite « oui »/« non » à la voix, puis demandes en langage naturel avec une IA. Une recherche est décrite dès le départ comme une demande structurée (type d'arrêt, moment, critères). **Pourquoi** : la voix est essentielle au volant ; la reconnaissance vocale est un chantier à part.

## D-010 — Google en renvoi uniquement · 2026-10-20 · Acceptée
Aucune donnée Google récupérée ni stockée. Un bouton « Voir sur Google Maps » ouvre la fiche du lieu dans l'appli Google ; le trajet est envoyé à Google Maps ou Waze par lien. **Pourquoi** : gratuit, sans contrainte de licence, cohérent avec « au-dessus, pas dedans ». Les conditions de Google Maps Platform interdisent de stocker son contenu et de l'afficher sur une carte non Google. **Vigilance** : sans identifiant Google du lieu, le lien vers la fiche est une recherche (nom et coordonnées) et peut ouvrir le mauvais lieu ; à vérifier en T2.6.

## D-009 — Serveur : presque rien pour Flâne seule, Supabase à l'étape 2 · 2026-10-20 · Acceptée
Flâne seule n'a besoin que de distribuer des paquets et de calculer des itinéraires. Supabase (open source, hébergeable soi-même, Postgres et PostGIS) pour les avis et le partage. **Pourquoi** : connu depuis Junto, robuste, pas d'enfermement.

## D-008 — Calcul d'itinéraire : moteur open source · 2026-10-20 · Acceptée
OSRM, Valhalla ou GraphHopper (choix en tranche). Service gratuit au début, puis serveur hébergé par nous. Itinéraire calculé une fois par trajet, plus un recalcul en cas de détour. **Pourquoi** : open source, basé sur OSM, coût faible même à grande échelle. **Vigilance** : le serveur reçoit le départ (souvent la position de l'utilisateur) ; choisir un service à la politique de confidentialité écrite, jamais le serveur de démonstration public d'OSRM.

## D-007 — Carte : MapLibre et fonds OSM · 2026-10-20 · Acceptée
MapLibre (open source) plutôt que Mapbox, avec des fonds de carte OSM hébergés par nous à terme. **Pourquoi** : Mapbox devient payant à grande échelle ; les fonds publics gratuits n'offrent aucune garantie.

## D-006 — Données : OpenStreetMap et DATAtourisme, chaîne maison · 2026-10-20 · Acceptée
Un script récupère OSM et DATAtourisme, filtre selon la liste des types d'arrêts, applique les règles de tri et fabrique les paquets régionaux. **Pourquoi** : sources ouvertes et gratuites ; le tri des lieux est le cœur de Flâne, donc ce qu'on construit nous-mêmes. **Obligations** : OSM sous ODbL (mention visible dans l'appli, base dérivée repartagée sous ODbL) ; DATAtourisme sous Licence Ouverte Etalab 2.0 (citer la source et la date).

## D-005 — Lieux stockés sur le téléphone, par paquets régionaux · 2026-10-20 · Acceptée
Les suggestions se calculent sur le téléphone à partir d'une base locale téléchargée par région, signée. **Pourquoi** : gratuit, fonctionne sans réseau, la position n'est pas transmise pour obtenir des suggestions, tient à grande échelle.

## D-004 — Paliers de sources et ton qui suit la confiance · 2026-10-20 · Acceptée
Lieu par lieu : avis des flâneurs, puis notes personnelles, puis règles simples, puis OSM brut. Formulation modeste tant que rien n'est validé. **Pourquoi** : pas besoin de savoir d'emblée ce qui est « chouette » ; Flâne s'affine avec l'usage.

## D-003 — Types d'arrêts en configuration · 2026-10-20 · Acceptée
Chaque type d'arrêt est une entrée de configuration (nom, icône, famille, correspondances OSM et DATAtourisme), pas du code. **Pourquoi** : ajouter ou retirer un type doit être trivial.

## D-002 — Pas de compte utilisateur dans Flâne seule · 2026-10-20 · Acceptée
Tout reste sur le téléphone. **Pourquoi** : plus simple, et cohérent avec la vie privée.

## D-001 — Plateforme : Android d'abord, avec React Native, Expo et TypeScript · 2026-10-20 · Acceptée
Un seul code pour Android maintenant et iOS plus tard. **Pourquoi** : stack déjà maîtrisée sur Junto ; open source ; Expo gère la localisation en arrière-plan, la synthèse vocale et les notifications. **Vigilance** : le service de compilation d'Expo est payant au-delà d'un quota ; compilation locale possible.

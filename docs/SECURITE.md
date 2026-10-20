# Sécurité

La sécurité est pensée dès la fiche de tranche, puis vérifiée par un audit indépendant à chaque tranche. Ce document évolue : chaque audit peut l'enrichir.

## Les principes

1. **Collecter le minimum.** Ce qu'on ne collecte pas, on n'a pas à le protéger.
2. **La position reste sur le téléphone**, avec des exceptions limitées et listées dans `docs/DONNEES.md` : le départ et l'arrivée (et la position courante lors d'un recalcul après détour) vont au serveur d'itinéraire ; la destination va à Google Maps ou Waze par lien, à la demande de l'utilisateur. Le serveur d'itinéraire est choisi, puis configuré, pour ne rien conserver.
3. **Aucun outil tiers de suivi** : ni statistiques, ni publicité, ni SDK qui envoie des données ailleurs.
4. **Aucun secret dans le dépôt.**
5. **Ne jamais faire confiance à ce qui vient de l'extérieur** : paquets de lieux, réponses des serveurs, fichiers importés sont validés avant usage.
6. **Le moins de dépendances possible**, chacune justifiée et contrôlée.
7. **Défense en profondeur** : les vérifications automatiques, l'audit et la relecture se complètent.

## La carte des risques

### Dès Flâne seule

| Risque | Conséquence | Parade |
| --- | --- | --- |
| Fuite de la position ou des trajets | Atteinte grave à la vie privée | Traitement sur le téléphone ; jamais de position dans les journaux ; aucun SDK tiers ; inventaire des données à jour |
| Le serveur d'itinéraire conserve les trajets | Historique des déplacements exposé | Au début, service tiers choisi pour sa politique de confidentialité écrite (jamais le serveur de démonstration public d'OSRM, qui n'est pas fait pour les applis) ; à terme, notre serveur, sans journalisation des requêtes |
| Paquet de lieux falsifié | Faux lieux, par exemple pour attirer quelqu'un dans un endroit isolé | Paquets signés ; signature vérifiée sur le téléphone avant usage ; téléchargement en HTTPS |
| Dépendance compromise ou vulnérable | Code malveillant dans l'appli | Dépendances minimales ; fichier de verrouillage ; audit automatique ; mises à jour régulières |
| Secret publié par erreur | Compte ou clé de signature compromis | `.gitignore` dès le départ ; recherche de secrets automatique ; keystore hors du dépôt |
| Autorisation de localisation trop large | Refus de Google Play ; perte de confiance | Localisation seulement pendant un trajet actif ; de préférence via un service de premier plan (notification visible), qui peut éviter l'autorisation en arrière-plan ; justification claire ; désactivable |
| Lieu dangereux suggéré | Accident (baignade interdite, propriété privée, falaise) | Exclure les lieux signalés interdits ou privés dans les données ; ton prudent ; étiquette « lieu fragile » |
| Bug ou plantage en route | Distraction au volant | Tests en conditions simulées puis réelles ; aucune interaction obligatoire en mouvement |
| Voix au mauvais moment | Distraction, conflit avec les consignes du GPS | Moments calmes uniquement ; phrases courtes ; espacement des suggestions |
| Données locales lisibles par une autre appli | Fuite des préférences ou des trajets | Stockage dans l'espace privé de l'appli ; pas d'export implicite |

### À l'étape 2 (communauté et partage)

| Risque | Parade prévue |
| --- | --- |
| Faux avis, spam, règlements de compte | Avis possibles seulement après un arrêt vérifié sur le téléphone ; limites de fréquence ; signalement |
| Lien de partage de trajet intercepté | Liens à durée limitée, privés, révocables ; partage éphémère |
| Accès indu à la base Supabase | Règles d'accès par ligne systématiques ; aucune logique sensible côté client |
| Usurpation d'un professionnel | Vérification de l'identité avant le statut « pro » |

## La liste de contrôle d'audit

Utilisée par l'agent `auditeur-securite` à chaque tranche.

**Données et vie privée**
- [ ] Aucune position ni aucun trajet ne quitte le téléphone en dehors des flux listés dans `docs/DONNEES.md` (serveur d'itinéraire, liens Google Maps et Waze).
- [ ] Aucune position, aucun trajet, aucune préférence dans les journaux techniques ni dans les messages d'erreur.
- [ ] Toute donnée touchée par la tranche figure dans `docs/DONNEES.md`.
- [ ] Les données locales sont stockées dans l'espace privé de l'appli.

**Code et dépendances**
- [ ] Aucun secret dans le code, la configuration ou l'historique.
- [ ] Chaque nouvelle dépendance est justifiée, maintenue, sans faille connue, et sous licence compatible AGPL-3.0.
- [ ] Aucun SDK de statistiques, de publicité ou de suivi.

**Entrées externes**
- [ ] Les paquets de lieux sont vérifiés (signature, format) avant usage.
- [ ] Les réponses des serveurs sont validées (format, taille, valeurs) avant usage.
- [ ] Les erreurs réseau sont gérées sans plantage ni fuite d'information.

**Plateforme**
- [ ] Chaque nouvelle permission Android est nécessaire, justifiée, et demandée au moment où elle sert.
- [ ] La localisation n'est active que pendant un trajet.

**Sécurité routière**
- [ ] Aucune interaction n'est exigée en mouvement.
- [ ] Les suggestions en mouvement respectent la règle « parle peu » (phrase courte, deux boutons).

## En cas d'incident

1. Arrêter : ne pas intégrer, ne pas publier.
2. Évaluer avec l'utilisateur : quelles données, quels utilisateurs, depuis quand.
3. Corriger dans une tranche dédiée, prioritaire.
4. Consigner dans le journal et dans les décisions ; enrichir la carte des risques.
5. Si des données personnelles d'utilisateurs ont été exposées, le RGPD impose de notifier la CNIL dans les 72 heures après en avoir pris connaissance, sauf si la violation ne présente vraisemblablement pas de risque (article 33). Si le risque est élevé, les personnes concernées doivent aussi être informées (article 34). Demander un avis juridique.

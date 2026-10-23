# Système de Gestion de Notes Universitaire (GMI)

Application web complète (Node.js/Express/MySQL + HTML/CSS/JS vanilla) pour
la gestion des notes de la mention **Génie Mathématiques et Informatique
(GMI)**, de la Licence 1 au Master 2. Trois espaces : **Étudiant** (lecture
seule, historique complet), **Enseignant** (saisie des notes, y compris pour
les années passées et les rattrapages de dette), et **Administrateur**
(gestion globale, catalogue, clôture d'année).

## 1. Ce que fait le système

- **Catalogue UE/EC réel**, importé du fichier `UE_et_Ec_GMI.xls` fourni :
  92 UE, 226 EC, du L1 au M2, avec les filières Mathématiques et
  Informatique (spécialisations MSI/IAD et GMMS/GMMD en Master).
- **Deux sessions de résultats** : Session Normale et Session Rattrapage,
  calculées à partir des mêmes notes, consultables séparément.
- **Système de dettes** : un étudiant peut être admis au niveau supérieur
  avec un semestre non validé, à condition de repasser les EC concernés
  l'année suivante ("dette").
- **Historique pluriannuel** : chaque étudiant garde tout son parcours
  L1 → L2 → L3 → M1 → M2, avec le relevé de chaque année consultable et
  téléchargeable en PDF.
- **Saisie de notes sur années passées** : un enseignant peut noter un
  rattrapage de dette plusieurs années après la première tentative.

## 2. Structure du projet

```
gestion-notes-universite/
├── backend/
│   ├── config/db.js           -> connexion MySQL (pool, charset utf8mb4)
│   ├── controllers/           -> logique de chaque route
│   ├── database/schema.sql    -> schéma complet + catalogue réel + données de démo
│   ├── middleware/            -> vérification JWT + contrôle des rôles
│   ├── models/index.js        -> requêtes SQL + calcul des moyennes (2 sessions)
│   ├── routes/
│   ├── .env.example
│   ├── package.json
│   └── server.js
└── frontend/
    ├── index.html              -> connexion
    ├── inscription.html        -> auto-inscription étudiant/enseignant
    ├── etudiant/                -> notes 2 sessions, historique, dettes, PDF
    ├── enseignant/                -> saisie de notes (année choisie), dettes
    ├── admin/                     -> catalogue, comptes, clôture d'année
    ├── js/api.js
    └── css/style.css
```

## 3. Installation et lancement

### Prérequis
- Node.js (v18+)
- MySQL 8 ou MariaDB 10.11+

### Étape 1 - Base de données
```bash
mysql -u root -p --default-character-set=utf8mb4 < backend/database/schema.sql
```
⚠️ **Important** : utilisez bien `--default-character-set=utf8mb4` lors de
l'import, sinon les accents français (é, è, à...) du catalogue seront
corrompus dans la base.

Ce script crée la base `gestion_notes`, les 12 tables, le catalogue complet
(92 UE / 226 EC / 12 parcours), et un jeu de données de démonstration.

### Étape 2 - Backend
```bash
cd backend
cp .env.example .env
# Modifiez .env avec vos identifiants MySQL et une clé JWT_SECRET personnelle
npm install
npm run dev      # ou npm start
```

### Étape 3 - Frontend
```bash
cd frontend
npx serve .
```
Puis ouvrez `http://localhost:8080`.

### Comptes de démonstration
| Rôle        | Identifiant                  | Mot de passe   |
|-------------|-------------------------------|----------------|
| Admin       | admin@universite.mg           | Admin@123      |
| Enseignant  | jean.rabe@universite.mg       | Enseignant@123 |
| Étudiant    | sofia.randria@universite.mg   | Etudiant@123   |

**Scénario de démonstration inclus** : Sofia Randria a validé son S1
2024-2025 mais pas son S2, même après rattrapage. Elle a donc été admise en
L2 Informatique **avec dette** sur 5 EC. Une dette (Cinématique du point) a
déjà été soldée en 2025-2026 par une note de rattrapage. Connectez-vous avec
son compte pour explorer : sélecteur d'année, bascule Normale/Rattrapage,
onglet Dettes, téléchargement PDF par session.

## 4. Modèle de données : le catalogue est indépendant de l'année

**Changement clé par rapport à une V1 naïve** : les tables
`UNITE_ENSEIGNEMENT` et `ELEMENT_CONSTITUTIF` ne sont **pas** dupliquées
chaque année universitaire. Elles forment un catalogue permanent (« Algèbre
et Géométrie » existe une seule fois en base, pour toujours), et c'est la
table `EVALUER` (les notes) qui porte le champ `annee_universitaire`.

Cela permet à un même EC catalogue d'avoir des notes sur plusieurs années
différentes pour un même étudiant — exactement ce qu'il faut pour gérer les
rattrapages de dette pluriannuels.

### Tables principales

- **PARCOURS** : une filière à un niveau donné (ex: "GMI - Informatique (MSI)"
  au niveau M1). Un même intitulé de filière revient à plusieurs niveaux
  (L2, L3, M1, M2), chacun étant une ligne distincte.
- **UNITE_ENSEIGNEMENT** / **ELEMENT_CONSTITUTIF** : le catalogue, avec
  `code_UE`, `niveau`, `semestre`, crédits.
- **CONTENIR** : quelles UE appartiennent à quel parcours (plusieurs-à-plusieurs
  — une UE de tronc commun peut être liée à deux parcours, ex: Mathématiques
  ET Informatique en L2/L3).
- **INSCRIPTION** : une ligne par étudiant **et par année universitaire**,
  indiquant son niveau/parcours et son statut (`En cours`, `Admis`, `Admis
  avec dette`, `Redouble`) pour cette année-là. C'est ce qui reconstitue tout
  l'historique L1 → M2.
- **EVALUER** : les notes, avec `annee_universitaire` et `type_evaluation`
  (`TD`, `Projet`, `TP`, `Session Normale`, `Rattrapage`).
- **DETTE** : un EC en dette pour un étudiant, avec l'année d'origine et,
  une fois soldée, l'année et le statut de résolution.

## 5. Logique de calcul des deux sessions

Centralisée dans `backend/models/index.js` (fonction `calculerMoyenneEC` et
`calculerReleveSemestres`), documentée en commentaires dans le code. Règles
appliquées (modifiables à un seul endroit si votre règlement diffère) :

- **Moyenne EC, Session Normale** = 40% × (moyenne des notes TD/Projet/TP)
  + 60% × (note de l'examen "Session Normale"). Les notes de rattrapage ne
  sont **jamais** utilisées dans cette session.
- **Moyenne EC, Session Rattrapage** :
  - Si l'EC est déjà validé en session normale (moyenne ≥ 10), le résultat
    est repris à l'identique — on ne peut pas "rattraper" un EC déjà acquis.
  - Sinon, si une note de rattrapage existe, on recalcule en remplaçant la
    note d'examen par la **meilleure des deux** (examen normale vs
    rattrapage), et on garde le meilleur des deux résultats obtenus.
  - Sans note de rattrapage saisie, le résultat reste celui de la session
    normale (souvent un échec).
- **Moyenne UE** = moyenne des moyennes EC pondérée par les **crédits** de
  chaque EC (identique dans les deux sessions, juste avec les moyennes EC de
  la session concernée).
- **Moyenne générale du semestre** = moyenne des moyennes UE pondérée par le
  **coefficient** de chaque UE (coefficient = somme des crédits de ses EC).
- **Résultat du semestre** : `Validé` (moyenne ≥ 10 et toutes les UE ≥ 10),
  `Validé par compensation` (moyenne ≥ 10 mais au moins une UE < 10), ou
  `Non validé` (moyenne < 10) — calculé séparément pour chaque session.

## 6. Progression annuelle : Admis / Admis avec dette / Redouble

Selon votre demande : *"les étudiants peuvent être admis au niveau supérieur
si une semestre est validé et le deuxième pas encore, mais avec une dette
pour refaire les EC non validés l'année prochaine."*

Cette règle est implémentée dans `cloturerAnneeEtudiant` (modèle) et
exposée via `POST /api/admin/cloture-annee` (action administrateur) :

1. On calcule le résultat **final** (session rattrapage) des deux semestres
   de l'année à clôturer.
2. **Les deux semestres validés** (même par compensation) → `Admis`, aucune
   dette, l'étudiant est inscrit l'année suivante dans le parcours choisi
   par l'admin.
3. **Un seul semestre validé** → `Admis avec dette` : une ligne `DETTE` est
   ouverte pour chaque EC du semestre non validé resté sous la moyenne même
   après rattrapage ; l'étudiant est quand même inscrit au niveau supérieur.
4. **Aucun semestre validé** → `Redouble` : l'étudiant n'est pas promu (à
   l'admin de créer une nouvelle inscription au même niveau si besoin).

Une année déjà clôturée ne peut pas être re-clôturée par erreur (garde-fou
sur le statut de l'inscription), et une dette déjà ouverte sur un EC n'est
jamais dupliquée si l'action est relancée.

**Résolution d'une dette** : dès qu'un enseignant saisit une note de type
`Rattrapage` ≥ 10 sur l'EC concerné (à n'importe quelle année universitaire
ultérieure), la dette passe automatiquement au statut `Soldée`.

## 7. Historique et relevés multi-années (espace étudiant)

- `GET /api/etudiant/annees` : liste des années universitaires où
  l'étudiant a été inscrit (sélecteur déroulant côté frontend).
- `GET /api/etudiant/notes?annee=2024-2025` : relevé complet (les deux
  sessions) pour l'année choisie ; une bascule Normale/Rattrapage réaffiche
  les mêmes données sans nouvelle requête réseau.
- `GET /api/etudiant/releve/pdf?annee=...&session=normale|rattrapage` :
  relevé PDF (généré avec pdfkit) pour l'année et la session choisies.
- `GET /api/etudiant/dettes` : liste des EC en dette (en cours ou soldés).

## 8. Saisie de notes par un enseignant, y compris sur des années passées

L'espace enseignant (`frontend/enseignant/`) propose un **sélecteur d'année
universitaire** en plus du contexte habituel (parcours → semestre → EC). Il
peut donc :
- saisir des notes pour l'année en cours (cas normal),
- corriger une note d'une année passée,
- ou noter un **rattrapage de dette** via l'onglet dédié "Étudiants en dette
  sur cet EC" (`GET /api/enseignant/ec/:id_EC/dettes`), qui liste les
  étudiants en dette sur cet EC même s'ils ne sont plus inscrits cette année
  dans un parcours qui le contient.

## 9. Explication de l'architecture backend (MVC)

- **`models/index.js`** : toute la logique SQL + le calcul des moyennes.
  Fonctions clés : `calculerMoyenneEC` (une seule EC, deux sessions),
  `calculerReleveSemestres` (agrégation EC → UE → semestre), et
  `calculerReleveAnnee` (point d'entrée utilisé par les contrôleurs).
- **`controllers/`** : reçoivent la requête, appellent le modèle, renvoient
  du JSON. Aucun SQL direct.
- **`routes/`** : relient URL + méthode HTTP à une fonction du contrôleur,
  avec les middlewares de sécurité (`verifierToken`, `autoriserRoles`).
- **`middleware/authMiddleware.js`** : vérifie le JWT et le rôle.

## 10. Sécurité

- Mots de passe hashés avec **bcrypt**.
- Authentification par **JWT**, avec vérification du rôle sur chaque route
  protégée.
- Un enseignant ne peut modifier/supprimer que les notes qu'il a lui-même
  saisies (`id_enseignant_saisie` vérifié à chaque UPDATE/DELETE), quelle
  que soit l'année universitaire de la note.
- Toutes les requêtes SQL utilisent des requêtes préparées (`?`).
- Les comptes créés par auto-inscription (`inscription.html`) sont créés
  **inactifs** : un administrateur doit les activer avant toute connexion.

## 11. Explication du frontend

HTML5 + Tailwind CSS (CDN) + JavaScript vanilla (Fetch API), sans framework.

- **`js/api.js`** : fonction unique `appelApi()` utilisée partout, gère le
  token JWT et les erreurs communes.
- **Espace Étudiant** : sélecteur d'année + bascule de session (Normale/
  Rattrapage) qui réaffiche les données déjà chargées ; onglet Dettes ;
  téléchargement PDF respectant année + session.
- **Espace Enseignant** : filtres en cascade (parcours → semestre → EC) +
  sélecteur d'année universitaire ; onglet "Étudiants en dette sur cet EC" ;
  saisie/modification/suppression de notes dans une modale.
- **Espace Admin** : onglets Étudiants / Enseignants / Parcours / UE / EC /
  Affectations / **Progression - Clôture d'année**. Ce dernier onglet permet
  de créer une inscription annuelle, de clôturer une année (calcul
  automatique Admis/Admis avec dette/Redouble), et de consulter
  l'historique complet (inscriptions + dettes) d'un étudiant.

## 12. Comment tester le scénario complet

1. Lancer le backend puis le frontend (voir section 3).
2. Se connecter en **étudiant** (Sofia Randria) : onglet "Mes notes", changer
   l'année (2024-2025 / 2025-2026), basculer Session Normale / Rattrapage,
   consulter l'onglet "Mes dettes", télécharger le PDF des deux sessions.
3. Se connecter en **enseignant** : choisir un contexte (parcours GMI Info,
   semestre S2, EC "Dynamique du point"), onglet "Étudiants en dette sur cet
   EC", saisir une note de rattrapage ≥ 10 pour Sofia → vérifier que la
   dette passe à "Soldée" côté espace étudiant.
4. Se connecter en **admin** : onglet "Progression / Clôture d'année" →
   consulter l'historique de Sofia (inscriptions + dettes) ; tester la
   création d'une nouvelle inscription annuelle pour un autre étudiant.

## 13. Limites connues / hypothèses documentées

- La pondération 40% CC / 60% examen est une valeur par défaut ; à ajuster
  dans `models/index.js` (`POIDS_CONTROLE_CONTINU` / `POIDS_EXAMEN`) selon
  le règlement réel de l'établissement.
- La bifurcation de filière (ex: choix Mathématiques vs Informatique après
  le L1, ou MSI vs IAD après le M1) n'est **pas automatisée** : c'est
  l'administrateur qui choisit le parcours cible lors de la clôture d'année
  (`id_parcours_suivant`), ce qui reflète une vraie décision d'orientation.
- Le catalogue importé du fichier Excel comporte deux petites imprécisions
  sources (M1 Info IAD S8 = 29 crédits, M2 Info MSI S9 = 28 crédits, au lieu
  de 30) : elles viennent du classeur original et n'ont pas été corrigées
  arbitrairement.
- `HISTORIQUE_RESULTAT` (archivage figé d'un relevé officiel, avec la
  session) existe en base et dans le modèle (`figerResultat`) mais n'a pas
  encore de bouton dédié dans l'interface admin.

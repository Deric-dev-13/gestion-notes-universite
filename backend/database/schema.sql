-- =====================================================================
--  SCHEMA.SQL - Système de Gestion de Notes Universitaire (GMI)
--  Base de données MySQL
-- =====================================================================
-- CHANGEMENTS MAJEURS PAR RAPPORT A LA VERSION PRECEDENTE :
--  1. Le catalogue UE/EC n'est plus dupliqué chaque année universitaire :
--     il est défini une fois (import réel du fichier UE_et_Ec_GMI.xls,
--     L1 à M2, filières Mathématiques et Informatique) et réutilisé
--     chaque année. C'est la table EVALUER (les notes) qui porte
--     désormais l'année universitaire, pas l'EC.
--  2. Table INSCRIPTION : parcours suivi par un étudiant CHAQUE année
--     universitaire (niveau, statut Admis/Admis avec dette/Redouble).
--     Permet de garder l'historique complet L1 -> L2 -> L3 -> M1 -> M2.
--  3. Table DETTE : suit les EC non validés qu'un étudiant "admis avec
--     dette" doit repasser l'année suivante.
--  4. EVALUER distingue le type d'évaluation ET l'année universitaire,
--     ce qui permet à un enseignant de ressaisir une note de dette
--     plusieurs années après la première tentative.
-- =====================================================================
-- Comment lancer ce script :
--   mysql -u root -p < schema.sql
-- =====================================================================

DROP DATABASE IF EXISTS gestion_notes;
CREATE DATABASE gestion_notes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gestion_notes;

-- ---------------------------------------------------------------------
-- 1. ADMINISTRATEUR
-- ---------------------------------------------------------------------
CREATE TABLE ADMINISTRATEUR (
    id_admin INT PRIMARY KEY AUTO_INCREMENT,
    nom_admin VARCHAR(100) NOT NULL,
    prenom_admin VARCHAR(100) NOT NULL,
    email_admin VARCHAR(150) UNIQUE NOT NULL,
    mot_de_pass_admin VARCHAR(255) NOT NULL,
    actif TINYINT(1) NOT NULL DEFAULT 1,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 2. PARCOURS
-- Un "parcours" représente une filière à un niveau donné
-- (ex: "GMI - Informatique" au niveau L2). Un même intitulé de filière
-- revient donc à plusieurs niveaux (L2, L3, M1, M2), chacun étant une
-- ligne distincte, car le catalogue d'UE change à chaque niveau.
-- ---------------------------------------------------------------------
CREATE TABLE PARCOURS (
    id_parcours INT PRIMARY KEY AUTO_INCREMENT,
    nom_parcours VARCHAR(150) NOT NULL,
    niveau ENUM('L1','L2','L3','M1','M2') NOT NULL,
    mention VARCHAR(150) NOT NULL,
    id_directeur INT NULL,
    id_responsable_mention INT NULL,
    id_parcours_suivant_defaut INT NULL
);

-- ---------------------------------------------------------------------
-- 3. UNITE_ENSEIGNEMENT (catalogue, indépendant de l'année universitaire)
-- ---------------------------------------------------------------------
CREATE TABLE UNITE_ENSEIGNEMENT (
    id_UE INT PRIMARY KEY AUTO_INCREMENT,
    code_UE VARCHAR(30) UNIQUE,
    nom_UE VARCHAR(150) NOT NULL,
    coefficient DECIMAL(5,2) NOT NULL,
    niveau ENUM('L1','L2','L3','M1','M2') NOT NULL,
    semestre VARCHAR(10) NOT NULL   -- 'S1' à 'S10'
);

-- ---------------------------------------------------------------------
-- 4. ELEMENT_CONSTITUTIF (EC) - catalogue, indépendant de l'année
-- ---------------------------------------------------------------------
CREATE TABLE ELEMENT_CONSTITUTIF (
    id_EC INT PRIMARY KEY AUTO_INCREMENT,
    nom_EC VARCHAR(200) NOT NULL,
    credit DECIMAL(4,1) NOT NULL,
    id_UE INT NOT NULL,
    FOREIGN KEY (id_UE) REFERENCES UNITE_ENSEIGNEMENT(id_UE) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 5. ETUDIANT
-- id_parcours = parcours ACTUEL (le plus récent) ; l'historique complet
-- de sa progression (années précédentes, niveaux passés) vit dans
-- INSCRIPTION, pas ici.
-- ---------------------------------------------------------------------
CREATE TABLE ETUDIANT (
    numero_etudiant INT PRIMARY KEY AUTO_INCREMENT,
    nom_etudiant VARCHAR(100) NOT NULL,
    prenom_etudiant VARCHAR(100) NOT NULL,
    date_naissance DATE,
    lieu_naissance VARCHAR(150),
    sexe ENUM('M','F') NOT NULL,
    cin VARCHAR(20) UNIQUE,
    tel_etudiant VARCHAR(20),
    email_etudiant VARCHAR(150) UNIQUE NOT NULL,
    mot_de_pass_etudiant VARCHAR(255) NOT NULL,
    id_parcours INT NOT NULL,
    actif TINYINT(1) NOT NULL DEFAULT 1,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_parcours) REFERENCES PARCOURS(id_parcours)
);

-- ---------------------------------------------------------------------
-- 6. ENSEIGNANT
-- ---------------------------------------------------------------------
CREATE TABLE ENSEIGNANT (
    id_enseignant INT PRIMARY KEY AUTO_INCREMENT,
    nom_enseignant VARCHAR(100) NOT NULL,
    prenom_enseignant VARCHAR(100) NOT NULL,
    matricule_enseignant VARCHAR(50) UNIQUE NOT NULL,
    sexe ENUM('M','F') NOT NULL,
    date_naissance DATE,
    cin VARCHAR(20) UNIQUE,
    tel_enseignant VARCHAR(20),
    diplome VARCHAR(100),
    grade VARCHAR(100),
    specialite VARCHAR(100),
    mention_etabisement_attache VARCHAR(100), -- exemple : GMI-GC-GM ou GMI-GE ou GMI
    role_responsabilite_demande ENUM('parcours','mention') NULL,
    email_enseignant VARCHAR(150) UNIQUE NOT NULL,
    mot_de_pass_enseignant VARCHAR(255) NOT NULL,
    id_parcours INT,
    actif TINYINT(1) NOT NULL DEFAULT 1,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_parcours) REFERENCES PARCOURS(id_parcours) ON DELETE SET NULL
);

-- Une ligne par parcours demandé : un enseignant peut demander la
-- responsabilité de PLUSIEURS parcours (ex: "GMI - Informatique" en L2
-- ET en L3), une simple colonne INT sur ENSEIGNANT ne suffit plus.
CREATE TABLE DEMANDE_RESPONSABILITE (
    id_enseignant INT NOT NULL,
    id_parcours INT NOT NULL,
    PRIMARY KEY (id_enseignant, id_parcours),
    FOREIGN KEY (id_enseignant) REFERENCES ENSEIGNANT(id_enseignant) ON DELETE CASCADE,
    FOREIGN KEY (id_parcours) REFERENCES PARCOURS(id_parcours) ON DELETE CASCADE
);

ALTER TABLE PARCOURS
    ADD CONSTRAINT fk_parcours_directeur
    FOREIGN KEY (id_directeur) REFERENCES ENSEIGNANT(id_enseignant) ON DELETE SET NULL;
ALTER TABLE PARCOURS
    ADD CONSTRAINT fk_parcours_responsable_mention
    FOREIGN KEY (id_responsable_mention) REFERENCES ENSEIGNANT(id_enseignant) ON DELETE SET NULL;
ALTER TABLE PARCOURS
    ADD CONSTRAINT fk_parcours_suivant
    FOREIGN KEY (id_parcours_suivant_defaut) REFERENCES PARCOURS(id_parcours) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 7. INSCRIPTION
-- Une ligne par étudiant ET par année universitaire : c'est ce qui
-- permet de retrouver "quel niveau/parcours suivait cet étudiant en
-- 2024-2025 ?" et de conserver le relevé de chaque année passée.
-- ---------------------------------------------------------------------
CREATE TABLE INSCRIPTION (
    id_inscription INT PRIMARY KEY AUTO_INCREMENT,
    numero_etudiant INT NOT NULL,
    id_parcours INT NOT NULL,
    annee_universitaire VARCHAR(20) NOT NULL,  -- ex: '2025-2026'
    statut ENUM('En cours', 'Admis', 'Admis avec dette', 'Redouble') NOT NULL DEFAULT 'En cours',
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_inscription (numero_etudiant, annee_universitaire),
    FOREIGN KEY (numero_etudiant) REFERENCES ETUDIANT(numero_etudiant) ON DELETE CASCADE,
    FOREIGN KEY (id_parcours) REFERENCES PARCOURS(id_parcours)
);

-- ---------------------------------------------------------------------
-- 8. CONTENIR (table de jointure PARCOURS <-> UE)
-- ---------------------------------------------------------------------
CREATE TABLE CONTENIR (
    id_parcours INT,
    id_UE INT,
    PRIMARY KEY (id_parcours, id_UE),
    FOREIGN KEY (id_parcours) REFERENCES PARCOURS(id_parcours) ON DELETE CASCADE,
    FOREIGN KEY (id_UE) REFERENCES UNITE_ENSEIGNEMENT(id_UE) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 9. ENSEIGNER (table de jointure EC <-> ENSEIGNANT)
-- ---------------------------------------------------------------------
CREATE TABLE ENSEIGNER (
    id_EC INT,
    id_enseignant INT,
    PRIMARY KEY (id_EC, id_enseignant),
    FOREIGN KEY (id_EC) REFERENCES ELEMENT_CONSTITUTIF(id_EC) ON DELETE CASCADE,
    FOREIGN KEY (id_enseignant) REFERENCES ENSEIGNANT(id_enseignant) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 10. EVALUER (les notes)
-- annee_universitaire précise ICI (et non plus sur l'EC) l'année où la
-- note a été obtenue : cela permet de donner une note de rattrapage de
-- "dette" plusieurs années après la première tentative, sur le MÊME
-- EC du catalogue.
-- ---------------------------------------------------------------------
CREATE TABLE EVALUER (
    id_note INT PRIMARY KEY AUTO_INCREMENT,
    numero_etudiant INT NOT NULL,
    id_EC INT NOT NULL,
    annee_universitaire VARCHAR(20) NOT NULL,
    id_evaluation INT NOT NULL,
    note DECIMAL(4,2) NOT NULL CHECK (note >= 0 AND note <= 20),
    date_evaluation DATE NOT NULL,
    type_evaluation ENUM('TD', 'Projet', 'TP', 'Session Normale', 'Rattrapage') NOT NULL,
    id_enseignant_saisie INT NOT NULL,
    UNIQUE KEY uniq_note (numero_etudiant, id_EC, annee_universitaire, id_evaluation),
    FOREIGN KEY (numero_etudiant) REFERENCES ETUDIANT(numero_etudiant) ON DELETE CASCADE,
    FOREIGN KEY (id_EC) REFERENCES ELEMENT_CONSTITUTIF(id_EC) ON DELETE CASCADE,
    FOREIGN KEY (id_enseignant_saisie) REFERENCES ENSEIGNANT(id_enseignant)
);

-- ---------------------------------------------------------------------
-- 11. DETTE
-- Un étudiant "Admis avec dette" doit repasser certains EC l'année
-- suivante. Chaque ligne = un EC en dette pour un étudiant, ouvert
-- l'année où il a échoué, soldé quand une note >= 10 est enregistrée
-- (à n'importe quelle année universitaire ultérieure).
-- ---------------------------------------------------------------------
CREATE TABLE DETTE (
    id_dette INT PRIMARY KEY AUTO_INCREMENT,
    numero_etudiant INT NOT NULL,
    id_EC INT NOT NULL,
    annee_universitaire_origine VARCHAR(20) NOT NULL,
    annee_universitaire_soldee VARCHAR(20) NULL,
    statut ENUM('En cours', 'Soldée') NOT NULL DEFAULT 'En cours',
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (numero_etudiant) REFERENCES ETUDIANT(numero_etudiant) ON DELETE CASCADE,
    FOREIGN KEY (id_EC) REFERENCES ELEMENT_CONSTITUTIF(id_EC) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 12. HISTORIQUE_RESULTAT (archivage officiel, par session)
-- ---------------------------------------------------------------------
CREATE TABLE HISTORIQUE_RESULTAT (
    id_historique INT PRIMARY KEY AUTO_INCREMENT,
    numero_etudiant INT NOT NULL,
    semestre VARCHAR(20) NOT NULL,
    annee_universitaire VARCHAR(20) NOT NULL,
    session_examen ENUM('Normale', 'Rattrapage') NOT NULL DEFAULT 'Normale',
    moyenne_generale DECIMAL(5,2) NOT NULL,
    resultat_semestre ENUM('Validé', 'Validé par compensation', 'Non validé') NOT NULL,
    date_figee TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (numero_etudiant) REFERENCES ETUDIANT(numero_etudiant) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 13. DEMANDE_REINITIALISATION (Mot de passe oublié)
-- ---------------------------------------------------------------------
CREATE TABLE DEMANDE_REINITIALISATION (
    id_demande INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(150) NOT NULL,
    role ENUM('etudiant', 'enseignant', 'admin') NOT NULL,
    mot_de_passe_souhaite VARCHAR(255) NOT NULL,
    statut ENUM('En attente', 'Traité', 'Rejeté', 'Expiré') NOT NULL DEFAULT 'En attente',
    -- Le lien envoyé par email contient le token EN CLAIR ; seul son hash
    -- (SHA-256) est stocké ici, pour qu'une fuite de la base ne permette
    -- pas à quelqu'un de rejouer le lien de confirmation.
    token_hash CHAR(64) NULL,
    token_expire TIMESTAMP NULL,
    date_demande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_traitement TIMESTAMP NULL
);
CREATE INDEX idx_demande_reinit_token ON DEMANDE_REINITIALISATION(token_hash);

-- ---------------------------------------------------------------------
-- Index utiles
-- ---------------------------------------------------------------------
CREATE INDEX idx_etudiant_parcours ON ETUDIANT(id_parcours);
CREATE INDEX idx_ec_ue ON ELEMENT_CONSTITUTIF(id_UE);
CREATE INDEX idx_evaluer_etudiant_annee ON EVALUER(numero_etudiant, annee_universitaire);
CREATE INDEX idx_evaluer_ec ON EVALUER(id_EC);
CREATE INDEX idx_inscription_etudiant ON INSCRIPTION(numero_etudiant);
CREATE INDEX idx_dette_etudiant ON DETTE(numero_etudiant, statut);
CREATE INDEX idx_ue_niveau_semestre ON UNITE_ENSEIGNEMENT(niveau, semestre);

-- =====================================================================
--  CATALOGUE UE / EC réel (importé du fichier UE_et_Ec_GMI.xls)
-- =====================================================================
-- (le bloc complet Parcours / UE / EC / CONTENIR est inséré juste après
--  ce marqueur par le script de génération - voir plus bas dans ce fichier)
-- =====================================================================
--  CATALOGUE UE/EC GMI (issu du fichier UE_et_Ec_GMI.xls)
--  Généré automatiquement à partir du classeur fourni : L1 à M2,
--  filières Mathématiques et Informatique (MSI/IAD, GMMS/GMMD).
-- =====================================================================

-- --- 1. Parcours (mention unique : Génie Mathématiques et Informatique) ---
INSERT INTO PARCOURS (nom_parcours, niveau, mention) VALUES ('Tronc Commun GMI', 'L1', 'Génie Mathématiques et Informatique (GMI)');
INSERT INTO PARCOURS (nom_parcours, niveau, mention) VALUES ('GMI - Mathématiques', 'L2', 'Génie Mathématiques et Informatique (GMI)');
INSERT INTO PARCOURS (nom_parcours, niveau, mention) VALUES ('GMI - Informatique', 'L2', 'Génie Mathématiques et Informatique (GMI)');
INSERT INTO PARCOURS (nom_parcours, niveau, mention) VALUES ('GMI - Mathématiques', 'L3', 'Génie Mathématiques et Informatique (GMI)');
INSERT INTO PARCOURS (nom_parcours, niveau, mention) VALUES ('GMI - Informatique', 'L3', 'Génie Mathématiques et Informatique (GMI)');
INSERT INTO PARCOURS (nom_parcours, niveau, mention) VALUES ('GMI - Mathématiques', 'M1', 'Génie Mathématiques et Informatique (GMI)');
INSERT INTO PARCOURS (nom_parcours, niveau, mention) VALUES ('GMI - Informatique (MSI)', 'M1', 'Génie Mathématiques et Informatique (GMI)');
INSERT INTO PARCOURS (nom_parcours, niveau, mention) VALUES ('GMI - Informatique (IAD)', 'M1', 'Génie Mathématiques et Informatique (GMI)');
INSERT INTO PARCOURS (nom_parcours, niveau, mention) VALUES ('GMI - Mathématiques (Modélisations Stochastiques)', 'M2', 'Génie Mathématiques et Informatique (GMI)');
INSERT INTO PARCOURS (nom_parcours, niveau, mention) VALUES ('GMI - Mathématiques (Modélisations Déterministes)', 'M2', 'Génie Mathématiques et Informatique (GMI)');
INSERT INTO PARCOURS (nom_parcours, niveau, mention) VALUES ('GMI - Informatique (MSI)', 'M2', 'Génie Mathématiques et Informatique (GMI)');
INSERT INTO PARCOURS (nom_parcours, niveau, mention) VALUES ('GMI - Informatique (IAD)', 'M2', 'Génie Mathématiques et Informatique (GMI)');

-- --- 2. Unités d'enseignement (catalogue, réutilisable chaque année) ---
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('ADRINF04', 'ADMINISTRATION DE RESEAUX', 6.0, 'L2', 'S4');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('AGIIAD09', 'AGENTS INTELLIGENTS', 6.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('ALAINF04', 'BASE DE DONNEES ET ALGORITHMIQUE', 9.0, 'L2', 'S4');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('ALAMTH08', 'ALGEBRE APPROFONDIE ET OPTIMISATION', 5.0, 'M1', 'S8');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('ALGMTH02', 'Algèbre et Géométrie', 6.0, 'L1', 'S2');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('ANAMTH08', 'ANALYSE ANALYTIQUE ET NUMERIQUE AVANCEE', 7.0, 'M1', 'S8');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('ANCMTH04', 'APPLICATIONS DES NOMBRES COMPLEXES', 4.0, 'L2', 'S4');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('ANMMTH01', 'Analyse mathématique', 5.0, 'L1', 'S1');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('ARSINF03', 'ARCHITECTURE DES SYSTÈMES INFORMATIQUES', 7.0, 'L2', 'S3');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('ASTAMTH04', 'ANALYSE ET STATISTIQUE', 6.0, 'L2', 'S4');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('BDAINF07', 'BASE DE DONNEES AVANCEE', 7.0, 'M1', 'S7');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('BDIIAD08', 'BASE DE DONNEES INTELLIGENTES', 4.0, 'M1', 'S8');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('BDPINF05', 'PROGRAMMATION', 11.0, 'L3', 'S5');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('CDAMTH04', 'COMPLEMENTS D''ALGEBRE', 6.0, 'L2', 'S4');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('CDGMTH04', 'COMPLEMENTS DE GEOMETRIE', 4.0, 'L2', 'S4');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('CLEG10', 'COMPLEMENT DE LEGISLATIONS', 2.67, 'M2', 'S10');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('CST02', 'Calcul numérique et Statistique', 6.0, 'L1', 'S2');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DISMTH07', 'MATHEMATIQUES DISCRETES ET ANALYSE DE DONNEES', 10.0, 'M1', 'S7');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M1-16', '????????', 1.0, 'M1', 'S7');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M1-17', '????????', 1.0, 'M1', 'S7');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M1-18', '????????', 1.0, 'M1', 'S7');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M2-113', '?????', 3.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M2-114', '?????', 2.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M2-115', '?????', 1.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M2-116', '?????', 1.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M2-51', '??????????', 3.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M2-52', '??????????', 2.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M2-53', '??????????', 1.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M2-54', '??????????', 1.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M2-55', '????', 1.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M2-91', '?????', 3.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M2-92', '?????', 2.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M2-93', '?????', 1.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DIVERS-M2-94', '?????', 1.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DLEG06', 'LEGISLATION DE BASE', 8.0, 'L3', 'S6');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DOAINF01', 'Démarches scientifiques et Outils d''apprentissage', 5.0, 'L1', 'S1');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('DSCDES01', 'Dessins et Schéma', 8.0, 'L1', 'S1');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('EAVMTH03', 'ALGEBRE LINEAIRE', 7.0, 'L2', 'S3');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('ECTRED01', 'Ecole et transmission', 4.0, 'L1', 'S1');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('EDAMMD09', 'EQUATIONS AUX DERIVEES PARTIELLES', 7.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('EDEMTH01', 'Equations Différentielles ordinaires et espace vectoriel', 5.0, 'L1', 'S1');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('EDIMTH07', 'MODELISATIONS MATHEMATIQUES', 6.0, 'M1', 'S7');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('EDPINF07', 'FIABILITE ET MODELISATION NUMERIQUE', 6.0, 'M1', 'S7');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('ELMELC02', 'Electrostatique et Magnétostatique', 4.0, 'L1', 'S2');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('FDMMMS09', 'FOUILLE DE DONNEES MASSIVES', 6.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('GDEINF07', 'GESTION D''ENTREPRISE', 5.0, 'M1', 'S7');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('GDSMSI09', 'GESTION ET DROIT DE L''INFORMATIQUE', 7.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('GEOMTH08', 'GEOMETRIE APPROFONDIE', 6.0, 'M1', 'S8');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('IARIAD08', 'INTELLIGENCE ARTIFICIELLE', 7.0, 'M1', 'S8');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('IHMIAD09', 'INTERACTION ET COOPERATION HOMMES-MACHINES', 7.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('IMAMSI09', 'INFORMATIQUE MANAGERIALE', 6.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('INTINF09', 'EDUCATION ET INTERNET', 5.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('IPRO10', 'INSERTION PROFESSIONNELLE', 17.334, 'M2', 'S10');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('LAELNG01', 'Langues étrangères', 3.0, 'L1', 'S1');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('MCPMEC02', 'Mécanique du point', 4.0, 'L1', 'S2');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('MDIMTH07', 'MATHEMATIQUES DISCRETES ET ANALYSE DE DONNEES', 9.0, 'M1', 'S7');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('MGLINF05', 'METHODES ET OUTILS DE GENIE LOGICIEL', 7.0, 'L3', 'S5');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('MNMDI05', 'METHODES NUMERIQUES ET MATHS DISCRETES', 8.0, 'L3', 'S5');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('MRCMMS09', 'METHODOLOGIE DE RECHERCHES', 5.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('MRCMSI09', 'METHODOLOGIE DE RECHERCHES', 5.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('MROINF05', 'METHODES NUMERIQUES ET MATHS DISCRETES', 7.0, 'L3', 'S5');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('MSAMMS09', 'MODELISATIONS STOCHASTIQUES AVANCEES', 5.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('MSAMTH07', 'SCIENCES DU CALCUL', 5.0, 'M1', 'S7');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('MSOMTH08', 'MODELISATION STATISTIQUE', 7.0, 'M1', 'S8');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('OPTMMD09', 'ALGORITHMIQUE DES GRAPHES ET OPTIMISATIONS', 7.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('PCAMTH03', 'PROBABILITES ET COMPLEMENTS D''ANALYSE', 8.0, 'L2', 'S3');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('PCHPHY02', 'Physique et Chimie', 6.0, 'L1', 'S2');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('PDENS05', 'PRATIQUE DE L''ENSEIGNEMENT', 5.0, 'L3', 'S5');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('PENEDU05', 'PRATIQUE DE L''ENSEIGNEMENT', 5.0, 'L3', 'S5');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('PRAINF08', 'PROGRAMMATION AVANCEE', 7.0, 'M1', 'S8');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('PRGINF04', 'ALGORITHMIQUE ET PROGRAMMATION', 8.0, 'L2', 'S4');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('PROINF08', 'PROJET', 5.0, 'M1', 'S8');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('PROMTH08', 'PROJET', 5.0, 'M1', 'S8');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('PRSINF04', 'PROGRAMMATION STRUCTUREE', 6.0, 'L2', 'S4');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('RADEDU07', 'Repères techniques et sociaux', 3.0, 'M1', 'S7');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('SADINF08', 'SYSTEMES D''AIDE A LA DECISION', 3.0, 'M1', 'S8');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('SDAMMS09', 'SCIENCES DE DONNEES AVANCEES', 7.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('SDDMTH07', 'SCIENCES DE DONNEES', 6.0, 'M1', 'S7');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('SDDTM05', 'SCIENCE DES DONNEES ET THEORIE DE MESURES', 9.0, 'L3', 'S5');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('SDIMSI08', 'SYSTÈME D''INFORMATION', 8.0, 'M1', 'S8');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('SDRMSI08', 'SECURITE DES RESEAUX', 7.0, 'M1', 'S8');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('SIEEDU03', 'SITUATIONS EDUCATIVES', 4.0, 'L2', 'S3');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('SMEM06', 'STAGE ET MÉMOIRE', 6.0, 'L3', 'S6');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('SMEM10', 'SEMINAIRES ET MÉMOIRE', 10.0, 'M2', 'S10');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('SPLPHY02', 'Statique plane', 4.0, 'L1', 'S2');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('SPRO06', 'STAGE PROFESSIONNEL', 16.0, 'L3', 'S6');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('STAMTH04', 'ANALYSE ET STATISTIQUE', 8.0, 'L2', 'S4');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('TCDIFF05', 'ALGEBRE ET ANALYSE', 8.0, 'L3', 'S5');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('TDRINF08', 'TECHNOLOGIES DE RESEAU', 8.0, 'M1', 'S8');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('TEDMMD09', 'EQUATIONS DIFFERENTIELLES AVANCEES', 4.0, 'M2', 'S9');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('TEXLNG03', 'TECHNIQUES D''EXPRESSION DE LANGUES ETRANGERES', 4.0, 'L2', 'S3');
INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES ('TSIINF04', 'TECHNOLOGIES ET SOCIETE DE L''INFORMATION', 3.0, 'L2', 'S4');

-- --- 3. Éléments constitutifs (catalogue) ---
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Eléments d''administration réseau', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ADRINF04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Bases de maintenance hardware', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ADRINF04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Réseau sans fil', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ADRINF04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Fouille de données et apprentissage automatique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'AGIIAD09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Agents adaptatifs', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'AGIIAD09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Agents décisionnels', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'AGIIAD09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Base de données relationnelle', 4.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ALAINF04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Structure de données et algorithmes', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ALAINF04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Algorithmes et complexités', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ALAINF04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Extension des corps et Théorie de Galois', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ALAMTH08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Optimisation dynamique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ALAMTH08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Algèbre polynomiale et fractions rationnelles', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ALGMTH02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Géométrie Descriptive', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ALGMTH02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Géométrie Analytique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ALGMTH02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Equations et Transformations intégrales', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ANAMTH08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Analyse numérique des EDP et EDO', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ANAMTH08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Théorie des éléments et différences finis', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ANAMTH08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Analyse complexe', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ANCMTH04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Applications conformes', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ANCMTH04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Analyse Réelle', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ANMMTH01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Analyse Vectorielle', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ANMMTH01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Architecture des ordinateurs', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ARSINF03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Réseaux et internet', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ARSINF03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Logiciels libres et système d''exploitation Linux', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ARSINF03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Fonction de plusieurs variables', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ASTAMTH04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Arithmétique de Z', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ASTAMTH04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Statistique inférentielle', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ASTAMTH04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Système d''Information Géographique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'BDAINF07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'JAVA DATABASE CONNECTIVITE (JDBC)', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'BDAINF07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Base de données distribuée', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'BDAINF07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Validation des logiciels', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'BDAINF07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Recherche d''informations et images', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'BDIIAD08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Fouille intelligente de données', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'BDIIAD08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Programmation événémentielle', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'BDPINF05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Programmation Orientée Objet', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'BDPINF05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Conception d''une base de données et SGBD', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'BDPINF05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Administration d''une base de données', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'BDPINF05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Généralités sur les espaces vectoriels', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'CDAMTH04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Eléments de théorie de groupe', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'CDAMTH04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Arithmétique de Z', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'CDAMTH04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Geométrie euclidienne élémentaire', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'CDGMTH04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Geométrie projective', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'CDGMTH04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Législation sur l''enseignement', 1.5, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'CLEG10';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Législation financière', 1.17, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'CLEG10';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Initiation à l''algorithmique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'CST02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Calculs Numériques', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'CST02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Statistique Descriptive', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'CST02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Optimisation statique numérique', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DISMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Eléments de Treillis et de Graphes', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DISMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Statistique multivariée', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DISMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Traitement des Données Massives', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DISMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Insertion sociale et maîtrise du concept de l''égalité de genre', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M1-16';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Posture professionnelle en éducation et en formation', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M1-17';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Créativité, résilience et influence sociale', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M1-18';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Management de classe et leadership + Logique de communication et Adolescents', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M2-113';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Simulation et analyse de pratique d''enseignement', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M2-114';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Système économique mondial', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M2-115';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Histoire de sciences de l''éducation', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M2-116';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Management de classe et leadership + Logique de communication et Adolescents', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M2-51';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Simulation et analyse de pratique d''enseignement', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M2-52';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Système économique mondial', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M2-53';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Histoire de sciences de l''éducation', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M2-54';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Histoire de sciences de l''éducation', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M2-55';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Management de classe et leadership + Logique de communication et Adolescents', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M2-91';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Simulation et analyse de pratique d''enseignement', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M2-92';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Système économique mondial', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M2-93';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Histoire de sciences de l''éducation', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DIVERS-M2-94';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Législation scolaire de base, et Correspondance administrative', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DLEG06';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Législation Administrative de base, et Gestion du Patrimoine scolaire', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DLEG06';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Déontologie des Fonctionnaires', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DLEG06';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Initiation à l''Informatique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DOAINF01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Méthodologie d''études supérieures', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DOAINF01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Orientation des étudiants', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DOAINF01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Logique et modes de raisonnement', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DOAINF01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Dessins techniques de base', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DSCDES01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Dessins techniques appliqués : industriel', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DSCDES01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Dessins techniques appliqués : génie civil', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DSCDES01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Initiation au schéma électrique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'DSCDES01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Espace dual et Forme bilinéaire', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'EAVMTH03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Espaces affine et projectif', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'EAVMTH03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Espaces métrique et vectoriel normé', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'EAVMTH03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Autour du soi', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ECTRED01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'De l''évolution du concept de didactique à la transposition didactique', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ECTRED01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Eléments de pédagogie, tendances pédagogiques', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ECTRED01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Philosophie de l''éducation', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ECTRED01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Distributions appliquées aux EDP', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'EDAMMD09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'EDP d''évolution', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'EDAMMD09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Application des EDP en traitment des signaux', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'EDAMMD09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Espace vectoriel de dimension finie', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'EDEMTH01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Equations Différentielles ordinaires', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'EDEMTH01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Equation aux dérivées partielles', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'EDIMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Analyse des Equations Différentielles Ordinaires', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'EDIMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Analyse fonctionnelle', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'EDIMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Méthode des caractéristiques et des différences finies', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'EDPINF07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Théorie de fiabilité des systèmes réparables', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'EDPINF07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Méthode des éléments et des volumes finis', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'EDPINF07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Electrostatique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ELMELC02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Magnétostatique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'ELMELC02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Contrôle de qualité et expertise statistique', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'FDMMMS09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Fouille des règles d''association et Classification', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'FDMMMS09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Gestion des ressources humaines', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'GDEINF07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Conduite et Gestion de projets informatiques', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'GDEINF07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Comptabilité générale et analytique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'GDSMSI09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Gestion financière et Management d''une entreprise', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'GDSMSI09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Droit de l''informatique et des réseaux', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'GDSMSI09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Géométrie algébrique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'GEOMTH08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Géométrie différentielle', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'GEOMTH08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Géométries non euclidiennes', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'GEOMTH08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Concept et théorie de l''intelligence artificielle', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'IARIAD08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'PROgrammation en LOGique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'IARIAD08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Modélisation du raisonnement', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'IARIAD08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Conception des systèmes interactifs', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'IHMIAD09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Eléments de Psychologie appliquée aux systèmes interactifs', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'IHMIAD09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Aspects informatiques d''Interface Homme/Machine', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'IHMIAD09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Conduite et Gestion de Projet Informatique', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'IMAMSI09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Schéma Directeur Informatique', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'IMAMSI09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Conception et administration d''un site Web éducatif', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'INTINF09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Les services Internet et le cloud computing', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'INTINF09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Stage Pédagogique', 12.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'IPRO10';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Stage en Administration scolaire', 1.334, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'IPRO10';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Rapport de stages pédagogique et en administration scolaire', 4.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'IPRO10';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Renforcement de la grammaire française', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'LAELNG01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Renforcement de la grammaire anglaise', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'LAELNG01';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Cinématique du point', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MCPMEC02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Dynamique du point', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MCPMEC02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Optimisation statique numérique', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MDIMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Concept de Treillis et Algorithmiques des graphes', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MDIMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Analyses statistiques multivariées', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MDIMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Traitement des Données Massives', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MDIMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'MERISE/SSADM', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MGLINF05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Atelier et Outils de Génie Logiciel-Interface Homme Machine', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MGLINF05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Langage Matlab', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MGLINF05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Analyse numérique matricielle', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MNMDI05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Résolution numérique des EDO', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MNMDI05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Initiation à la théorie de graphes', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MNMDI05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Langage Scilab', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MNMDI05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Méthodologie de recherche et Rédaction scientifique', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MRCMMS09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Histoire des Mathématiques', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MRCMMS09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Didacticiels', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MRCMMS09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Méthodologie de recherche et Rédaction scientifique', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MRCMSI09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Histoire de l''Informatique', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MRCMSI09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Didacticiels', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MRCMSI09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Analyse numérique matricielle', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MROINF05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Méthode numérique de résolution d''EDO et approximation des fonctions', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MROINF05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Initiation à la Théorie de graphes et Ordres', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MROINF05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Programmation linéaire', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MROINF05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Simulation et Optimisation stochastique', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MSAMMS09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Processus continus et EDS', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MSAMMS09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Calculs variationnels', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MSAMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Arithmétique modulaire et Cryptologie', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MSAMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Anneaux et Modules des polynômes', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MSAMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Modèles de régression', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MSOMTH08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Séries temporelles', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MSOMTH08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Eléments d''analyse de survie et de fiabilité', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'MSOMTH08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Dualité en optimisation', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'OPTMMD09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Optimisation multicritère', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'OPTMMD09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Algorithmiques des graphes', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'OPTMMD09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Probabilités élémentaires', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PCAMTH03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Séries numériques et Suites de fonctions', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PCAMTH03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Réduction des matrices', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PCAMTH03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Thermodynamique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PCHPHY02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Optique Géométrique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PCHPHY02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Chimie Générale', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PCHPHY02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'English for mathematics and informatics', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PDENS05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Initiation à la rédaction scientifique', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PDENS05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Didactique et pédagogie des maths et info', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PDENS05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'English for mathematics and informatic', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PENEDU05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Initiation à la rédaction scientifique', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PENEDU05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Didactique et pédagogie des mathématiques et informatiques', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PENEDU05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Programmation multimédia', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PRAINF08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Programmation des applications reparties', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PRAINF08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Programmation parallèle et multi-core', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PRAINF08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Algorithmique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PRGINF04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Programmation en langage C', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PRGINF04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Initiation aux multimédia', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PRGINF04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Programmation en langage R', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PRGINF04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Projet tuteuré', 5.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PROINF08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Projet tuteuré', 5.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PROMTH08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Programmation en objective C', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PRSINF04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Initiation au langage JAVA', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'PRSINF04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Insertion sociale et maîtrise du concept de l''égalité de genre', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'RADEDU07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Posture professionnelle en éducation et en formation', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'RADEDU07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Créativité, résilience et influence sociale', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'RADEDU07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Programmation linéaire avancée', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SADINF08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Système Informatique d''Aide à la Décision (SIAD)', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SADINF08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Statistiques Bayésiennes', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDAMMS09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Méthodes de sondage et d''Analyse de variance', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDAMMS09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Théorie de l''estimation', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDAMMS09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Techniques de simulation des lois', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDDMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Processus aléatoires à temps discret', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDDMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Modèles non-paramétriques', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDDMTH07';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Théorie de probabilités', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDDTM05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Théorie des mesures et Intégrations', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDDTM05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Statistique mathématique', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDDTM05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Réseaux commutés et réseau sans fil', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDIMSI08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Sécurité d’un système d’information', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDIMSI08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Analyse et conception des systèmes d’information', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDIMSI08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Cryptologie et Cryptosystème', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDRMSI08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Sécurité des réseaux', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDRMSI08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Virus et antivirus', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SDRMSI08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Culture et contact de culture', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SIEEDU03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Adolescence et crise', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SIEEDU03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Analyse et curricula', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SIEEDU03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Concepts fondamentaux de didactiques', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SIEEDU03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Stage en entreprise et/ou Mémoire de Licence', 6.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SMEM06';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Séminaires et Vulgarisation des recherches scientifiques', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SMEM10';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Elaboration d''article extrait de mémoire', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SMEM10';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Stage en Entreprise (ou de Recherche) et/ou Mémoire de fin d''études', 8.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SMEM10';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Statique analytique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SPLPHY02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Statique graphique', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SPLPHY02';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Stage pédagogique', 12.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SPRO06';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Rapport de stage pédagogique', 4.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'SPRO06';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Fonction de plusieurs variables', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'STAMTH04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Fonctions spéciales et Intégrales impropres', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'STAMTH04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Statistique inférentielle', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'STAMTH04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Topologie générale', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'TCDIFF05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Algèbre multilinéaire et Théorie de surfaces', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'TCDIFF05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Calcul différentiel et optimisation sans contraintes', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'TCDIFF05';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Réseaux commutés et réseau sans fil (à revoir)', 3.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'TDRINF08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Projet tuteuré', 5.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'TDRINF08';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Méthodes numériques des EDS', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'TEDMMD09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Théorie géométrique des EDO', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'TEDMMD09';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Technique d''expression française et différents types de langage', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'TEXLNG03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Technique d''expression anglaise', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'TEXLNG03';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Développement d''applications WEB', 2.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'TSIINF04';
INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) SELECT 'Production multimédia', 1.0, id_UE FROM UNITE_ENSEIGNEMENT WHERE code_UE = 'TSIINF04';

-- --- 4. Rattachement UE <-> Parcours (CONTENIR) ---
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L2' AND u.code_UE='ADRINF04';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M2' AND u.code_UE='AGIIAD09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L2' AND u.code_UE='ALAINF04';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='M1' AND u.code_UE='ALAMTH08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='Tronc Commun GMI' AND p.niveau='L1' AND u.code_UE='ALGMTH02';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='M1' AND u.code_UE='ANAMTH08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L2' AND u.code_UE='ANCMTH04';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='Tronc Commun GMI' AND p.niveau='L1' AND u.code_UE='ANMMTH01';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L2' AND u.code_UE='ARSINF03';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L2' AND u.code_UE='ARSINF03';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L2' AND u.code_UE='ASTAMTH04';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M1' AND u.code_UE='BDAINF07';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M1' AND u.code_UE='BDAINF07';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M1' AND u.code_UE='BDIIAD08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L3' AND u.code_UE='BDPINF05';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L2' AND u.code_UE='CDAMTH04';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L2' AND u.code_UE='CDGMTH04';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M2' AND u.code_UE='CLEG10';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M2' AND u.code_UE='CLEG10';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Déterministes)' AND p.niveau='M2' AND u.code_UE='CLEG10';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Stochastiques)' AND p.niveau='M2' AND u.code_UE='CLEG10';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='Tronc Commun GMI' AND p.niveau='L1' AND u.code_UE='CST02';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='M1' AND u.code_UE='DISMTH07';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='M1' AND u.code_UE='DIVERS-M1-16';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='M1' AND u.code_UE='DIVERS-M1-17';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='M1' AND u.code_UE='DIVERS-M1-18';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-113';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-114';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-115';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-116';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Stochastiques)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-51';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-52';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Stochastiques)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-52';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-53';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Stochastiques)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-53';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-54';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Stochastiques)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-54';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-55';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Déterministes)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-91';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Déterministes)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-92';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Déterministes)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-93';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Déterministes)' AND p.niveau='M2' AND u.code_UE='DIVERS-M2-94';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L3' AND u.code_UE='DLEG06';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L3' AND u.code_UE='DLEG06';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='Tronc Commun GMI' AND p.niveau='L1' AND u.code_UE='DOAINF01';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='Tronc Commun GMI' AND p.niveau='L1' AND u.code_UE='DSCDES01';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L2' AND u.code_UE='EAVMTH03';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L2' AND u.code_UE='EAVMTH03';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='Tronc Commun GMI' AND p.niveau='L1' AND u.code_UE='ECTRED01';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Déterministes)' AND p.niveau='M2' AND u.code_UE='EDAMMD09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='Tronc Commun GMI' AND p.niveau='L1' AND u.code_UE='EDEMTH01';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='M1' AND u.code_UE='EDIMTH07';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M1' AND u.code_UE='EDPINF07';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M1' AND u.code_UE='EDPINF07';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='Tronc Commun GMI' AND p.niveau='L1' AND u.code_UE='ELMELC02';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Stochastiques)' AND p.niveau='M2' AND u.code_UE='FDMMMS09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M1' AND u.code_UE='GDEINF07';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M1' AND u.code_UE='GDEINF07';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M2' AND u.code_UE='GDSMSI09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='M1' AND u.code_UE='GEOMTH08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M1' AND u.code_UE='IARIAD08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M2' AND u.code_UE='IHMIAD09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M2' AND u.code_UE='IMAMSI09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M2' AND u.code_UE='INTINF09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M2' AND u.code_UE='INTINF09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M2' AND u.code_UE='IPRO10';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M2' AND u.code_UE='IPRO10';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Déterministes)' AND p.niveau='M2' AND u.code_UE='IPRO10';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Stochastiques)' AND p.niveau='M2' AND u.code_UE='IPRO10';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='Tronc Commun GMI' AND p.niveau='L1' AND u.code_UE='LAELNG01';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='Tronc Commun GMI' AND p.niveau='L1' AND u.code_UE='MCPMEC02';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M1' AND u.code_UE='MDIMTH07';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M1' AND u.code_UE='MDIMTH07';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L3' AND u.code_UE='MGLINF05';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L3' AND u.code_UE='MNMDI05';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Déterministes)' AND p.niveau='M2' AND u.code_UE='MRCMMS09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Stochastiques)' AND p.niveau='M2' AND u.code_UE='MRCMMS09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M2' AND u.code_UE='MRCMSI09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M2' AND u.code_UE='MRCMSI09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L3' AND u.code_UE='MROINF05';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Stochastiques)' AND p.niveau='M2' AND u.code_UE='MSAMMS09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='M1' AND u.code_UE='MSAMTH07';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='M1' AND u.code_UE='MSOMTH08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Déterministes)' AND p.niveau='M2' AND u.code_UE='OPTMMD09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L2' AND u.code_UE='PCAMTH03';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L2' AND u.code_UE='PCAMTH03';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='Tronc Commun GMI' AND p.niveau='L1' AND u.code_UE='PCHPHY02';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L3' AND u.code_UE='PDENS05';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L3' AND u.code_UE='PENEDU05';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M1' AND u.code_UE='PRAINF08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M1' AND u.code_UE='PRAINF08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L2' AND u.code_UE='PRGINF04';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M1' AND u.code_UE='PROINF08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='M1' AND u.code_UE='PROMTH08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L2' AND u.code_UE='PRSINF04';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M1' AND u.code_UE='RADEDU07';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M1' AND u.code_UE='RADEDU07';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M1' AND u.code_UE='SADINF08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M1' AND u.code_UE='SADINF08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Stochastiques)' AND p.niveau='M2' AND u.code_UE='SDAMMS09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='M1' AND u.code_UE='SDDMTH07';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L3' AND u.code_UE='SDDTM05';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M1' AND u.code_UE='SDIMSI08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M1' AND u.code_UE='SDRMSI08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L2' AND u.code_UE='SIEEDU03';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L2' AND u.code_UE='SIEEDU03';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L3' AND u.code_UE='SMEM06';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L3' AND u.code_UE='SMEM06';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M2' AND u.code_UE='SMEM10';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (MSI)' AND p.niveau='M2' AND u.code_UE='SMEM10';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Déterministes)' AND p.niveau='M2' AND u.code_UE='SMEM10';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Stochastiques)' AND p.niveau='M2' AND u.code_UE='SMEM10';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='Tronc Commun GMI' AND p.niveau='L1' AND u.code_UE='SPLPHY02';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L3' AND u.code_UE='SPRO06';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L3' AND u.code_UE='SPRO06';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L2' AND u.code_UE='STAMTH04';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L3' AND u.code_UE='TCDIFF05';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique (IAD)' AND p.niveau='M1' AND u.code_UE='TDRINF08';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques (Modélisations Déterministes)' AND p.niveau='M2' AND u.code_UE='TEDMMD09';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L2' AND u.code_UE='TEXLNG03';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Mathématiques' AND p.niveau='L2' AND u.code_UE='TEXLNG03';
INSERT INTO CONTENIR (id_parcours, id_UE) SELECT p.id_parcours, u.id_UE FROM PARCOURS p, UNITE_ENSEIGNEMENT u WHERE p.nom_parcours='GMI - Informatique' AND p.niveau='L2' AND u.code_UE='TSIINF04';
-- =====================================================================
--  DONNEES DE DEMONSTRATION
-- =====================================================================
-- Scénario illustré : Sofia Randria a validé son S1 2024-2025, mais pas
-- son S2 (même après rattrapage) -> elle est "Admise avec dette" en L2,
-- avec 5 EC en dette. Un an plus tard (2025-2026), l'enseignant lui
-- enregistre une note de rattrapage de dette sur l'un de ces EC, qui
-- passe alors à "Soldée" ; les 4 autres restent "En cours".
-- =====================================================================

-- --- Comptes ---
INSERT INTO ADMINISTRATEUR (nom_admin, prenom_admin, email_admin, mot_de_pass_admin)
VALUES ('Rakoto', 'Admin', 'admin@universite.mg', '$2b$10$SDUMqb5SEnkb4oat4xNlt.iLpzGZsjPbXtZTtHqnmbGb/CBd/c1PW');
-- Mot de passe démo : "Admin@123"

INSERT INTO ENSEIGNANT (nom_enseignant, prenom_enseignant, matricule_enseignant, sexe, email_enseignant, mot_de_pass_enseignant)
VALUES ('Rabe', 'Jean', 'ENS-DEMO-001', 'M', 'jean.rabe@universite.mg', '$2b$10$KJAuBQrpwE.gJUj5uEv4s.eYNnjpafLjMZ1PIRGgbmwtyWzJD.WMC');
-- Mot de passe démo : "Enseignant@123"

-- Étudiante inscrite au départ en Tronc Commun GMI (L1)
INSERT INTO ETUDIANT (nom_etudiant, prenom_etudiant, date_naissance, sexe, email_etudiant, mot_de_pass_etudiant, id_parcours)
SELECT 'Randria', 'Sofia', '2003-05-14', 'F', 'sofia.randria@universite.mg',
       '$2b$10$Yqc/bnZ6Irs2FZIALg9rUOWZnqeDtjQkU4ZIiUGAbxlivXVHfSdE.',
       id_parcours FROM PARCOURS WHERE nom_parcours = 'Tronc Commun GMI' AND niveau = 'L1';
-- Mot de passe démo : "Etudiant@123"

-- --- Affectation de l'enseignant à tous les EC de L1 (pour la démo) ---
INSERT INTO ENSEIGNER (id_EC, id_enseignant)
SELECT ec.id_EC, 1 FROM ELEMENT_CONSTITUTIF ec
JOIN UNITE_ENSEIGNEMENT ue ON ue.id_UE = ec.id_UE
WHERE ue.niveau = 'L1';

-- --- Inscription année 2024-2025 : L1, admise avec dette (calculée manuellement pour la démo) ---
INSERT INTO INSCRIPTION (numero_etudiant, id_parcours, annee_universitaire, statut)
SELECT 1, id_parcours, '2024-2025', 'Admis avec dette' FROM PARCOURS WHERE nom_parcours = 'Tronc Commun GMI' AND niveau = 'L1';

-- --- Inscription année 2025-2026 : L2 Informatique, en cours ---
INSERT INTO INSCRIPTION (numero_etudiant, id_parcours, annee_universitaire, statut)
SELECT 1, id_parcours, '2025-2026', 'En cours' FROM PARCOURS WHERE nom_parcours = 'GMI - Informatique' AND niveau = 'L2';

-- L'étudiante est maintenant en L2 Informatique (son parcours "actuel")
UPDATE ETUDIANT SET id_parcours = (SELECT id_parcours FROM PARCOURS WHERE nom_parcours = 'GMI - Informatique' AND niveau = 'L2')
WHERE numero_etudiant = 1;

-- --- Notes du semestre S1 2024-2025 (validé) : une note "Session Normale" par EC ---
INSERT INTO EVALUER (numero_etudiant, id_EC, annee_universitaire, id_evaluation, note, date_evaluation, type_evaluation, id_enseignant_saisie)
SELECT 1, ec.id_EC, '2024-2025', 1, note_val, '2024-12-10', 'Session Normale', 1
FROM ELEMENT_CONSTITUTIF ec JOIN UNITE_ENSEIGNEMENT ue ON ue.id_UE = ec.id_UE
JOIN (
  SELECT 'Renforcement de la grammaire française' AS nom_EC, 13.5 AS note_val UNION ALL
  SELECT 'Renforcement de la grammaire anglaise', 12.0 UNION ALL
  SELECT 'Initiation à l''Informatique', 15.0 UNION ALL
  SELECT 'Méthodologie d''études supérieures', 14.0 UNION ALL
  SELECT 'Orientation des étudiants', 13.0 UNION ALL
  SELECT 'Logique et modes de raisonnement', 12.5 UNION ALL
  SELECT 'Analyse Réelle', 11.0 UNION ALL
  SELECT 'Analyse Vectorielle', 12.0 UNION ALL
  SELECT 'Autour du soi', 14.0 UNION ALL
  SELECT 'Eléments de pédagogie, tendances pédagogiques', 13.0
) AS notes_s1 ON notes_s1.nom_EC = ec.nom_EC
WHERE ue.niveau = 'L1' AND ue.semestre = 'S1';

-- --- Notes du semestre S2 2024-2025, SESSION NORMALE (plusieurs échecs) ---
INSERT INTO EVALUER (numero_etudiant, id_EC, annee_universitaire, id_evaluation, note, date_evaluation, type_evaluation, id_enseignant_saisie)
SELECT 1, ec.id_EC, '2024-2025', 1, note_val, '2025-05-15', 'Session Normale', 1
FROM ELEMENT_CONSTITUTIF ec JOIN UNITE_ENSEIGNEMENT ue ON ue.id_UE = ec.id_UE
JOIN (
  SELECT 'Algèbre polynomiale et fractions rationnelles' AS nom_EC, 13.0 AS note_val UNION ALL
  SELECT 'Géométrie Descriptive', 12.5 UNION ALL
  SELECT 'Géométrie Analytique', 13.5 UNION ALL
  SELECT 'Cinématique du point', 6.0 UNION ALL
  SELECT 'Dynamique du point', 6.5 UNION ALL
  SELECT 'Initiation à l''algorithmique', 5.5 UNION ALL
  SELECT 'Calculs Numériques', 5.0 UNION ALL
  SELECT 'Statistique Descriptive', 6.0
) AS notes_s2n ON notes_s2n.nom_EC = ec.nom_EC
WHERE ue.niveau = 'L1' AND ue.semestre = 'S2';

-- --- Notes du semestre S2 2024-2025, SESSION RATTRAPAGE ---
-- (MCPMEC02 ne se rattrape pas -> reste en échec -> dette ; CST02
--  progresse un peu mais reste sous la moyenne -> dette également)
INSERT INTO EVALUER (numero_etudiant, id_EC, annee_universitaire, id_evaluation, note, date_evaluation, type_evaluation, id_enseignant_saisie)
SELECT 1, ec.id_EC, '2024-2025', 2, note_val, '2025-07-05', 'Rattrapage', 1
FROM ELEMENT_CONSTITUTIF ec JOIN UNITE_ENSEIGNEMENT ue ON ue.id_UE = ec.id_UE
JOIN (
  SELECT 'Cinématique du point' AS nom_EC, 6.0 AS note_val UNION ALL
  SELECT 'Dynamique du point', 5.5 UNION ALL
  SELECT 'Initiation à l''algorithmique', 9.0 UNION ALL
  SELECT 'Calculs Numériques', 9.5 UNION ALL
  SELECT 'Statistique Descriptive', 8.5
) AS notes_s2r ON notes_s2r.nom_EC = ec.nom_EC
WHERE ue.niveau = 'L1' AND ue.semestre = 'S2';

-- --- Dettes ouvertes en 2024-2025 sur les 5 EC restés sous la moyenne au rattrapage ---
INSERT INTO DETTE (numero_etudiant, id_EC, annee_universitaire_origine, statut)
SELECT 1, ec.id_EC, '2024-2025', 'En cours'
FROM ELEMENT_CONSTITUTIF ec JOIN UNITE_ENSEIGNEMENT ue ON ue.id_UE = ec.id_UE
WHERE ue.niveau = 'L1' AND ec.nom_EC IN (
  'Cinématique du point', 'Dynamique du point',
  'Initiation à l''algorithmique', 'Calculs Numériques', 'Statistique Descriptive'
);

-- --- 2025-2026 : l'enseignant solde UNE des dettes (Cinématique du point) ---
INSERT INTO EVALUER (numero_etudiant, id_EC, annee_universitaire, id_evaluation, note, date_evaluation, type_evaluation, id_enseignant_saisie)
SELECT 1, ec.id_EC, '2025-2026', 1, 12.0, '2025-11-20', 'Rattrapage', 1
FROM ELEMENT_CONSTITUTIF ec WHERE ec.nom_EC = 'Cinématique du point';

UPDATE DETTE SET statut = 'Soldée', annee_universitaire_soldee = '2025-2026'
WHERE numero_etudiant = 1 AND id_EC = (SELECT id_EC FROM ELEMENT_CONSTITUTIF WHERE nom_EC = 'Cinématique du point');

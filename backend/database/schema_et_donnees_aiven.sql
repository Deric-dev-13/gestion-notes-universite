-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : mar. 27 oct. 2026 à 15:20
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `gestion_notes`
--

-- --------------------------------------------------------

--
-- Structure de la table `ADMINISTRATEUR`
--

CREATE TABLE `ADMINISTRATEUR` (
  `id_admin` int(11) NOT NULL,
  `nom_admin` varchar(100) NOT NULL,
  `prenom_admin` varchar(100) NOT NULL,
  `email_admin` varchar(150) NOT NULL,
  `mot_de_pass_admin` varchar(255) NOT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT 1,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `ADMINISTRATEUR`
--

INSERT INTO `ADMINISTRATEUR` (`id_admin`, `nom_admin`, `prenom_admin`, `email_admin`, `mot_de_pass_admin`, `actif`, `date_creation`) VALUES
(1, 'Rakoto', 'Admin', 'admin@universite.mg', '$2b$10$SDUMqb5SEnkb4oat4xNlt.iLpzGZsjPbXtZTtHqnmbGb/CBd/c1PW', 1, '2026-09-14 09:42:22');

-- --------------------------------------------------------

--
-- Structure de la table `CONTENIR`
--

CREATE TABLE `CONTENIR` (
  `id_parcours` int(11) NOT NULL,
  `id_UE` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `CONTENIR`
--

INSERT INTO `CONTENIR` (`id_parcours`, `id_UE`) VALUES
(1, 5),
(1, 8),
(1, 17),
(1, 36),
(1, 37),
(1, 39),
(1, 41),
(1, 44),
(1, 54),
(1, 55),
(1, 67),
(1, 85),
(2, 7),
(2, 9),
(2, 14),
(2, 15),
(2, 38),
(2, 66),
(2, 71),
(2, 82),
(2, 87),
(2, 91),
(3, 1),
(3, 3),
(3, 9),
(3, 10),
(3, 38),
(3, 66),
(3, 74),
(3, 82),
(3, 91),
(3, 92),
(4, 35),
(4, 58),
(4, 68),
(4, 79),
(4, 83),
(4, 86),
(4, 88),
(5, 13),
(5, 35),
(5, 57),
(5, 61),
(5, 69),
(5, 83),
(5, 86),
(6, 4),
(6, 6),
(6, 18),
(6, 19),
(6, 20),
(6, 21),
(6, 42),
(6, 48),
(6, 63),
(6, 64),
(6, 73),
(6, 78),
(7, 11),
(7, 43),
(7, 46),
(7, 56),
(7, 70),
(7, 72),
(7, 75),
(7, 76),
(7, 80),
(7, 81),
(8, 11),
(8, 12),
(8, 43),
(8, 46),
(8, 49),
(8, 56),
(8, 70),
(8, 75),
(8, 76),
(8, 89),
(9, 16),
(9, 26),
(9, 27),
(9, 28),
(9, 29),
(9, 45),
(9, 53),
(9, 59),
(9, 62),
(9, 77),
(9, 84),
(10, 16),
(10, 31),
(10, 32),
(10, 33),
(10, 34),
(10, 40),
(10, 53),
(10, 59),
(10, 65),
(10, 84),
(10, 90),
(11, 16),
(11, 27),
(11, 28),
(11, 29),
(11, 30),
(11, 47),
(11, 51),
(11, 52),
(11, 53),
(11, 60),
(11, 84),
(12, 2),
(12, 16),
(12, 22),
(12, 23),
(12, 24),
(12, 25),
(12, 50),
(12, 52),
(12, 53),
(12, 60),
(12, 84),
(14, 93);

-- --------------------------------------------------------

--
-- Structure de la table `DEMANDE_REINITIALISATION`
--

CREATE TABLE `DEMANDE_REINITIALISATION` (
  `id_demande` int(11) NOT NULL,
  `email` varchar(150) NOT NULL,
  `role` enum('etudiant','enseignant','admin') NOT NULL,
  `mot_de_passe_souhaite` varchar(255) NOT NULL,
  `token_hash` char(64) DEFAULT NULL,
  `token_expire` timestamp NULL DEFAULT NULL,
  `statut` enum('En attente','Traité','Rejeté','Expiré') NOT NULL DEFAULT 'En attente',
  `date_demande` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_traitement` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `DEMANDE_REINITIALISATION`
--


-- --------------------------------------------------------

--
-- Structure de la table `DEMANDE_RESPONSABILITE`
--

CREATE TABLE `DEMANDE_RESPONSABILITE` (
  `id_enseignant` int(11) NOT NULL,
  `id_parcours` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `DEMANDE_RESPONSABILITE`
--

INSERT INTO `DEMANDE_RESPONSABILITE` (`id_enseignant`, `id_parcours`) VALUES
(16, 1),
(16, 2),
(16, 3),
(16, 4),
(16, 5),
(16, 6),
(16, 7),
(16, 8),
(16, 9),
(16, 10),
(16, 11),
(16, 12),
(17, 1),
(17, 2),
(17, 3),
(17, 4),
(17, 5),
(17, 6),
(17, 7),
(17, 8),
(17, 9),
(17, 10),
(17, 11),
(17, 12);

-- --------------------------------------------------------

--
-- Structure de la table `DETTE`
--

CREATE TABLE `DETTE` (
  `id_dette` int(11) NOT NULL,
  `numero_etudiant` int(11) NOT NULL,
  `id_EC` int(11) NOT NULL,
  `annee_universitaire_origine` varchar(20) NOT NULL,
  `annee_universitaire_soldee` varchar(20) DEFAULT NULL,
  `statut` enum('En cours','Soldée') NOT NULL DEFAULT 'En cours',
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `DETTE`
--

INSERT INTO `DETTE` (`id_dette`, `numero_etudiant`, `id_EC`, `annee_universitaire_origine`, `annee_universitaire_soldee`, `statut`, `date_creation`) VALUES
(6, 15, 79, '2026-2027', '2026-2027', 'Soldée', '2026-10-18 18:17:14'),
(7, 15, 80, '2026-2027', '2026-2027', 'Soldée', '2026-10-18 18:17:14'),
(8, 15, 81, '2026-2027', '2026-2027', 'Soldée', '2026-10-18 18:17:14'),
(9, 15, 159, '2026-2027', '2026-2027', 'Soldée', '2026-10-18 18:17:14');

-- --------------------------------------------------------

--
-- Structure de la table `ELEMENT_CONSTITUTIF`
--

CREATE TABLE `ELEMENT_CONSTITUTIF` (
  `id_EC` int(11) NOT NULL,
  `nom_EC` varchar(200) NOT NULL,
  `credit` decimal(4,1) NOT NULL,
  `id_UE` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `ELEMENT_CONSTITUTIF`
--

INSERT INTO `ELEMENT_CONSTITUTIF` (`id_EC`, `nom_EC`, `credit`, `id_UE`) VALUES
(1, 'Eléments d\'administration réseau', 3.0, 1),
(2, 'Bases de maintenance hardware', 2.0, 1),
(3, 'Réseau sans fil', 1.0, 1),
(4, 'Fouille de données et apprentissage automatique', 2.0, 2),
(5, 'Agents adaptatifs', 2.0, 2),
(6, 'Agents décisionnels', 2.0, 2),
(7, 'Base de données relationnelle', 4.0, 3),
(8, 'Structure de données et algorithmes', 3.0, 3),
(9, 'Algorithmes et complexités', 2.0, 3),
(10, 'Extension des corps et Théorie de Galois', 3.0, 4),
(11, 'Optimisation dynamique', 2.0, 4),
(12, 'Algèbre polynomiale et fractions rationnelles', 2.0, 5),
(13, 'Géométrie Descriptive', 2.0, 5),
(14, 'Géométrie Analytique', 2.0, 5),
(15, 'Equations et Transformations intégrales', 3.0, 6),
(16, 'Analyse numérique des EDP et EDO', 2.0, 6),
(17, 'Théorie des éléments et différences finis', 2.0, 6),
(18, 'Analyse complexe', 2.0, 7),
(19, 'Applications conformes', 2.0, 7),
(20, 'Analyse Réelle', 3.0, 8),
(21, 'Analyse Vectorielle', 2.0, 8),
(22, 'Architecture des ordinateurs', 3.0, 9),
(23, 'Réseaux et internet', 2.0, 9),
(24, 'Logiciels libres et système d\'exploitation Linux', 2.0, 9),
(25, 'Fonction de plusieurs variables', 2.0, 10),
(26, 'Arithmétique de Z', 1.0, 10),
(27, 'Statistique inférentielle', 3.0, 10),
(28, 'Système d\'Information Géographique', 2.0, 11),
(29, 'JAVA DATABASE CONNECTIVITE (JDBC)', 2.0, 11),
(30, 'Base de données distribuée', 2.0, 11),
(31, 'Validation des logiciels', 1.0, 11),
(32, 'Recherche d\'informations et images', 2.0, 12),
(33, 'Fouille intelligente de données', 2.0, 12),
(34, 'Programmation événémentielle', 3.0, 13),
(35, 'Programmation Orientée Objet', 3.0, 13),
(36, 'Conception d\'une base de données et SGBD', 3.0, 13),
(37, 'Administration d\'une base de données', 2.0, 13),
(38, 'Généralités sur les espaces vectoriels', 2.0, 14),
(39, 'Eléments de théorie de groupe', 2.0, 14),
(40, 'Arithmétique de Z', 2.0, 14),
(41, 'Geométrie euclidienne élémentaire', 2.0, 15),
(42, 'Geométrie projective', 2.0, 15),
(43, 'Législation sur l\'enseignement', 1.5, 16),
(44, 'Législation financière', 1.2, 16),
(45, 'Initiation à l\'algorithmique', 2.0, 17),
(46, 'Calculs Numériques', 2.0, 17),
(47, 'Statistique Descriptive', 2.0, 17),
(48, 'Optimisation statique numérique', 3.0, 18),
(49, 'Eléments de Treillis et de Graphes', 2.0, 18),
(50, 'Statistique multivariée', 2.0, 18),
(51, 'Traitement des Données Massives', 3.0, 18),
(52, 'Insertion sociale et maîtrise du concept de l\'égalité de genre', 1.0, 19),
(53, 'Posture professionnelle en éducation et en formation', 1.0, 20),
(54, 'Créativité, résilience et influence sociale', 1.0, 21),
(55, 'Management de classe et leadership + Logique de communication et Adolescents', 3.0, 22),
(56, 'Simulation et analyse de pratique d\'enseignement', 2.0, 23),
(57, 'Système économique mondial', 1.0, 24),
(58, 'Histoire de sciences de l\'éducation', 1.0, 25),
(59, 'Management de classe et leadership + Logique de communication et Adolescents', 3.0, 26),
(60, 'Simulation et analyse de pratique d\'enseignement', 2.0, 27),
(61, 'Système économique mondial', 1.0, 28),
(62, 'Histoire de sciences de l\'éducation', 1.0, 29),
(63, 'Histoire de sciences de l\'éducation', 1.0, 30),
(64, 'Management de classe et leadership + Logique de communication et Adolescents', 3.0, 31),
(65, 'Simulation et analyse de pratique d\'enseignement', 2.0, 32),
(66, 'Système économique mondial', 1.0, 33),
(67, 'Histoire de sciences de l\'éducation', 1.0, 34),
(68, 'Législation scolaire de base, et Correspondance administrative', 3.0, 35),
(69, 'Législation Administrative de base, et Gestion du Patrimoine scolaire', 3.0, 35),
(70, 'Déontologie des Fonctionnaires', 2.0, 35),
(71, 'Initiation à l\'Informatique', 2.0, 36),
(72, 'Méthodologie d\'études supérieures', 1.0, 36),
(73, 'Orientation des étudiants', 1.0, 36),
(74, 'Logique et modes de raisonnement', 1.0, 36),
(75, 'Dessins techniques de base', 2.0, 37),
(76, 'Dessins techniques appliqués : industriel', 2.0, 37),
(77, 'Dessins techniques appliqués : génie civil', 2.0, 37),
(78, 'Initiation au schéma électrique', 2.0, 37),
(79, 'Espace dual et Forme bilinéaire', 2.0, 38),
(80, 'Espaces affine et projectif', 2.0, 38),
(81, 'Espaces métrique et vectoriel normé', 3.0, 38),
(82, 'Autour du soi', 1.0, 39),
(83, 'De l\'évolution du concept de didactique à la transposition didactique', 1.0, 39),
(84, 'Eléments de pédagogie, tendances pédagogiques', 1.0, 39),
(85, 'Philosophie de l\'éducation', 1.0, 39),
(86, 'Distributions appliquées aux EDP', 2.0, 40),
(87, 'EDP d\'évolution', 2.0, 40),
(88, 'Application des EDP en traitment des signaux', 3.0, 40),
(89, 'Espace vectoriel de dimension finie', 3.0, 41),
(90, 'Equations Différentielles ordinaires', 2.0, 41),
(91, 'Equation aux dérivées partielles', 2.0, 42),
(92, 'Analyse des Equations Différentielles Ordinaires', 2.0, 42),
(93, 'Analyse fonctionnelle', 2.0, 42),
(94, 'Méthode des caractéristiques et des différences finies', 2.0, 43),
(95, 'Théorie de fiabilité des systèmes réparables', 2.0, 43),
(96, 'Méthode des éléments et des volumes finis', 2.0, 43),
(97, 'Electrostatique', 2.0, 44),
(98, 'Magnétostatique', 2.0, 44),
(99, 'Contrôle de qualité et expertise statistique', 3.0, 45),
(100, 'Fouille des règles d\'association et Classification', 3.0, 45),
(101, 'Gestion des ressources humaines', 2.0, 46),
(102, 'Conduite et Gestion de projets informatiques', 3.0, 46),
(103, 'Comptabilité générale et analytique', 2.0, 47),
(104, 'Gestion financière et Management d\'une entreprise', 3.0, 47),
(105, 'Droit de l\'informatique et des réseaux', 2.0, 47),
(106, 'Géométrie algébrique', 2.0, 48),
(107, 'Géométrie différentielle', 2.0, 48),
(108, 'Géométries non euclidiennes', 2.0, 48),
(109, 'Concept et théorie de l\'intelligence artificielle', 3.0, 49),
(110, 'PROgrammation en LOGique', 2.0, 49),
(111, 'Modélisation du raisonnement', 2.0, 49),
(112, 'Conception des systèmes interactifs', 3.0, 50),
(113, 'Eléments de Psychologie appliquée aux systèmes interactifs', 2.0, 50),
(114, 'Aspects informatiques d\'Interface Homme/Machine', 2.0, 50),
(115, 'Conduite et Gestion de Projet Informatique', 3.0, 51),
(116, 'Schéma Directeur Informatique', 3.0, 51),
(117, 'Conception et administration d\'un site Web éducatif', 3.0, 52),
(118, 'Les services Internet et le cloud computing', 2.0, 52),
(119, 'Stage Pédagogique', 12.0, 53),
(120, 'Stage en Administration scolaire', 1.3, 53),
(121, 'Rapport de stages pédagogique et en administration scolaire', 4.0, 53),
(122, 'Renforcement de la grammaire française', 2.0, 54),
(123, 'Renforcement de la grammaire anglaise', 1.0, 54),
(124, 'Cinématique du point', 2.0, 55),
(125, 'Dynamique du point', 2.0, 55),
(126, 'Optimisation statique numérique', 3.0, 56),
(127, 'Concept de Treillis et Algorithmiques des graphes', 2.0, 56),
(128, 'Analyses statistiques multivariées', 2.0, 56),
(129, 'Traitement des Données Massives', 2.0, 56),
(130, 'MERISE/SSADM', 3.0, 57),
(131, 'Atelier et Outils de Génie Logiciel-Interface Homme Machine', 2.0, 57),
(132, 'Langage Matlab', 2.0, 57),
(133, 'Analyse numérique matricielle', 2.0, 58),
(134, 'Résolution numérique des EDO', 2.0, 58),
(135, 'Initiation à la théorie de graphes', 2.0, 58),
(136, 'Langage Scilab', 2.0, 58),
(137, 'Méthodologie de recherche et Rédaction scientifique', 3.0, 59),
(138, 'Histoire des Mathématiques', 1.0, 59),
(139, 'Didacticiels', 1.0, 59),
(140, 'Méthodologie de recherche et Rédaction scientifique', 3.0, 60),
(141, 'Histoire de l\'Informatique', 1.0, 60),
(142, 'Didacticiels', 1.0, 60),
(143, 'Analyse numérique matricielle', 2.0, 61),
(144, 'Méthode numérique de résolution d\'EDO et approximation des fonctions', 2.0, 61),
(145, 'Initiation à la Théorie de graphes et Ordres', 2.0, 61),
(146, 'Programmation linéaire', 1.0, 61),
(147, 'Simulation et Optimisation stochastique', 3.0, 62),
(148, 'Processus continus et EDS', 2.0, 62),
(149, 'Calculs variationnels', 1.0, 63),
(150, 'Arithmétique modulaire et Cryptologie', 2.0, 63),
(151, 'Anneaux et Modules des polynômes', 2.0, 63),
(152, 'Modèles de régression', 2.0, 64),
(153, 'Séries temporelles', 2.0, 64),
(154, 'Eléments d\'analyse de survie et de fiabilité', 3.0, 64),
(155, 'Dualité en optimisation', 3.0, 65),
(156, 'Optimisation multicritère', 2.0, 65),
(157, 'Algorithmiques des graphes', 2.0, 65),
(158, 'Probabilités élémentaires', 3.0, 66),
(159, 'Séries numériques et Suites de fonctions', 3.0, 66),
(160, 'Réduction des matrices', 2.0, 66),
(161, 'Thermodynamique', 2.0, 67),
(162, 'Optique Géométrique', 2.0, 67),
(163, 'Chimie Générale', 2.0, 67),
(164, 'English for mathematics and informatics', 1.0, 68),
(165, 'Initiation à la rédaction scientifique', 1.0, 68),
(166, 'Didactique et pédagogie des maths et info', 3.0, 68),
(167, 'English for mathematics and informatic', 1.0, 69),
(168, 'Initiation à la rédaction scientifique', 1.0, 69),
(169, 'Didactique et pédagogie des mathématiques et informatiques', 3.0, 69),
(170, 'Programmation multimédia', 2.0, 70),
(171, 'Programmation des applications reparties', 3.0, 70),
(172, 'Programmation parallèle et multi-core', 2.0, 70),
(173, 'Algorithmique', 2.0, 71),
(174, 'Programmation en langage C', 3.0, 71),
(175, 'Initiation aux multimédia', 1.0, 71),
(176, 'Programmation en langage R', 2.0, 71),
(177, 'Projet tuteuré', 5.0, 72),
(178, 'Projet tuteuré', 5.0, 73),
(179, 'Programmation en objective C', 3.0, 74),
(180, 'Initiation au langage JAVA', 3.0, 74),
(181, 'Insertion sociale et maîtrise du concept de l\'égalité de genre', 1.0, 75),
(182, 'Posture professionnelle en éducation et en formation', 1.0, 75),
(183, 'Créativité, résilience et influence sociale', 1.0, 75),
(184, 'Programmation linéaire avancée', 2.0, 76),
(185, 'Système Informatique d\'Aide à la Décision (SIAD)', 1.0, 76),
(186, 'Statistiques Bayésiennes', 2.0, 77),
(187, 'Méthodes de sondage et d\'Analyse de variance', 3.0, 77),
(188, 'Théorie de l\'estimation', 2.0, 77),
(189, 'Techniques de simulation des lois', 2.0, 78),
(190, 'Processus aléatoires à temps discret', 2.0, 78),
(191, 'Modèles non-paramétriques', 2.0, 78),
(192, 'Théorie de probabilités', 3.0, 79),
(193, 'Théorie des mesures et Intégrations', 3.0, 79),
(194, 'Statistique mathématique', 3.0, 79),
(195, 'Réseaux commutés et réseau sans fil', 2.0, 80),
(196, 'Sécurité d’un système d’information', 3.0, 80),
(197, 'Analyse et conception des systèmes d’information', 3.0, 80),
(198, 'Cryptologie et Cryptosystème', 2.0, 81),
(199, 'Sécurité des réseaux', 3.0, 81),
(200, 'Virus et antivirus', 2.0, 81),
(201, 'Culture et contact de culture', 1.0, 82),
(202, 'Adolescence et crise', 1.0, 82),
(203, 'Analyse et curricula', 1.0, 82),
(204, 'Concepts fondamentaux de didactiques', 1.0, 82),
(205, 'Stage en entreprise et/ou Mémoire de Licence', 6.0, 83),
(206, 'Séminaires et Vulgarisation des recherches scientifiques', 1.0, 84),
(207, 'Elaboration d\'article extrait de mémoire', 1.0, 84),
(208, 'Stage en Entreprise (ou de Recherche) et/ou Mémoire de fin d\'études', 8.0, 84),
(209, 'Statique analytique', 2.0, 85),
(210, 'Statique graphique', 2.0, 85),
(211, 'Stage pédagogique', 12.0, 86),
(212, 'Rapport de stage pédagogique', 4.0, 86),
(213, 'Fonction de plusieurs variables', 3.0, 87),
(214, 'Fonctions spéciales et Intégrales impropres', 2.0, 87),
(215, 'Statistique inférentielle', 3.0, 87),
(216, 'Topologie générale', 3.0, 88),
(217, 'Algèbre multilinéaire et Théorie de surfaces', 3.0, 88),
(218, 'Calcul différentiel et optimisation sans contraintes', 2.0, 88),
(219, 'Réseaux commutés et réseau sans fil (à revoir)', 3.0, 89),
(220, 'Projet tuteuré', 5.0, 89),
(221, 'Méthodes numériques des EDS', 2.0, 90),
(222, 'Théorie géométrique des EDO', 2.0, 90),
(223, 'Technique d\'expression française et différents types de langage', 2.0, 91),
(224, 'Technique d\'expression anglaise', 2.0, 91),
(225, 'Développement d\'applications WEB', 2.0, 92),
(226, 'Production multimédia', 1.0, 92),
(227, 'electricite de industrie', 2.0, 93),
(228, 'electrique de batiment', 1.0, 93);

-- --------------------------------------------------------

--
-- Structure de la table `ENSEIGNANT`
--

CREATE TABLE `ENSEIGNANT` (
  `id_enseignant` int(11) NOT NULL,
  `nom_enseignant` varchar(100) NOT NULL,
  `prenom_enseignant` varchar(100) NOT NULL,
  `matricule_enseignant` varchar(50) NOT NULL,
  `sexe` enum('M','F') NOT NULL,
  `date_naissance` date DEFAULT NULL,
  `cin` varchar(20) DEFAULT NULL,
  `tel_enseignant` varchar(20) DEFAULT NULL,
  `diplome` varchar(100) DEFAULT NULL,
  `grade` varchar(100) DEFAULT NULL,
  `specialite` varchar(100) DEFAULT NULL,
  `mention_etabisement_attache` varchar(100) DEFAULT NULL,
  `role_responsabilite_demande` enum('parcours','mention') DEFAULT NULL,
  `email_enseignant` varchar(150) NOT NULL,
  `mot_de_pass_enseignant` varchar(255) NOT NULL,
  `id_parcours` int(11) DEFAULT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT 1,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `ENSEIGNANT`
--

INSERT INTO `ENSEIGNANT` (`id_enseignant`, `nom_enseignant`, `prenom_enseignant`, `matricule_enseignant`, `sexe`, `date_naissance`, `cin`, `tel_enseignant`, `diplome`, `grade`, `specialite`, `mention_etabisement_attache`, `role_responsabilite_demande`, `email_enseignant`, `mot_de_pass_enseignant`, `id_parcours`, `actif`, `date_creation`) VALUES
(1, 'Rabe', 'Jean', 'ENS-DEMO-001', 'M', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'jean.rabe@universite.mg', '$2b$10$KJAuBQrpwE.gJUj5uEv4s.eYNnjpafLjMZ1PIRGgbmwtyWzJD.WMC', NULL, 1, '2026-09-14 09:42:22'),
(2, 'RATOVONJANAHARY', 'Miandrisoa', '1243', 'M', '1988-02-12', '41913648344', '0325230418', 'doctorat', 'chef de conference', 'mathematique', 'GMI-GM-GC', NULL, 'ratovonjanaharymiandrisoaderic@gmail.com', '$2b$10$.d1aQ1JZFC/U5/oCgrk4uuVhPUJOmALTJHv7AQ4i0hnab0iE0tzv6', NULL, 1, '2026-09-14 09:57:51'),
(4, 'RATOVONJANAHARY', 'Miandrisoa Deric', '2486432', 'M', '1992-08-08', '250742115', '0341109852', 'doctorat', 'chef de conference', 'mathematique', 'GMI-GM-GC', NULL, 'rmiandrisoaderic@gmail.com', '$2b$10$i9Tszs5u0uXGkz0KahtuWuuavzBqjXJxHICkSQaf7Iy84TUbQ1JBu', NULL, 1, '2026-09-15 16:17:39'),
(13, 'Jean', '1', '283', 'M', '2026-10-13', 'Sjdbdel', '03484649', 'Oshdkdok', 'Gask', 'Hskdldn', 'Bsjdldndbd', NULL, 'jean@gmail.com', '$2b$10$yxUOWu1gEvkC2xE8t3a64uDx3EPrnD/XJnsKs6AunOHcE9AeXFY8C', NULL, 1, '2026-10-18 17:06:22'),
(15, 'RATOVONJANAHARY', 'Miandrisoa', 'gyyrt', 'M', '0563-05-24', '35356', '0339536644', '35', '34', 'mathematique', 'GMI-GM-GC', NULL, 'rmiandrisoaderic@email.com', '$2b$10$tmffMNf77.g.mUkEhj3f6ePmdcT.cQnkHFa36ZS2ys.aqpMD1OvXC', NULL, 1, '2026-10-18 18:39:04'),
(16, 'Mr', 'R', '394749', 'M', '1978-10-25', '40127363976', '0341956584', 'Docteur', NULL, 'Mathématiques', 'GMI', 'mention', 'r@gmail.com', '$2b$10$HWg4Ie1qd72a6Q79wokxl.tPd3NcOyFpCgdk1DkIxgjBqAuzqSfxq', NULL, 1, '2026-10-25 09:01:54'),
(17, 'Mr', 'P', '29379', 'M', '1998-10-25', '415768908378', '0324136852', 'Master', NULL, 'Informatique', 'GMI', 'parcours', 'p@gmail.com', '$2b$10$LG2YS1yWlhf17I.7iPFSzOOk26dMZSdOB0u1lml3YUEEP.CpGMEm2', NULL, 1, '2026-10-25 09:07:15');

-- --------------------------------------------------------

--
-- Structure de la table `ENSEIGNER`
--

CREATE TABLE `ENSEIGNER` (
  `id_EC` int(11) NOT NULL,
  `id_enseignant` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `ENSEIGNER`
--

INSERT INTO `ENSEIGNER` (`id_EC`, `id_enseignant`) VALUES
(1, 13),
(2, 13),
(3, 13),
(7, 13),
(8, 13),
(9, 13),
(12, 1),
(12, 2),
(13, 1),
(13, 2),
(14, 1),
(14, 2),
(18, 15),
(18, 17),
(19, 15),
(19, 17),
(20, 1),
(20, 2),
(21, 1),
(21, 2),
(22, 13),
(22, 15),
(22, 17),
(23, 13),
(23, 15),
(23, 17),
(24, 13),
(24, 15),
(24, 17),
(25, 13),
(26, 13),
(27, 13),
(34, 17),
(35, 17),
(36, 17),
(37, 17),
(38, 15),
(38, 17),
(39, 15),
(39, 17),
(40, 15),
(40, 17),
(41, 15),
(41, 17),
(42, 15),
(42, 17),
(43, 4),
(43, 16),
(44, 4),
(44, 16),
(45, 1),
(45, 2),
(46, 1),
(46, 2),
(47, 1),
(47, 2),
(59, 4),
(59, 16),
(60, 4),
(60, 16),
(61, 4),
(61, 16),
(62, 4),
(62, 16),
(64, 16),
(65, 16),
(66, 16),
(67, 16),
(68, 17),
(69, 17),
(70, 17),
(71, 1),
(71, 2),
(72, 1),
(72, 2),
(73, 1),
(73, 2),
(74, 1),
(74, 2),
(75, 1),
(75, 2),
(76, 1),
(76, 2),
(77, 1),
(77, 2),
(78, 1),
(78, 2),
(79, 13),
(79, 15),
(79, 17),
(80, 13),
(80, 15),
(80, 17),
(81, 13),
(81, 15),
(81, 17),
(82, 1),
(82, 2),
(83, 1),
(83, 2),
(84, 1),
(84, 2),
(85, 1),
(85, 2),
(86, 16),
(87, 16),
(88, 16),
(89, 1),
(89, 2),
(90, 1),
(90, 2),
(97, 1),
(97, 2),
(98, 1),
(98, 2),
(99, 4),
(99, 16),
(100, 4),
(100, 16),
(119, 4),
(119, 16),
(120, 4),
(120, 16),
(121, 4),
(121, 16),
(122, 1),
(122, 2),
(123, 1),
(123, 2),
(124, 1),
(124, 2),
(125, 1),
(125, 2),
(130, 17),
(131, 17),
(132, 17),
(137, 4),
(137, 16),
(138, 4),
(138, 16),
(139, 4),
(139, 16),
(143, 17),
(144, 17),
(145, 17),
(146, 17),
(147, 4),
(147, 16),
(148, 4),
(148, 16),
(155, 16),
(156, 16),
(157, 16),
(158, 13),
(158, 15),
(158, 17),
(159, 13),
(159, 15),
(159, 17),
(160, 13),
(160, 15),
(160, 17),
(161, 1),
(161, 2),
(162, 1),
(162, 2),
(163, 1),
(163, 2),
(167, 17),
(168, 17),
(169, 17),
(173, 15),
(173, 17),
(174, 15),
(174, 17),
(175, 15),
(175, 17),
(176, 15),
(176, 17),
(179, 13),
(180, 13),
(186, 4),
(186, 16),
(187, 4),
(187, 16),
(188, 4),
(188, 16),
(201, 13),
(201, 15),
(201, 17),
(202, 13),
(202, 15),
(202, 17),
(203, 13),
(203, 15),
(203, 17),
(204, 13),
(204, 15),
(204, 17),
(205, 17),
(206, 4),
(206, 16),
(207, 4),
(207, 16),
(208, 4),
(208, 16),
(209, 1),
(209, 2),
(210, 1),
(210, 2),
(211, 17),
(212, 17),
(213, 15),
(213, 17),
(214, 15),
(214, 17),
(215, 15),
(215, 17),
(221, 16),
(222, 1),
(222, 16),
(223, 13),
(223, 15),
(223, 17),
(224, 13),
(224, 15),
(224, 17),
(225, 13),
(226, 13);

-- --------------------------------------------------------

--
-- Structure de la table `ETUDIANT`
--

CREATE TABLE `ETUDIANT` (
  `numero_etudiant` int(11) NOT NULL,
  `nom_etudiant` varchar(100) NOT NULL,
  `prenom_etudiant` varchar(100) NOT NULL,
  `date_naissance` date DEFAULT NULL,
  `lieu_naissance` varchar(150) DEFAULT NULL,
  `sexe` enum('M','F') NOT NULL,
  `cin` varchar(20) DEFAULT NULL,
  `tel_etudiant` varchar(20) DEFAULT NULL,
  `email_etudiant` varchar(150) NOT NULL,
  `mot_de_pass_etudiant` varchar(255) NOT NULL,
  `id_parcours` int(11) NOT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT 1,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `ETUDIANT`
--

INSERT INTO `ETUDIANT` (`numero_etudiant`, `nom_etudiant`, `prenom_etudiant`, `date_naissance`, `lieu_naissance`, `sexe`, `cin`, `tel_etudiant`, `email_etudiant`, `mot_de_pass_etudiant`, `id_parcours`, `actif`, `date_creation`) VALUES
(1, 'Randria', 'Sofia', '2003-05-14', NULL, 'F', NULL, NULL, 'sofia.randria@universite.mg', '$2b$10$Yqc/bnZ6Irs2FZIALg9rUOWZnqeDtjQkU4ZIiUGAbxlivXVHfSdE.', 3, 1, '2026-09-14 09:42:22'),
(2, 'b', '1', '2002-05-23', 'mandritsara', 'M', '1357344678441', '0325230418', 'b@gmail.com', '$2b$10$szq7hJPF9ZUScyI16sHLueJaaVcSGXb6qheUqAz./znrlgrvRaHX2', 2, 1, '2026-09-14 09:48:46'),
(6, 'q', '1', '2002-02-12', NULL, 'M', '200988399', '103839922', 'qq@gmail.com', '$2b$10$/E5RkZjmdLvQfVAAvJUgHOFnzbi9Hm.ouSSxqDV/uis15B55IrD1W', 10, 1, '2026-09-14 20:47:09'),
(14, 'a', 'a1', '4444-03-12', 'etdv', 'F', '43467w46', '4642567456', 'a@gmail.com', '$2b$10$vwojpKZjQtLWuF/N8/r9aeG8.0.OZiaVPxwygGdy2xHnpIVrUjKlq', 1, 1, '2026-10-18 16:08:24'),
(15, 'Murielle', 'Paradie', '2026-10-18', 'Mandritsara', 'F', '410022012577', '0327245263', 'paradiemirarandrianazily@gmail.com', '$2b$10$qBh/2VgkUANxST4kiJU3jOQ90WqktWpzwTKZm.KWPnHnwWk5WDWNm', 5, 1, '2026-10-18 16:50:29'),
(16, 'RASOAMIERINA', 'Olienina', '2026-10-15', 'Mandritsara majunga', 'F', '410232007204', '0329564861', 'rasoamierinaolienina@gmail.com', '$2b$10$OlBw9UG1kzNzeDDifMN9cepgSQ4py/eaS/okEDw46DPq9XqWZYp1q', 4, 1, '2026-10-18 18:21:57'),
(17, 'Tovo', 'Velomanana', '2006-10-21', 'Tsaralalana', 'M', '41502365435', '0384523194', 'tovovelomanana@gmail.com', '$2b$10$VAkWqJwL3n3AzvAHamifKeIbNaNH.pxxfz2WUGdFRY4Mnpmj2vUaa', 10, 1, '2026-10-23 12:01:38'),
(18, 'LOVANANDRIANINA', 'Heritsiraka Ianja', '2003-03-23', 'Mandritsara', 'F', '415930940494', '0321654117', 'heritsiraka@gmail.com', '$2b$10$h9Mvbd6yJBjRHhl4Vz69d.MzhM0FjowtZN3VlO67tEWYSGP/WOjdK', 6, 1, '2026-10-27 00:08:52');

-- --------------------------------------------------------

--
-- Structure de la table `EVALUER`
--

CREATE TABLE `EVALUER` (
  `id_note` int(11) NOT NULL,
  `numero_etudiant` int(11) NOT NULL,
  `id_EC` int(11) NOT NULL,
  `annee_universitaire` varchar(20) NOT NULL,
  `id_evaluation` int(11) NOT NULL,
  `note` decimal(4,2) NOT NULL CHECK (`note` >= 0 and `note` <= 20),
  `date_evaluation` date NOT NULL,
  `type_evaluation` enum('Session Normale','Rattrapage') NOT NULL,
  `id_enseignant_saisie` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `EVALUER`
--

INSERT INTO `EVALUER` (`id_note`, `numero_etudiant`, `id_EC`, `annee_universitaire`, `id_evaluation`, `note`, `date_evaluation`, `type_evaluation`, `id_enseignant_saisie`) VALUES
(1, 1, 20, '2024-2025', 1, 11.00, '2024-12-10', 'Session Normale', 1),
(2, 1, 21, '2024-2025', 1, 12.00, '2024-12-10', 'Session Normale', 1),
(3, 1, 71, '2024-2025', 1, 15.00, '2024-12-10', 'Session Normale', 1),
(4, 1, 72, '2024-2025', 1, 14.00, '2024-12-10', 'Session Normale', 1),
(5, 1, 73, '2024-2025', 1, 13.00, '2024-12-10', 'Session Normale', 1),
(6, 1, 74, '2024-2025', 1, 12.50, '2024-12-10', 'Session Normale', 1),
(7, 1, 82, '2024-2025', 1, 14.00, '2024-12-10', 'Session Normale', 1),
(8, 1, 84, '2024-2025', 1, 13.00, '2024-12-10', 'Session Normale', 1),
(9, 1, 122, '2024-2025', 1, 13.50, '2024-12-10', 'Session Normale', 1),
(10, 1, 123, '2024-2025', 1, 12.00, '2024-12-10', 'Session Normale', 1),
(16, 1, 12, '2024-2025', 1, 13.00, '2025-05-15', 'Session Normale', 1),
(17, 1, 13, '2024-2025', 1, 12.50, '2025-05-15', 'Session Normale', 1),
(18, 1, 14, '2024-2025', 1, 13.50, '2025-05-15', 'Session Normale', 1),
(19, 1, 45, '2024-2025', 1, 5.50, '2025-05-15', 'Session Normale', 1),
(20, 1, 46, '2024-2025', 1, 5.00, '2025-05-15', 'Session Normale', 1),
(21, 1, 47, '2024-2025', 1, 6.00, '2025-05-15', 'Session Normale', 1),
(22, 1, 124, '2024-2025', 1, 6.00, '2025-05-15', 'Session Normale', 1),
(23, 1, 125, '2024-2025', 1, 6.50, '2025-05-15', 'Session Normale', 1),
(31, 1, 45, '2024-2025', 2, 9.00, '2025-07-05', 'Rattrapage', 1),
(32, 1, 46, '2024-2025', 2, 9.50, '2025-07-05', 'Rattrapage', 1),
(33, 1, 47, '2024-2025', 2, 8.50, '2025-07-05', 'Rattrapage', 1),
(34, 1, 124, '2024-2025', 2, 6.00, '2025-07-05', 'Rattrapage', 1),
(35, 1, 125, '2024-2025', 2, 5.50, '2025-07-05', 'Rattrapage', 1),
(38, 1, 124, '2025-2026', 1, 12.00, '2025-11-20', 'Rattrapage', 1),
(39, 2, 20, '2026-2027', 1, 14.00, '2026-09-12', 'Session Normale', 2),
(44, 2, 21, '2026-2027', 2, 16.00, '2026-09-14', 'Session Normale', 2),
(46, 6, 207, '2026-2027', 1, 14.00, '2026-09-15', 'Session Normale', 4),
(47, 2, 82, '2026-2027', 1, 10.00, '2026-09-15', 'Session Normale', 2),
(48, 2, 83, '2026-2027', 1, 11.00, '2026-09-15', 'Session Normale', 2),
(49, 2, 77, '2026-2027', 1, 10.00, '2026-09-15', 'Session Normale', 2),
(50, 2, 76, '2026-2027', 1, 12.00, '2026-09-15', 'Session Normale', 2),
(51, 2, 75, '2026-2027', 1, 10.00, '2026-09-15', 'Session Normale', 2),
(52, 2, 84, '2026-2027', 1, 12.00, '2026-09-15', 'Session Normale', 2),
(54, 2, 89, '2026-2027', 1, 18.00, '2026-09-15', 'Session Normale', 2),
(55, 2, 71, '2026-2027', 1, 10.25, '2026-09-15', 'Session Normale', 2),
(56, 2, 78, '2026-2027', 1, 15.25, '2026-09-15', 'Session Normale', 2),
(57, 2, 74, '2026-2027', 1, 12.75, '2026-09-15', 'Session Normale', 2),
(58, 2, 72, '2026-2027', 1, 10.00, '2026-09-15', 'Session Normale', 2),
(59, 2, 73, '2026-2027', 1, 10.00, '2026-09-15', 'Session Normale', 2),
(60, 2, 85, '2026-2027', 1, 10.00, '2026-09-15', 'Session Normale', 2),
(61, 2, 123, '2026-2027', 1, 10.00, '2026-09-15', 'Session Normale', 2),
(62, 2, 122, '2026-2027', 1, 10.00, '2026-09-15', 'Session Normale', 2),
(63, 2, 12, '2026-2027', 1, 10.00, '2026-09-15', 'Session Normale', 2),
(65, 2, 163, '2026-2027', 1, 13.00, '2026-09-15', 'Session Normale', 2),
(66, 2, 124, '2026-2027', 1, 12.00, '2026-09-15', 'Session Normale', 2),
(68, 2, 97, '2026-2027', 1, 11.00, '2026-09-15', 'Session Normale', 2),
(70, 2, 13, '2026-2027', 1, 10.00, '2026-09-15', 'Session Normale', 2),
(71, 2, 45, '2026-2027', 1, 15.00, '2026-09-15', 'Session Normale', 2),
(72, 2, 98, '2026-2027', 1, 11.00, '2026-09-15', 'Session Normale', 2),
(73, 2, 162, '2026-2027', 1, 9.00, '2026-09-15', 'Session Normale', 2),
(74, 2, 209, '2026-2027', 1, 12.00, '2026-09-15', 'Session Normale', 2),
(75, 2, 210, '2026-2027', 1, 13.00, '2026-09-15', 'Session Normale', 2),
(76, 2, 47, '2026-2027', 1, 11.50, '2026-09-15', 'Session Normale', 2),
(77, 2, 161, '2026-2027', 1, 12.25, '2026-09-15', 'Session Normale', 2),
(84, 2, 90, '2026-2027', 1, 10.00, '2026-09-19', 'Session Normale', 2),
(87, 2, 46, '2026-2027', 1, 10.00, '2026-09-30', 'Session Normale', 2),
(88, 2, 125, '2026-2027', 1, 12.00, '2026-09-30', 'Session Normale', 2),
(89, 2, 14, '2026-2027', 1, 5.00, '2026-09-30', 'Session Normale', 2),
(90, 6, 44, '2026-2027', 1, 12.00, '2026-10-12', 'Session Normale', 4),
(92, 6, 43, '2026-2027', 1, 13.00, '2026-10-12', 'Session Normale', 4),
(93, 6, 121, '2026-2027', 1, 12.00, '2026-10-12', 'Session Normale', 4),
(94, 6, 206, '2026-2027', 1, 12.00, '2026-10-12', 'Session Normale', 4),
(95, 6, 120, '2026-2027', 1, 14.00, '2026-10-12', 'Session Normale', 4),
(96, 6, 208, '2026-2027', 1, 11.00, '2026-10-12', 'Session Normale', 4),
(97, 6, 119, '2026-2027', 1, 12.00, '2026-10-12', 'Session Normale', 4),
(98, 6, 139, '2026-2027', 1, 11.00, '2026-10-12', 'Session Normale', 4),
(99, 6, 138, '2026-2027', 1, 13.00, '2026-10-12', 'Session Normale', 4),
(100, 6, 137, '2026-2027', 1, 14.00, '2026-10-12', 'Session Normale', 4),
(101, 2, 14, '2026-2027', 2, 10.00, '2026-10-15', 'Rattrapage', 2),
(102, 1, 83, '2024-2025', 1, 11.00, '2026-10-15', 'Session Normale', 2),
(103, 1, 77, '2024-2025', 1, 15.00, '2026-10-15', 'Session Normale', 2),
(104, 1, 76, '2024-2025', 1, 10.00, '2026-10-15', 'Session Normale', 2),
(105, 1, 75, '2024-2025', 1, 10.00, '2026-10-15', 'Session Normale', 2),
(106, 1, 90, '2024-2025', 1, 13.00, '2026-10-15', 'Session Normale', 2),
(107, 1, 89, '2024-2025', 1, 10.00, '2026-10-15', 'Session Normale', 2),
(108, 1, 78, '2024-2025', 1, 13.00, '2026-10-15', 'Session Normale', 2),
(109, 1, 85, '2024-2025', 1, 12.00, '2026-10-15', 'Session Normale', 2),
(110, 1, 163, '2024-2025', 1, 10.00, '2026-10-15', 'Session Normale', 2),
(111, 1, 97, '2024-2025', 1, 20.00, '2026-10-15', 'Session Normale', 2),
(112, 1, 14, '2024-2025', 2, 18.50, '2026-10-15', 'Rattrapage', 2),
(113, 1, 13, '2024-2025', 2, 18.50, '2026-10-15', 'Rattrapage', 2),
(114, 1, 98, '2024-2025', 1, 19.00, '2026-10-15', 'Session Normale', 2),
(115, 1, 162, '2024-2025', 1, 19.00, '2026-10-15', 'Session Normale', 2),
(116, 1, 209, '2024-2025', 1, 16.00, '2026-10-15', 'Session Normale', 2),
(117, 1, 210, '2024-2025', 1, 15.00, '2026-10-15', 'Session Normale', 2),
(118, 1, 161, '2024-2025', 1, 17.00, '2026-10-15', 'Session Normale', 2),
(119, 15, 202, '2026-2027', 1, 12.00, '2026-10-18', 'Session Normale', 13),
(120, 15, 203, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 13),
(121, 15, 22, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 13),
(122, 15, 204, '2026-2027', 1, 12.00, '2026-10-18', 'Session Normale', 13),
(123, 15, 201, '2026-2027', 1, 13.00, '2026-10-18', 'Session Normale', 13),
(124, 15, 79, '2026-2027', 1, 5.00, '2026-10-18', 'Session Normale', 13),
(125, 15, 80, '2026-2027', 1, 5.00, '2026-10-18', 'Session Normale', 13),
(126, 15, 81, '2026-2027', 1, 3.00, '2026-10-18', 'Session Normale', 13),
(127, 15, 24, '2026-2027', 1, 15.00, '2026-10-18', 'Session Normale', 13),
(128, 15, 158, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 13),
(129, 15, 160, '2026-2027', 1, 13.00, '2026-10-18', 'Session Normale', 13),
(130, 15, 23, '2026-2027', 1, 12.00, '2026-10-18', 'Session Normale', 13),
(131, 15, 159, '2026-2027', 1, 3.00, '2026-10-18', 'Session Normale', 13),
(132, 15, 224, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 13),
(133, 15, 223, '2026-2027', 1, 18.00, '2026-10-18', 'Session Normale', 13),
(134, 15, 9, '2026-2027', 1, 12.00, '2026-10-18', 'Session Normale', 13),
(135, 15, 26, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 13),
(136, 15, 7, '2026-2027', 1, 11.00, '2026-10-18', 'Session Normale', 13),
(137, 15, 2, '2026-2027', 1, 13.00, '2026-10-18', 'Session Normale', 13),
(138, 15, 225, '2026-2027', 1, 11.00, '2026-10-18', 'Session Normale', 13),
(139, 15, 1, '2026-2027', 1, 11.00, '2026-10-18', 'Session Normale', 13),
(140, 15, 25, '2026-2027', 1, 15.00, '2026-10-18', 'Session Normale', 13),
(141, 15, 180, '2026-2027', 1, 9.00, '2026-10-18', 'Session Normale', 13),
(142, 15, 226, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 13),
(143, 15, 179, '2026-2027', 1, 14.00, '2026-10-18', 'Session Normale', 13),
(144, 15, 3, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 13),
(145, 15, 27, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 13),
(146, 15, 8, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 13),
(147, 16, 202, '2026-2027', 1, 12.00, '2026-10-18', 'Session Normale', 13),
(148, 16, 203, '2026-2027', 1, 18.00, '2026-10-18', 'Session Normale', 13),
(149, 16, 22, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 13),
(150, 16, 204, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 13),
(151, 16, 201, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 13),
(152, 16, 79, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 13),
(153, 16, 80, '2026-2027', 1, 12.00, '2026-10-18', 'Session Normale', 13),
(154, 16, 81, '2026-2027', 1, 14.00, '2026-10-18', 'Session Normale', 13),
(155, 16, 24, '2026-2027', 1, 15.00, '2026-10-18', 'Session Normale', 13),
(156, 16, 158, '2026-2027', 1, 15.00, '2026-10-18', 'Session Normale', 13),
(157, 16, 160, '2026-2027', 1, 16.00, '2026-10-18', 'Session Normale', 13),
(158, 16, 23, '2026-2027', 1, 14.00, '2026-10-18', 'Session Normale', 13),
(159, 16, 159, '2026-2027', 1, 17.00, '2026-10-18', 'Session Normale', 13),
(160, 16, 224, '2026-2027', 1, 16.00, '2026-10-18', 'Session Normale', 13),
(161, 16, 223, '2026-2027', 1, 16.00, '2026-10-18', 'Session Normale', 13),
(162, 16, 215, '2026-2027', 1, 12.00, '2026-10-18', 'Session Normale', 15),
(163, 16, 176, '2026-2027', 1, 20.00, '2026-10-18', 'Session Normale', 15),
(164, 16, 174, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 15),
(165, 16, 175, '2026-2027', 1, 10.00, '2026-10-18', 'Session Normale', 15),
(166, 16, 42, '2026-2027', 1, 15.00, '2026-10-18', 'Session Normale', 15),
(167, 16, 41, '2026-2027', 1, 12.00, '2026-10-18', 'Session Normale', 15),
(168, 16, 38, '2026-2027', 1, 14.00, '2026-10-18', 'Session Normale', 15),
(169, 16, 214, '2026-2027', 1, 12.00, '2026-10-18', 'Session Normale', 15),
(170, 16, 213, '2026-2027', 1, 15.00, '2026-10-18', 'Session Normale', 15),
(171, 16, 39, '2026-2027', 1, 15.00, '2026-10-18', 'Session Normale', 15),
(172, 16, 40, '2026-2027', 1, 15.00, '2026-10-18', 'Session Normale', 15),
(173, 16, 19, '2026-2027', 1, 16.00, '2026-10-18', 'Session Normale', 15),
(174, 16, 18, '2026-2027', 1, 15.00, '2026-10-18', 'Session Normale', 15),
(175, 16, 173, '2026-2027', 1, 12.00, '2026-10-18', 'Session Normale', 15),
(176, 6, 222, '2026-2027', 1, 10.00, '2026-10-25', 'Session Normale', 16),
(177, 6, 66, '2026-2027', 1, 12.00, '2026-10-25', 'Session Normale', 16),
(178, 6, 65, '2026-2027', 1, 10.00, '2026-10-25', 'Session Normale', 16),
(179, 6, 156, '2026-2027', 1, 12.00, '2026-10-25', 'Session Normale', 16),
(180, 6, 221, '2026-2027', 1, 11.00, '2026-10-25', 'Session Normale', 16),
(181, 6, 64, '2026-2027', 1, 11.00, '2026-10-25', 'Session Normale', 16),
(182, 6, 67, '2026-2027', 1, 12.00, '2026-10-25', 'Session Normale', 16),
(183, 6, 87, '2026-2027', 1, 13.00, '2026-10-25', 'Session Normale', 16),
(184, 6, 155, '2026-2027', 1, 15.00, '2026-10-25', 'Session Normale', 16),
(185, 6, 86, '2026-2027', 1, 10.00, '2026-10-25', 'Session Normale', 16),
(186, 6, 88, '2026-2027', 1, 12.00, '2026-10-25', 'Session Normale', 16),
(187, 6, 157, '2026-2027', 1, 9.00, '2026-10-25', 'Session Normale', 16),
(188, 15, 79, '2026-2027', 2, 12.00, '2026-10-25', 'Rattrapage', 17),
(189, 15, 80, '2026-2027', 2, 15.00, '2026-10-25', 'Rattrapage', 17),
(190, 15, 81, '2026-2027', 2, 11.00, '2026-10-25', 'Rattrapage', 17),
(191, 15, 159, '2026-2027', 2, 10.00, '2026-10-25', 'Rattrapage', 17),
(192, 17, 207, '2025-2026', 1, 18.00, '2026-10-26', 'Session Normale', 16),
(193, 17, 44, '2025-2026', 1, 10.00, '2026-10-26', 'Session Normale', 16),
(194, 17, 43, '2025-2026', 1, 12.00, '2026-10-26', 'Session Normale', 16),
(195, 17, 121, '2025-2026', 1, 13.00, '2026-10-26', 'Session Normale', 16),
(196, 17, 206, '2025-2026', 1, 15.00, '2026-10-26', 'Session Normale', 16),
(197, 17, 120, '2025-2026', 1, 12.00, '2026-10-26', 'Session Normale', 16),
(198, 17, 208, '2025-2026', 1, 12.00, '2026-10-26', 'Session Normale', 16),
(199, 17, 119, '2025-2026', 1, 12.00, '2026-10-26', 'Session Normale', 16),
(200, 17, 157, '2025-2026', 1, 12.00, '2026-10-26', 'Session Normale', 16),
(201, 17, 88, '2025-2026', 1, 12.00, '2026-10-26', 'Session Normale', 16),
(202, 17, 139, '2025-2026', 1, 11.00, '2026-10-26', 'Session Normale', 16),
(203, 17, 86, '2025-2026', 1, 12.00, '2026-10-26', 'Session Normale', 16),
(204, 17, 155, '2025-2026', 1, 10.00, '2026-10-26', 'Session Normale', 16),
(205, 17, 87, '2025-2026', 1, 10.00, '2026-10-26', 'Session Normale', 16),
(206, 17, 67, '2025-2026', 1, 12.00, '2026-10-26', 'Session Normale', 16),
(207, 17, 138, '2025-2026', 1, 12.00, '2026-10-26', 'Session Normale', 16),
(208, 17, 64, '2025-2026', 1, 12.00, '2026-10-26', 'Session Normale', 16),
(209, 17, 221, '2025-2026', 1, 12.00, '2026-10-26', 'Session Normale', 16),
(210, 17, 137, '2025-2026', 1, 12.00, '2026-10-26', 'Session Normale', 16),
(211, 17, 65, '2025-2026', 1, 12.00, '2026-10-26', 'Session Normale', 16),
(212, 17, 66, '2025-2026', 1, 12.00, '2026-10-26', 'Session Normale', 16),
(213, 17, 222, '2025-2026', 1, 16.00, '2026-10-26', 'Session Normale', 16);

-- --------------------------------------------------------

--
-- Structure de la table `HISTORIQUE_RESULTAT`
--

CREATE TABLE `HISTORIQUE_RESULTAT` (
  `id_historique` int(11) NOT NULL,
  `numero_etudiant` int(11) NOT NULL,
  `semestre` varchar(20) NOT NULL,
  `annee_universitaire` varchar(20) NOT NULL,
  `session_examen` enum('Normale','Rattrapage') NOT NULL DEFAULT 'Normale',
  `moyenne_generale` decimal(5,2) NOT NULL,
  `resultat_semestre` enum('Validé','Validé par compensation','Non validé') NOT NULL,
  `date_figee` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `INSCRIPTION`
--

CREATE TABLE `INSCRIPTION` (
  `id_inscription` int(11) NOT NULL,
  `numero_etudiant` int(11) NOT NULL,
  `id_parcours` int(11) NOT NULL,
  `annee_universitaire` varchar(20) NOT NULL,
  `statut` enum('En cours','Admis','Admis avec dette','Redouble') NOT NULL DEFAULT 'En cours',
  `date_inscription` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `INSCRIPTION`
--

INSERT INTO `INSCRIPTION` (`id_inscription`, `numero_etudiant`, `id_parcours`, `annee_universitaire`, `statut`, `date_inscription`) VALUES
(1, 1, 1, '2024-2025', 'Admis avec dette', '2026-09-14 09:42:22'),
(2, 1, 3, '2025-2026', 'En cours', '2026-09-14 09:42:22'),
(3, 2, 1, '2026-2027', 'Admis', '2026-09-14 09:48:46'),
(4, 6, 10, '2026-2027', 'Admis', '2026-09-14 20:47:09'),
(16, 14, 1, '2026-2027', 'En cours', '2026-10-18 16:08:24'),
(17, 15, 3, '2026-2027', 'Admis avec dette', '2026-10-18 16:50:29'),
(18, 15, 5, '2027-2028', 'En cours', '2026-10-18 18:17:14'),
(19, 16, 2, '2026-2027', 'Admis', '2026-10-18 18:21:57'),
(20, 16, 4, '2027-2028', 'En cours', '2026-10-18 18:50:21'),
(21, 17, 10, '2025-2026', 'Admis', '2026-10-23 12:01:38'),
(22, 2, 2, '2027-2028', 'En cours', '2026-10-23 22:15:00'),
(23, 18, 6, '2026-2027', 'En cours', '2026-10-27 00:08:52');

-- --------------------------------------------------------

--
-- Structure de la table `PARCOURS`
--

CREATE TABLE `PARCOURS` (
  `id_parcours` int(11) NOT NULL,
  `nom_parcours` varchar(150) NOT NULL,
  `niveau` enum('L1','L2','L3','M1','M2') NOT NULL,
  `mention` varchar(150) NOT NULL,
  `id_directeur` int(11) DEFAULT NULL,
  `id_responsable_mention` int(11) DEFAULT NULL,
  `id_parcours_suivant_defaut` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `PARCOURS`
--

INSERT INTO `PARCOURS` (`id_parcours`, `nom_parcours`, `niveau`, `mention`, `id_directeur`, `id_responsable_mention`, `id_parcours_suivant_defaut`) VALUES
(1, 'Tronc Commun', 'L1', 'EADIMI', 17, 16, NULL),
(2, 'PEG-Mathématiques', 'L2', 'EADIMI', 17, 16, NULL),
(3, 'PEG-Informatique', 'L2', 'EADIMI', 17, 16, NULL),
(4, 'PEG-Mathématiques', 'L3', 'EADIMI', 17, 16, NULL),
(5, 'PEG-Informatique', 'L3', 'EADIMI', 17, 16, NULL),
(6, 'PEG-Mathématiques', 'M1', 'EADIMI', 17, 16, NULL),
(7, 'PEG-Informatique (MSI)', 'M1', 'EADIMI', 17, 16, NULL),
(8, 'PEG-Informatique (IAD)', 'M1', 'EADIMI', 17, 16, NULL),
(9, 'PEG-Mathématiques (MS)', 'M2', 'EADIMI', 17, 16, NULL),
(10, 'PEG-Mathématiques (MD)', 'M2', 'EADIMI', 17, 16, NULL),
(11, 'PEG-Informatique (MSI)', 'M2', 'EADIMI', 17, 16, NULL),
(12, 'PEG- Informatique (IAD)', 'M2', 'EADIMI', 17, 16, NULL),
(14, 'PEG-Électrique', 'L1', 'EADIE', 2, 1, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `UNITE_ENSEIGNEMENT`
--

CREATE TABLE `UNITE_ENSEIGNEMENT` (
  `id_UE` int(11) NOT NULL,
  `code_UE` varchar(30) DEFAULT NULL,
  `nom_UE` varchar(150) NOT NULL,
  `coefficient` decimal(5,2) NOT NULL,
  `niveau` enum('L1','L2','L3','M1','M2') NOT NULL,
  `semestre` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `UNITE_ENSEIGNEMENT`
--

INSERT INTO `UNITE_ENSEIGNEMENT` (`id_UE`, `code_UE`, `nom_UE`, `coefficient`, `niveau`, `semestre`) VALUES
(1, 'ADRINF04', 'ADMINISTRATION DE RESEAUX', 6.00, 'L2', 'S4'),
(2, 'AGIIAD09', 'AGENTS INTELLIGENTS', 6.00, 'M2', 'S9'),
(3, 'ALAINF04', 'BASE DE DONNEES ET ALGORITHMIQUE', 9.00, 'L2', 'S4'),
(4, 'ALAMTH08', 'ALGEBRE APPROFONDIE ET OPTIMISATION', 5.00, 'M1', 'S8'),
(5, 'ALGMTH02', 'Algèbre et Géométrie', 6.00, 'L1', 'S2'),
(6, 'ANAMTH08', 'ANALYSE ANALYTIQUE ET NUMERIQUE AVANCEE', 7.00, 'M1', 'S8'),
(7, 'ANCMTH04', 'APPLICATIONS DES NOMBRES COMPLEXES', 4.00, 'L2', 'S4'),
(8, 'ANMMTH01', 'Analyse mathématique', 5.00, 'L1', 'S1'),
(9, 'ARSINF03', 'ARCHITECTURE DES SYSTÈMES INFORMATIQUES', 7.00, 'L2', 'S3'),
(10, 'ASTAMTH04', 'ANALYSE ET STATISTIQUE', 6.00, 'L2', 'S4'),
(11, 'BDAINF07', 'BASE DE DONNEES AVANCEE', 7.00, 'M1', 'S7'),
(12, 'BDIIAD08', 'BASE DE DONNEES INTELLIGENTES', 4.00, 'M1', 'S8'),
(13, 'BDPINF05', 'PROGRAMMATION', 11.00, 'L3', 'S5'),
(14, 'CDAMTH04', 'COMPLEMENTS D\'ALGEBRE', 6.00, 'L2', 'S4'),
(15, 'CDGMTH04', 'COMPLEMENTS DE GEOMETRIE', 4.00, 'L2', 'S4'),
(16, 'CLEG10', 'COMPLEMENT DE LEGISLATIONS', 2.67, 'M2', 'S10'),
(17, 'CST02', 'Calcul numérique et Statistique', 6.00, 'L1', 'S2'),
(18, 'DISMTH07', 'MATHEMATIQUES DISCRETES ET ANALYSE DE DONNEES', 10.00, 'M1', 'S7'),
(19, 'DIVERS-M1-16', '????????', 1.00, 'M1', 'S7'),
(20, 'DIVERS-M1-17', '????????', 1.00, 'M1', 'S7'),
(21, 'DIVERS-M1-18', '????????', 1.00, 'M1', 'S7'),
(22, 'DIVERS-M2-113', '?????', 3.00, 'M2', 'S9'),
(23, 'DIVERS-M2-114', '?????', 2.00, 'M2', 'S9'),
(24, 'DIVERS-M2-115', '?????', 1.00, 'M2', 'S9'),
(25, 'DIVERS-M2-116', '?????', 1.00, 'M2', 'S9'),
(26, 'DIVERS-M2-51', '??????????', 3.00, 'M2', 'S9'),
(27, 'DIVERS-M2-52', '??????????', 2.00, 'M2', 'S9'),
(28, 'DIVERS-M2-53', '??????????', 1.00, 'M2', 'S9'),
(29, 'DIVERS-M2-54', '??????????', 1.00, 'M2', 'S9'),
(30, 'DIVERS-M2-55', '????', 1.00, 'M2', 'S9'),
(31, 'DIVERS-M2-91', '?????', 3.00, 'M2', 'S9'),
(32, 'DIVERS-M2-92', '?????', 2.00, 'M2', 'S9'),
(33, 'DIVERS-M2-93', '?????', 1.00, 'M2', 'S9'),
(34, 'DIVERS-M2-94', '?????', 1.00, 'M2', 'S9'),
(35, 'DLEG06', 'LEGISLATION DE BASE', 8.00, 'L3', 'S6'),
(36, 'DOAINF01', 'Démarches scientifiques et Outils d\'apprentissage', 5.00, 'L1', 'S1'),
(37, 'DSCDES01', 'Dessins et Schéma', 8.00, 'L1', 'S1'),
(38, 'EAVMTH03', 'ALGEBRE LINEAIRE', 7.00, 'L2', 'S3'),
(39, 'ECTRED01', 'Ecole et transmission', 4.00, 'L1', 'S1'),
(40, 'EDAMMD09', 'EQUATIONS AUX DERIVEES PARTIELLES', 7.00, 'M2', 'S9'),
(41, 'EDEMTH01', 'Equations Différentielles ordinaires et espace vectoriel', 5.00, 'L1', 'S1'),
(42, 'EDIMTH07', 'MODELISATIONS MATHEMATIQUES', 6.00, 'M1', 'S7'),
(43, 'EDPINF07', 'FIABILITE ET MODELISATION NUMERIQUE', 6.00, 'M1', 'S7'),
(44, 'ELMELC02', 'Electrostatique et Magnétostatique', 4.00, 'L1', 'S2'),
(45, 'FDMMMS09', 'FOUILLE DE DONNEES MASSIVES', 6.00, 'M2', 'S9'),
(46, 'GDEINF07', 'GESTION D\'ENTREPRISE', 5.00, 'M1', 'S7'),
(47, 'GDSMSI09', 'GESTION ET DROIT DE L\'INFORMATIQUE', 7.00, 'M2', 'S9'),
(48, 'GEOMTH08', 'GEOMETRIE APPROFONDIE', 6.00, 'M1', 'S8'),
(49, 'IARIAD08', 'INTELLIGENCE ARTIFICIELLE', 7.00, 'M1', 'S8'),
(50, 'IHMIAD09', 'INTERACTION ET COOPERATION HOMMES-MACHINES', 7.00, 'M2', 'S9'),
(51, 'IMAMSI09', 'INFORMATIQUE MANAGERIALE', 6.00, 'M2', 'S9'),
(52, 'INTINF09', 'EDUCATION ET INTERNET', 5.00, 'M2', 'S9'),
(53, 'IPRO10', 'INSERTION PROFESSIONNELLE', 17.33, 'M2', 'S10'),
(54, 'LAELNG01', 'Langues étrangères', 3.00, 'L1', 'S1'),
(55, 'MCPMEC02', 'Mécanique du point', 4.00, 'L1', 'S2'),
(56, 'MDIMTH07', 'MATHEMATIQUES DISCRETES ET ANALYSE DE DONNEES', 9.00, 'M1', 'S7'),
(57, 'MGLINF05', 'METHODES ET OUTILS DE GENIE LOGICIEL', 7.00, 'L3', 'S5'),
(58, 'MNMDI05', 'METHODES NUMERIQUES ET MATHS DISCRETES', 8.00, 'L3', 'S5'),
(59, 'MRCMMS09', 'METHODOLOGIE DE RECHERCHES', 5.00, 'M2', 'S9'),
(60, 'MRCMSI09', 'METHODOLOGIE DE RECHERCHES', 5.00, 'M2', 'S9'),
(61, 'MROINF05', 'METHODES NUMERIQUES ET MATHS DISCRETES', 7.00, 'L3', 'S5'),
(62, 'MSAMMS09', 'MODELISATIONS STOCHASTIQUES AVANCEES', 5.00, 'M2', 'S9'),
(63, 'MSAMTH07', 'SCIENCES DU CALCUL', 5.00, 'M1', 'S7'),
(64, 'MSOMTH08', 'MODELISATION STATISTIQUE', 7.00, 'M1', 'S8'),
(65, 'OPTMMD09', 'ALGORITHMIQUE DES GRAPHES ET OPTIMISATIONS', 7.00, 'M2', 'S9'),
(66, 'PCAMTH03', 'PROBABILITES ET COMPLEMENTS D\'ANALYSE', 8.00, 'L2', 'S3'),
(67, 'PCHPHY02', 'Physique et Chimie', 6.00, 'L1', 'S2'),
(68, 'PDENS05', 'PRATIQUE DE L\'ENSEIGNEMENT', 5.00, 'L3', 'S5'),
(69, 'PENEDU05', 'PRATIQUE DE L\'ENSEIGNEMENT', 5.00, 'L3', 'S5'),
(70, 'PRAINF08', 'PROGRAMMATION AVANCEE', 7.00, 'M1', 'S8'),
(71, 'PRGINF04', 'ALGORITHMIQUE ET PROGRAMMATION', 8.00, 'L2', 'S4'),
(72, 'PROINF08', 'PROJET', 5.00, 'M1', 'S8'),
(73, 'PROMTH08', 'PROJET', 5.00, 'M1', 'S8'),
(74, 'PRSINF04', 'PROGRAMMATION STRUCTUREE', 6.00, 'L2', 'S4'),
(75, 'RADEDU07', 'Repères techniques et sociaux', 3.00, 'M1', 'S7'),
(76, 'SADINF08', 'SYSTEMES D\'AIDE A LA DECISION', 3.00, 'M1', 'S8'),
(77, 'SDAMMS09', 'SCIENCES DE DONNEES AVANCEES', 7.00, 'M2', 'S9'),
(78, 'SDDMTH07', 'SCIENCES DE DONNEES', 6.00, 'M1', 'S7'),
(79, 'SDDTM05', 'SCIENCE DES DONNEES ET THEORIE DE MESURES', 9.00, 'L3', 'S5'),
(80, 'SDIMSI08', 'SYSTÈME D\'INFORMATION', 8.00, 'M1', 'S8'),
(81, 'SDRMSI08', 'SECURITE DES RESEAUX', 7.00, 'M1', 'S8'),
(82, 'SIEEDU03', 'SITUATIONS EDUCATIVES', 4.00, 'L2', 'S3'),
(83, 'SMEM06', 'STAGE ET MÉMOIRE', 6.00, 'L3', 'S6'),
(84, 'SMEM10', 'SEMINAIRES ET MÉMOIRE', 10.00, 'M2', 'S10'),
(85, 'SPLPHY02', 'Statique plane', 4.00, 'L1', 'S2'),
(86, 'SPRO06', 'STAGE PROFESSIONNEL', 16.00, 'L3', 'S6'),
(87, 'STAMTH04', 'ANALYSE ET STATISTIQUE', 8.00, 'L2', 'S4'),
(88, 'TCDIFF05', 'ALGEBRE ET ANALYSE', 8.00, 'L3', 'S5'),
(89, 'TDRINF08', 'TECHNOLOGIES DE RESEAU', 8.00, 'M1', 'S8'),
(90, 'TEDMMD09', 'EQUATIONS DIFFERENTIELLES AVANCEES', 4.00, 'M2', 'S9'),
(91, 'TEXLNG03', 'TECHNIQUES D\'EXPRESSION DE LANGUES ETRANGERES', 4.00, 'L2', 'S3'),
(92, 'TSIINF04', 'TECHNOLOGIES ET SOCIETE DE L\'INFORMATION', 3.00, 'L2', 'S4'),
(93, 'GE012', 'GE-productive', 3.00, 'L1', 'S1');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `ADMINISTRATEUR`
--
ALTER TABLE `ADMINISTRATEUR`
  ADD PRIMARY KEY (`id_admin`),
  ADD UNIQUE KEY `email_admin` (`email_admin`);

--
-- Index pour la table `CONTENIR`
--
ALTER TABLE `CONTENIR`
  ADD PRIMARY KEY (`id_parcours`,`id_UE`),
  ADD KEY `id_UE` (`id_UE`);

--
-- Index pour la table `DEMANDE_REINITIALISATION`
--
ALTER TABLE `DEMANDE_REINITIALISATION`
  ADD PRIMARY KEY (`id_demande`),
  ADD KEY `idx_demande_reinit_token` (`token_hash`);

--
-- Index pour la table `DEMANDE_RESPONSABILITE`
--
ALTER TABLE `DEMANDE_RESPONSABILITE`
  ADD PRIMARY KEY (`id_enseignant`,`id_parcours`),
  ADD KEY `id_parcours` (`id_parcours`);

--
-- Index pour la table `DETTE`
--
ALTER TABLE `DETTE`
  ADD PRIMARY KEY (`id_dette`),
  ADD KEY `id_EC` (`id_EC`),
  ADD KEY `idx_dette_etudiant` (`numero_etudiant`,`statut`);

--
-- Index pour la table `ELEMENT_CONSTITUTIF`
--
ALTER TABLE `ELEMENT_CONSTITUTIF`
  ADD PRIMARY KEY (`id_EC`),
  ADD KEY `idx_ec_ue` (`id_UE`);

--
-- Index pour la table `ENSEIGNANT`
--
ALTER TABLE `ENSEIGNANT`
  ADD PRIMARY KEY (`id_enseignant`),
  ADD UNIQUE KEY `matricule_enseignant` (`matricule_enseignant`),
  ADD UNIQUE KEY `email_enseignant` (`email_enseignant`),
  ADD UNIQUE KEY `cin` (`cin`),
  ADD KEY `id_parcours` (`id_parcours`);

--
-- Index pour la table `ENSEIGNER`
--
ALTER TABLE `ENSEIGNER`
  ADD PRIMARY KEY (`id_EC`,`id_enseignant`),
  ADD KEY `id_enseignant` (`id_enseignant`);

--
-- Index pour la table `ETUDIANT`
--
ALTER TABLE `ETUDIANT`
  ADD PRIMARY KEY (`numero_etudiant`),
  ADD UNIQUE KEY `email_etudiant` (`email_etudiant`),
  ADD UNIQUE KEY `cin` (`cin`),
  ADD KEY `idx_etudiant_parcours` (`id_parcours`);

--
-- Index pour la table `EVALUER`
--
ALTER TABLE `EVALUER`
  ADD PRIMARY KEY (`id_note`),
  ADD UNIQUE KEY `uniq_note` (`numero_etudiant`,`id_EC`,`annee_universitaire`,`id_evaluation`),
  ADD KEY `id_enseignant_saisie` (`id_enseignant_saisie`),
  ADD KEY `idx_evaluer_etudiant_annee` (`numero_etudiant`,`annee_universitaire`),
  ADD KEY `idx_evaluer_ec` (`id_EC`);

--
-- Index pour la table `HISTORIQUE_RESULTAT`
--
ALTER TABLE `HISTORIQUE_RESULTAT`
  ADD PRIMARY KEY (`id_historique`),
  ADD KEY `numero_etudiant` (`numero_etudiant`);

--
-- Index pour la table `INSCRIPTION`
--
ALTER TABLE `INSCRIPTION`
  ADD PRIMARY KEY (`id_inscription`),
  ADD UNIQUE KEY `uniq_inscription` (`numero_etudiant`,`annee_universitaire`),
  ADD KEY `id_parcours` (`id_parcours`),
  ADD KEY `idx_inscription_etudiant` (`numero_etudiant`);

--
-- Index pour la table `PARCOURS`
--
ALTER TABLE `PARCOURS`
  ADD PRIMARY KEY (`id_parcours`),
  ADD KEY `fk_parcours_directeur` (`id_directeur`),
  ADD KEY `fk_parcours_suivant` (`id_parcours_suivant_defaut`),
  ADD KEY `fk_parcours_responsable_mention` (`id_responsable_mention`);

--
-- Index pour la table `UNITE_ENSEIGNEMENT`
--
ALTER TABLE `UNITE_ENSEIGNEMENT`
  ADD PRIMARY KEY (`id_UE`),
  ADD UNIQUE KEY `code_UE` (`code_UE`),
  ADD KEY `idx_ue_niveau_semestre` (`niveau`,`semestre`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `ADMINISTRATEUR`
--
ALTER TABLE `ADMINISTRATEUR`
  MODIFY `id_admin` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `DEMANDE_REINITIALISATION`
--
ALTER TABLE `DEMANDE_REINITIALISATION`
  MODIFY `id_demande` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT pour la table `DETTE`
--
ALTER TABLE `DETTE`
  MODIFY `id_dette` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT pour la table `ELEMENT_CONSTITUTIF`
--
ALTER TABLE `ELEMENT_CONSTITUTIF`
  MODIFY `id_EC` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=229;

--
-- AUTO_INCREMENT pour la table `ENSEIGNANT`
--
ALTER TABLE `ENSEIGNANT`
  MODIFY `id_enseignant` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT pour la table `ETUDIANT`
--
ALTER TABLE `ETUDIANT`
  MODIFY `numero_etudiant` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT pour la table `EVALUER`
--
ALTER TABLE `EVALUER`
  MODIFY `id_note` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=214;

--
-- AUTO_INCREMENT pour la table `HISTORIQUE_RESULTAT`
--
ALTER TABLE `HISTORIQUE_RESULTAT`
  MODIFY `id_historique` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `INSCRIPTION`
--
ALTER TABLE `INSCRIPTION`
  MODIFY `id_inscription` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT pour la table `PARCOURS`
--
ALTER TABLE `PARCOURS`
  MODIFY `id_parcours` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT pour la table `UNITE_ENSEIGNEMENT`
--
ALTER TABLE `UNITE_ENSEIGNEMENT`
  MODIFY `id_UE` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=94;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `CONTENIR`
--
ALTER TABLE `CONTENIR`
  ADD CONSTRAINT `contenir_ibfk_1` FOREIGN KEY (`id_parcours`) REFERENCES `PARCOURS` (`id_parcours`) ON DELETE CASCADE,
  ADD CONSTRAINT `contenir_ibfk_2` FOREIGN KEY (`id_UE`) REFERENCES `UNITE_ENSEIGNEMENT` (`id_UE`) ON DELETE CASCADE;

--
-- Contraintes pour la table `DEMANDE_RESPONSABILITE`
--
ALTER TABLE `DEMANDE_RESPONSABILITE`
  ADD CONSTRAINT `demande_responsabilite_ibfk_1` FOREIGN KEY (`id_enseignant`) REFERENCES `ENSEIGNANT` (`id_enseignant`) ON DELETE CASCADE,
  ADD CONSTRAINT `demande_responsabilite_ibfk_2` FOREIGN KEY (`id_parcours`) REFERENCES `PARCOURS` (`id_parcours`) ON DELETE CASCADE;

--
-- Contraintes pour la table `DETTE`
--
ALTER TABLE `DETTE`
  ADD CONSTRAINT `dette_ibfk_1` FOREIGN KEY (`numero_etudiant`) REFERENCES `ETUDIANT` (`numero_etudiant`) ON DELETE CASCADE,
  ADD CONSTRAINT `dette_ibfk_2` FOREIGN KEY (`id_EC`) REFERENCES `ELEMENT_CONSTITUTIF` (`id_EC`) ON DELETE CASCADE;

--
-- Contraintes pour la table `ELEMENT_CONSTITUTIF`
--
ALTER TABLE `ELEMENT_CONSTITUTIF`
  ADD CONSTRAINT `element_constitutif_ibfk_1` FOREIGN KEY (`id_UE`) REFERENCES `UNITE_ENSEIGNEMENT` (`id_UE`) ON DELETE CASCADE;

--
-- Contraintes pour la table `ENSEIGNANT`
--
ALTER TABLE `ENSEIGNANT`
  ADD CONSTRAINT `enseignant_ibfk_1` FOREIGN KEY (`id_parcours`) REFERENCES `PARCOURS` (`id_parcours`) ON DELETE SET NULL;

--
-- Contraintes pour la table `ENSEIGNER`
--
ALTER TABLE `ENSEIGNER`
  ADD CONSTRAINT `enseigner_ibfk_1` FOREIGN KEY (`id_EC`) REFERENCES `ELEMENT_CONSTITUTIF` (`id_EC`) ON DELETE CASCADE,
  ADD CONSTRAINT `enseigner_ibfk_2` FOREIGN KEY (`id_enseignant`) REFERENCES `ENSEIGNANT` (`id_enseignant`) ON DELETE CASCADE;

--
-- Contraintes pour la table `ETUDIANT`
--
ALTER TABLE `ETUDIANT`
  ADD CONSTRAINT `etudiant_ibfk_1` FOREIGN KEY (`id_parcours`) REFERENCES `PARCOURS` (`id_parcours`);

--
-- Contraintes pour la table `EVALUER`
--
ALTER TABLE `EVALUER`
  ADD CONSTRAINT `evaluer_ibfk_1` FOREIGN KEY (`numero_etudiant`) REFERENCES `ETUDIANT` (`numero_etudiant`) ON DELETE CASCADE,
  ADD CONSTRAINT `evaluer_ibfk_2` FOREIGN KEY (`id_EC`) REFERENCES `ELEMENT_CONSTITUTIF` (`id_EC`) ON DELETE CASCADE,
  ADD CONSTRAINT `evaluer_ibfk_3` FOREIGN KEY (`id_enseignant_saisie`) REFERENCES `ENSEIGNANT` (`id_enseignant`);

--
-- Contraintes pour la table `HISTORIQUE_RESULTAT`
--
ALTER TABLE `HISTORIQUE_RESULTAT`
  ADD CONSTRAINT `historique_resultat_ibfk_1` FOREIGN KEY (`numero_etudiant`) REFERENCES `ETUDIANT` (`numero_etudiant`) ON DELETE CASCADE;

--
-- Contraintes pour la table `INSCRIPTION`
--
ALTER TABLE `INSCRIPTION`
  ADD CONSTRAINT `inscription_ibfk_1` FOREIGN KEY (`numero_etudiant`) REFERENCES `ETUDIANT` (`numero_etudiant`) ON DELETE CASCADE,
  ADD CONSTRAINT `inscription_ibfk_2` FOREIGN KEY (`id_parcours`) REFERENCES `PARCOURS` (`id_parcours`);

--
-- Contraintes pour la table `PARCOURS`
--
ALTER TABLE `PARCOURS`
  ADD CONSTRAINT `fk_parcours_directeur` FOREIGN KEY (`id_directeur`) REFERENCES `ENSEIGNANT` (`id_enseignant`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_parcours_responsable_mention` FOREIGN KEY (`id_responsable_mention`) REFERENCES `ENSEIGNANT` (`id_enseignant`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_parcours_suivant` FOREIGN KEY (`id_parcours_suivant_defaut`) REFERENCES `PARCOURS` (`id_parcours`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
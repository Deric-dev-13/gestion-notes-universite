-- =====================================================================
-- Migration : réinitialisation de mot de passe automatique par email
-- -----------------------------------------------------------------
-- À exécuter UNE SEULE FOIS sur une base qui a déjà été créée avec
-- l'ancienne version de schema.sql (donc qui a déjà la table
-- DEMANDE_REINITIALISATION sans les colonnes de token).
--
-- Utilisation (phpMyAdmin, onglet SQL, ou en ligne de commande) :
--   mysql -u root -p gestion_notes < migration_token_reinitialisation.sql
-- =====================================================================

ALTER TABLE DEMANDE_REINITIALISATION
  MODIFY COLUMN statut ENUM('En attente', 'Traité', 'Rejeté', 'Expiré') NOT NULL DEFAULT 'En attente',
  ADD COLUMN token_hash CHAR(64) NULL AFTER mot_de_passe_souhaite,
  ADD COLUMN token_expire TIMESTAMP NULL AFTER token_hash;

CREATE INDEX idx_demande_reinit_token ON DEMANDE_REINITIALISATION(token_hash);

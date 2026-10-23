-- =====================================================================
-- Migration : une demande de responsabilité peut concerner PLUSIEURS
-- parcours (au lieu d'un seul avec l'ancienne colonne
-- id_parcours_responsabilite_demande).
-- À exécuter UNE SEULE FOIS sur une base déjà créée avec l'ancien schema.sql.
--   mysql -u root -p gestion_notes < migration_responsabilite_multiple.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS DEMANDE_RESPONSABILITE (
    id_enseignant INT NOT NULL,
    id_parcours INT NOT NULL,
    PRIMARY KEY (id_enseignant, id_parcours),
    FOREIGN KEY (id_enseignant) REFERENCES ENSEIGNANT(id_enseignant) ON DELETE CASCADE,
    FOREIGN KEY (id_parcours) REFERENCES PARCOURS(id_parcours) ON DELETE CASCADE
);

-- Reprend les demandes déjà en cours (un seul parcours chacune) dans la
-- nouvelle table, pour ne rien perdre.
INSERT IGNORE INTO DEMANDE_RESPONSABILITE (id_enseignant, id_parcours)
SELECT id_enseignant, id_parcours_responsabilite_demande
FROM ENSEIGNANT
WHERE id_parcours_responsabilite_demande IS NOT NULL;

-- Retire l'ancienne contrainte de clé étrangère puis la colonne. Le nom de
-- la contrainte varie selon le serveur, donc on le retrouve dynamiquement
-- via information_schema plutôt que de le deviner.
SET @nom_contrainte := (
  SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ENSEIGNANT'
    AND COLUMN_NAME = 'id_parcours_responsabilite_demande'
    AND REFERENCED_TABLE_NAME = 'PARCOURS'
  LIMIT 1
);
SET @sql_drop_fk := IF(@nom_contrainte IS NOT NULL,
  CONCAT('ALTER TABLE ENSEIGNANT DROP FOREIGN KEY `', @nom_contrainte, '`'),
  'SELECT 1'); -- rien à faire si la contrainte n'existe déjà plus
PREPARE stmt FROM @sql_drop_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE ENSEIGNANT DROP COLUMN id_parcours_responsabilite_demande;

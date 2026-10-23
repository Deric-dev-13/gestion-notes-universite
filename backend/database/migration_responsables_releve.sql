-- Run once against an existing gestion_notes database.
ALTER TABLE PARCOURS ADD COLUMN id_responsable_mention INT NULL AFTER id_directeur;
ALTER TABLE PARCOURS
  ADD CONSTRAINT fk_parcours_responsable_mention
  FOREIGN KEY (id_responsable_mention) REFERENCES ENSEIGNANT(id_enseignant) ON DELETE SET NULL;

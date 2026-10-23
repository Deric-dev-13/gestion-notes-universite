// =====================================================================
// models/index.js
// -----------------------------------------------------------------
// Couche "Modèle" : toutes les requêtes SQL + toute la logique de
// calcul des moyennes (deux sessions) et de gestion des dettes.
//
// CHANGEMENT IMPORTANT PAR RAPPORT A LA VERSION PRECEDENTE :
// Le catalogue UE/EC est maintenant indépendant de l'année
// universitaire (voir schema.sql). C'est la table EVALUER (les notes)
// qui porte l'année universitaire. Un étudiant progresse chaque année
// via une ligne dans INSCRIPTION (son niveau/parcours pour CETTE
// année-là), ce qui permet de retrouver tout son historique L1->M2.
// =====================================================================

const { pool } = require('../config/db');
const crypto = require('crypto');

// =====================================================================
// 1. AUTHENTIFICATION
// =====================================================================

async function trouverAdminParEmail(email) {
  const [rows] = await pool.query('SELECT * FROM ADMINISTRATEUR WHERE email_admin = ?', [email]);
  return rows[0] || null;
}

async function trouverEnseignantParEmail(email) {
  const [rows] = await pool.query('SELECT * FROM ENSEIGNANT WHERE email_enseignant = ?', [email]);
  return rows[0] || null;
}

async function trouverEtudiantParIdentifiant(identifiant) {
  const [rows] = await pool.query(
    'SELECT * FROM ETUDIANT WHERE email_etudiant = ? OR numero_etudiant = ?',
    [identifiant, isNaN(identifiant) ? -1 : identifiant]
  );
  return rows[0] || null;
}

async function verifierContactsDejaUtilises({ cin = null, telephone = null }) {
  const resultat = { cinUtilise: false, telephoneUtilise: false };
  const cinNormalise = typeof cin === 'string' ? cin.trim() : cin;
  const telephoneNormalise = typeof telephone === 'string' ? telephone.trim() : telephone;

  if (cinNormalise) {
    const [cinRows] = await pool.query(
      `SELECT 1 FROM ETUDIANT WHERE cin = ?
       UNION ALL
       SELECT 1 FROM ENSEIGNANT WHERE cin = ?
       LIMIT 1`,
      [cinNormalise, cinNormalise]
    );
    resultat.cinUtilise = cinRows.length > 0;
  }

  if (telephoneNormalise) {
    const [telephoneRows] = await pool.query(
      `SELECT 1 FROM ETUDIANT WHERE tel_etudiant = ?
       UNION ALL
       SELECT 1 FROM ENSEIGNANT WHERE tel_enseignant = ?
       LIMIT 1`,
      [telephoneNormalise, telephoneNormalise]
    );
    resultat.telephoneUtilise = telephoneRows.length > 0;
  }

  return resultat;
}

// =====================================================================
// 2. ETUDIANTS (gestion admin)
// =====================================================================

async function listerEtudiants(id_parcours = null) {
  const base = `SELECT numero_etudiant, nom_etudiant, prenom_etudiant, date_naissance, lieu_naissance, sexe, cin, tel_etudiant, email_etudiant, id_parcours, actif
                FROM ETUDIANT`;
  if (id_parcours) {
    const [rows] = await pool.query(`${base} WHERE id_parcours = ? ORDER BY nom_etudiant`, [id_parcours]);
    return rows;
  }
  const [rows] = await pool.query(`${base} ORDER BY nom_etudiant`);
  return rows;
}

async function creerEtudiant({ nom, prenom, date_naissance, lieu_naissance, sexe, cin, tel_etudiant, email, mot_de_passe_hash, id_parcours, actif = 1 }) {
  const [result] = await pool.query(
    `INSERT INTO ETUDIANT (nom_etudiant, prenom_etudiant, date_naissance, lieu_naissance, sexe, cin, tel_etudiant, email_etudiant, mot_de_pass_etudiant, id_parcours, actif)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nom, prenom, date_naissance, lieu_naissance || null, sexe, cin, tel_etudiant, email, mot_de_passe_hash, id_parcours, actif]
  );
  return result.insertId;
}

async function modifierEtudiant(id, champs) {
  const cles = Object.keys(champs);
  if (cles.length === 0) return;
  const setSql = cles.map((c) => `${c} = ?`).join(', ');
  const valeurs = cles.map((c) => champs[c]);
  await pool.query(`UPDATE ETUDIANT SET ${setSql} WHERE numero_etudiant = ?`, [...valeurs, id]);
}

async function desactiverEtudiant(id) {
  await pool.query('UPDATE ETUDIANT SET actif = 0 WHERE numero_etudiant = ?', [id]);
}

async function activerEtudiant(id) {
  await pool.query('UPDATE ETUDIANT SET actif = 1 WHERE numero_etudiant = ?', [id]);
}

async function obtenirContactEtudiant(id) {
  const [rows] = await pool.query(
    'SELECT email_etudiant AS email, prenom_etudiant AS prenom FROM ETUDIANT WHERE numero_etudiant = ?',
    [id]
  );
  return rows[0] || null;
}

// =====================================================================
// 3. ENSEIGNANTS (gestion admin)
// =====================================================================

async function listerEnseignants() {
  const [rows] = await pool.query(
    `SELECT e.id_enseignant, e.nom_enseignant, e.prenom_enseignant, e.matricule_enseignant, e.sexe, e.date_naissance, e.cin, e.tel_enseignant, e.diplome, e.grade, e.specialite, e.mention_etabisement_attache, e.email_enseignant, e.id_parcours, e.actif, e.role_responsabilite_demande,
            GROUP_CONCAT(DISTINCT CONCAT(p.nom_parcours, ' (', p.niveau, ')') ORDER BY p.nom_parcours SEPARATOR ', ') AS noms_parcours_responsabilite
     FROM ENSEIGNANT e
     LEFT JOIN DEMANDE_RESPONSABILITE dr ON dr.id_enseignant = e.id_enseignant
     LEFT JOIN PARCOURS p ON p.id_parcours = dr.id_parcours
     GROUP BY e.id_enseignant
     ORDER BY e.nom_enseignant`
  );
  return rows;
}

// Liste des parcours qu'un enseignant a demandé de superviser (utilisé par
// l'admin pour afficher/valider une demande de responsabilité en détail).
async function listerParcoursDemandesResponsabilite(id_enseignant) {
  const [rows] = await pool.query(
    `SELECT p.id_parcours, p.nom_parcours, p.niveau, p.mention
     FROM DEMANDE_RESPONSABILITE dr
     JOIN PARCOURS p ON p.id_parcours = dr.id_parcours
     WHERE dr.id_enseignant = ?
     ORDER BY p.nom_parcours, p.niveau`,
    [id_enseignant]
  );
  return rows;
}

async function obtenirProfilEnseignant(id_enseignant) {
  const [rows] = await pool.query(
    `SELECT id_enseignant, nom_enseignant, prenom_enseignant, matricule_enseignant, sexe,
            date_naissance, cin, tel_enseignant, diplome, grade, specialite,
            mention_etabisement_attache, email_enseignant
     FROM ENSEIGNANT WHERE id_enseignant = ?`,
    [id_enseignant]
  );
  return rows[0] || null;
}

async function creerEnseignant({ nom, prenom, sexe, matricule, date_naissance, cin, tel_enseignant, diplome, grade, specialite, mention_etabisement_attache, role_responsabilite_demande, id_parcours_responsabilite_demande, email, mot_de_passe_hash, id_parcours, actif = 1 }) {
  const [result] = await pool.query(
    `INSERT INTO ENSEIGNANT (nom_enseignant, prenom_enseignant, matricule_enseignant, sexe, date_naissance, cin, tel_enseignant, diplome, grade, specialite, mention_etabisement_attache, role_responsabilite_demande, email_enseignant, mot_de_pass_enseignant, id_parcours, actif)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nom, prenom, matricule, sexe, date_naissance, cin, tel_enseignant, diplome, grade, specialite, mention_etabisement_attache, role_responsabilite_demande || null, email, mot_de_passe_hash, id_parcours || null, actif]
  );
  const idEnseignant = result.insertId;

  // id_parcours_responsabilite_demande est un TABLEAU d'IDs (ex: [3, 5, 7]),
  // pas une seule valeur : on insère une ligne par parcours demandé.
  if (Array.isArray(id_parcours_responsabilite_demande) && id_parcours_responsabilite_demande.length > 0) {
    for (const idParcours of id_parcours_responsabilite_demande) {
      await pool.query(
        'INSERT IGNORE INTO DEMANDE_RESPONSABILITE (id_enseignant, id_parcours) VALUES (?, ?)',
        [idEnseignant, idParcours]
      );
    }
  }

  return idEnseignant;
}

async function modifierEnseignant(id, champs) {
  const cles = Object.keys(champs);
  if (cles.length === 0) return;
  const setSql = cles.map((c) => `${c} = ?`).join(', ');
  const valeurs = cles.map((c) => champs[c]);
  await pool.query(`UPDATE ENSEIGNANT SET ${setSql} WHERE id_enseignant = ?`, [...valeurs, id]);
}

async function desactiverEnseignant(id) {
  await pool.query('UPDATE ENSEIGNANT SET actif = 0 WHERE id_enseignant = ?', [id]);
}

async function activerEnseignant(id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ensRows] = await conn.query('SELECT role_responsabilite_demande FROM ENSEIGNANT WHERE id_enseignant = ? FOR UPDATE', [id]);
    if (!ensRows.length) throw new Error('Enseignant introuvable.');
    const { role_responsabilite_demande } = ensRows[0];

    if (role_responsabilite_demande) {
      const colonne = role_responsabilite_demande === 'parcours' ? 'id_directeur' : 'id_responsable_mention';
      const [demandes] = await conn.query('SELECT id_parcours FROM DEMANDE_RESPONSABILITE WHERE id_enseignant = ?', [id]);
      for (const { id_parcours } of demandes) {
        await conn.query(`UPDATE PARCOURS SET ${colonne} = ? WHERE id_parcours = ?`, [id, id_parcours]);
      }
    }
    await conn.query('UPDATE ENSEIGNANT SET actif = 1 WHERE id_enseignant = ?', [id]);
    await conn.commit();
  } catch (erreur) { await conn.rollback(); throw erreur; }
  finally { conn.release(); }
}

async function obtenirContactEnseignant(id) {
  const [rows] = await pool.query(
    'SELECT email_enseignant AS email, prenom_enseignant AS prenom FROM ENSEIGNANT WHERE id_enseignant = ?',
    [id]
  );
  return rows[0] || null;
}

async function affecterEnseignantAEC(id_enseignant, id_EC) {
  await pool.query('INSERT IGNORE INTO ENSEIGNER (id_EC, id_enseignant) VALUES (?, ?)', [id_EC, id_enseignant]);
}

async function listerAffectationsEnseignantEC() {
  const [rows] = await pool.query(
    `SELECT en.id_enseignant, en.id_EC,
            ens.nom_enseignant, ens.prenom_enseignant,
            ec.nom_EC, ue.nom_UE
     FROM ENSEIGNER en
     JOIN ENSEIGNANT ens ON ens.id_enseignant = en.id_enseignant
     JOIN ELEMENT_CONSTITUTIF ec ON ec.id_EC = en.id_EC
     JOIN UNITE_ENSEIGNEMENT ue ON ue.id_UE = ec.id_UE
     ORDER BY ens.nom_enseignant, ens.prenom_enseignant, ec.nom_EC`
  );
  return rows;
}

async function supprimerAffectationEnseignantEC(id_enseignant, id_EC) {
  await pool.query(
    'DELETE FROM ENSEIGNER WHERE id_enseignant = ? AND id_EC = ?',
    [id_enseignant, id_EC]
  );
}

async function obtenirStatistiquesAdmin() {
  const [rows] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM ETUDIANT) AS total_etudiants,
       (SELECT COUNT(*) FROM ETUDIANT WHERE actif = 1) AS etudiants_inscrits,
       (SELECT COUNT(*) FROM ETUDIANT WHERE actif = 0) AS etudiants_en_attente,
       (SELECT COUNT(*) FROM ENSEIGNANT) AS total_enseignants,
       (SELECT COUNT(*) FROM ENSEIGNANT WHERE actif = 1) AS enseignants_inscrits,
       (SELECT COUNT(*) FROM ENSEIGNANT WHERE actif = 0) AS enseignants_en_attente,
       (SELECT COUNT(*) FROM ELEMENT_CONSTITUTIF) AS total_ec,
       (SELECT COUNT(*) FROM UNITE_ENSEIGNEMENT) AS total_ue,
       (SELECT COUNT(DISTINCT NULLIF(TRIM(mention), '')) FROM PARCOURS) AS total_mentions,
       (SELECT COUNT(*) FROM PARCOURS) AS total_parcours`
  );
  return rows[0];
}

async function obtenirNotificationsAdmin() {
  const [demandesRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM DEMANDE_REINITIALISATION WHERE statut = 'En attente'`
  );
  const [etudiantsRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM ETUDIANT WHERE actif = 0`
  );
  const [enseignantsRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM ENSEIGNANT WHERE actif = 0`
  );

  const demandes = Number(demandesRows[0]?.total || 0);
  const etudiantsAttente = Number(etudiantsRows[0]?.total || 0);
  const enseignantsAttente = Number(enseignantsRows[0]?.total || 0);

  const notifications = [];

  if (demandes > 0) {
    notifications.push({
      id: 'demandes-reinitialisation',
      texte: `${demandes} demande${demandes > 1 ? 's' : ''} de réinitialisation en attente.`
    });
  }

  if (etudiantsAttente > 0) {
    notifications.push({
      id: 'etudiants-attente',
      texte: `${etudiantsAttente} compte${etudiantsAttente > 1 ? 's' : ''} étudiant${etudiantsAttente > 1 ? 's' : ''} en attente de validation.`
    });
  }

  if (enseignantsAttente > 0) {
    notifications.push({
      id: 'enseignants-attente',
      texte: `${enseignantsAttente} compte${enseignantsAttente > 1 ? 's' : ''} enseignant${enseignantsAttente > 1 ? 's' : ''} en attente de validation.`
    });
  }

  return notifications;
}

async function obtenirStatistiquesEnseignant(id_enseignant, annee_universitaire = anneeUniversitaireCourante()) {
  const [rows] = await pool.query(
    `SELECT
       (SELECT COUNT(DISTINCT en.id_EC)
        FROM ENSEIGNER en
        WHERE en.id_enseignant = ?) AS total_ec_affectes,
       (SELECT COUNT(DISTINCT en.id_EC)
        FROM ENSEIGNER en
        JOIN EVALUER ev ON ev.id_EC = en.id_EC
          AND ev.annee_universitaire = ?
        WHERE en.id_enseignant = ?) AS total_ec_avec_notes,
       (SELECT COUNT(DISTINCT e.numero_etudiant)
        FROM ETUDIANT e
        JOIN INSCRIPTION i ON i.numero_etudiant = e.numero_etudiant
          AND i.annee_universitaire = ?
        JOIN CONTENIR c ON c.id_parcours = i.id_parcours
        JOIN ELEMENT_CONSTITUTIF ec ON ec.id_UE = c.id_UE
        JOIN ENSEIGNER en ON en.id_EC = ec.id_EC
          AND en.id_enseignant = ?
        LEFT JOIN EVALUER ev ON ev.numero_etudiant = e.numero_etudiant
          AND ev.id_EC = ec.id_EC
          AND ev.annee_universitaire = ?
        WHERE e.actif = 1 AND ev.id_note IS NULL) AS total_etudiants_sans_note`,
    [id_enseignant, annee_universitaire, id_enseignant, annee_universitaire, id_enseignant, annee_universitaire]
  );
  return { annee_universitaire, ...rows[0] };
}

async function obtenirNotificationsEnseignant(id_enseignant, annee_universitaire = anneeUniversitaireCourante()) {
  const [statsRows] = await pool.query(
    `SELECT
       (SELECT COUNT(DISTINCT e.numero_etudiant)
        FROM ETUDIANT e
        JOIN INSCRIPTION i ON i.numero_etudiant = e.numero_etudiant
          AND i.annee_universitaire = ?
        JOIN CONTENIR c ON c.id_parcours = i.id_parcours
        JOIN ELEMENT_CONSTITUTIF ec ON ec.id_UE = c.id_UE
        JOIN ENSEIGNER en ON en.id_EC = ec.id_EC
          AND en.id_enseignant = ?
        LEFT JOIN EVALUER ev ON ev.numero_etudiant = e.numero_etudiant
          AND ev.id_EC = ec.id_EC
          AND ev.annee_universitaire = ?
        WHERE e.actif = 1 AND ev.id_note IS NULL) AS total_etudiants_sans_note,
       (SELECT COUNT(DISTINCT d.numero_etudiant)
        FROM DETTE d
        JOIN ELEMENT_CONSTITUTIF ec ON ec.id_EC = d.id_EC
        JOIN ENSEIGNER en ON en.id_EC = ec.id_EC
          AND en.id_enseignant = ?
        WHERE d.statut = 'En cours') AS total_etudiants_en_dette`,
    [annee_universitaire, id_enseignant, annee_universitaire, id_enseignant]
  );

  const stats = statsRows[0] || {};
  const notifications = [];
  const etudiantsSansNote = Number(stats.total_etudiants_sans_note || 0);
  const etudiantsEnDette = Number(stats.total_etudiants_en_dette || 0);

  if (etudiantsSansNote > 0) {
    notifications.push({
      id: 'etudiants-sans-note',
      texte: `${etudiantsSansNote} étudiant${etudiantsSansNote > 1 ? 's' : ''} n'ont pas encore de note pour ${annee_universitaire}.`
    });
  }

  if (etudiantsEnDette > 0) {
    notifications.push({
      id: 'etudiants-en-dette',
      texte: `${etudiantsEnDette} étudiant${etudiantsEnDette > 1 ? 's' : ''} sont en dette sur vos EC.`
    });
  }

  return notifications;
}

async function obtenirNotificationsEtudiant(numero_etudiant, annee_universitaire = anneeUniversitaireCourante()) {
  const [dettesRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM DETTE WHERE numero_etudiant = ? AND statut = 'En cours'`,
    [numero_etudiant]
  );
  const [notesRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM EVALUER WHERE numero_etudiant = ? AND annee_universitaire = ?`,
    [numero_etudiant, annee_universitaire]
  );

  const dettes = Number(dettesRows[0]?.total || 0);
  const notes = Number(notesRows[0]?.total || 0);
  const notifications = [];

  if (dettes > 0) {
    notifications.push({
      id: 'dettes',
      texte: `Vous avez ${dettes} élément${dettes > 1 ? 's' : ''} constitutif${dettes > 1 ? 's' : ''} en dette à valider.`
    });
  }

  if (notes > 0) {
    notifications.push({
      id: 'notes',
      texte: `${notes} note${notes > 1 ? 's' : ''} ont été saisies pour l'année ${annee_universitaire}.`
    });
  }

  return notifications;
}

// Catalogue des EC qu'un enseignant a le droit de noter (indépendant de
// l'année : le catalogue est réutilisé chaque année universitaire)
async function listerECDUnEnseignant(id_enseignant) {
  const [rows] = await pool.query(
    `SELECT DISTINCT ec.id_EC, ec.nom_EC, ec.credit, ue.nom_UE, ue.niveau, ue.semestre,
            p.id_parcours, p.nom_parcours, p.mention
     FROM ENSEIGNER en
     JOIN ELEMENT_CONSTITUTIF ec ON ec.id_EC = en.id_EC
     JOIN UNITE_ENSEIGNEMENT ue ON ue.id_UE = ec.id_UE
     JOIN CONTENIR c ON c.id_UE = ue.id_UE
     JOIN PARCOURS p ON p.id_parcours = c.id_parcours
     WHERE en.id_enseignant = ?
     ORDER BY p.mention, p.nom_parcours, ue.semestre, ec.nom_EC`,
    [id_enseignant]
  );
  return rows;
}

async function obtenirStatistiquesEnseignant(id_enseignant, annee_universitaire = anneeUniversitaireCourante()) {
  const [rows] = await pool.query(
    `SELECT
       (SELECT COUNT(DISTINCT en.id_EC)
        FROM ENSEIGNER en
        WHERE en.id_enseignant = ?) AS total_ec_affectes,
       (SELECT COUNT(DISTINCT en.id_EC)
        FROM ENSEIGNER en
        JOIN EVALUER ev ON ev.id_EC = en.id_EC
          AND ev.annee_universitaire = ?
        WHERE en.id_enseignant = ?) AS total_ec_avec_notes,
       (SELECT COUNT(DISTINCT e.numero_etudiant)
        FROM ETUDIANT e
        JOIN INSCRIPTION i ON i.numero_etudiant = e.numero_etudiant
          AND i.annee_universitaire = ?
        JOIN CONTENIR c ON c.id_parcours = i.id_parcours
        JOIN ELEMENT_CONSTITUTIF ec ON ec.id_UE = c.id_UE
        JOIN ENSEIGNER en ON en.id_EC = ec.id_EC
          AND en.id_enseignant = ?
        LEFT JOIN EVALUER ev ON ev.numero_etudiant = e.numero_etudiant
          AND ev.id_EC = ec.id_EC
          AND ev.annee_universitaire = ?
        WHERE e.actif = 1 AND ev.id_note IS NULL) AS total_etudiants_sans_note`,
    [id_enseignant, annee_universitaire, id_enseignant, annee_universitaire, id_enseignant, annee_universitaire]
  );
  return { annee_universitaire, ...rows[0] };
}

// =====================================================================
// 4. STRUCTURE ACADEMIQUE : PARCOURS / UE / EC (catalogue)
// =====================================================================

async function listerParcours() {
  const [rows] = await pool.query(
    "SELECT p.*, CONCAT_WS(' ', rp.prenom_enseignant, rp.nom_enseignant) AS nom_responsable_parcours, CONCAT_WS(' ', rm.prenom_enseignant, rm.nom_enseignant) AS nom_responsable_mention FROM PARCOURS p LEFT JOIN ENSEIGNANT rp ON rp.id_enseignant = p.id_directeur LEFT JOIN ENSEIGNANT rm ON rm.id_enseignant = p.id_responsable_mention ORDER BY p.niveau, p.nom_parcours"
  );
  return rows;
}

async function creerParcours({ nom_parcours, niveau, mention, id_directeur, id_responsable_mention }) {
  const [result] = await pool.query(
    'INSERT INTO PARCOURS (nom_parcours, niveau, mention, id_directeur, id_responsable_mention) VALUES (?, ?, ?, ?, ?)',
    [nom_parcours, niveau, mention, id_directeur || null, id_responsable_mention || null]
  );
  return result.insertId;
}

async function modifierParcours(id, champs) {
  const autorises = ['nom_parcours', 'niveau', 'mention', 'id_directeur', 'id_responsable_mention'];
  const cles = Object.keys(champs).filter((cle) => autorises.includes(cle));
  if (cles.length === 0) return;
  const setSql = cles.map((c) => c + ' = ?').join(', ');
  const valeurs = cles.map((c) => champs[c] || null);
  await pool.query('UPDATE PARCOURS SET ' + setSql + ' WHERE id_parcours = ?', [...valeurs, id]);
}

async function supprimerParcours(id) {
  await pool.query('DELETE FROM PARCOURS WHERE id_parcours = ?', [id]);
}

async function listerUE() {
  const [rows] = await pool.query('SELECT * FROM UNITE_ENSEIGNEMENT ORDER BY niveau, semestre, nom_UE');
  return rows;
}

async function creerUE({ code_UE, nom_UE, coefficient, niveau, semestre }) {
  const [result] = await pool.query(
    'INSERT INTO UNITE_ENSEIGNEMENT (code_UE, nom_UE, coefficient, niveau, semestre) VALUES (?, ?, ?, ?, ?)',
    [code_UE || null, nom_UE, coefficient, niveau, semestre]
  );
  return result.insertId;
}

async function modifierUE(id, champs) {
  const cles = Object.keys(champs);
  if (cles.length === 0) return;
  const setSql = cles.map((cle) => `${cle} = ?`).join(', ');
  const valeurs = cles.map((cle) => champs[cle]);
  await pool.query(`UPDATE UNITE_ENSEIGNEMENT SET ${setSql} WHERE id_UE = ?`, [...valeurs, id]);
}

async function supprimerUE(id) {
  await pool.query('DELETE FROM UNITE_ENSEIGNEMENT WHERE id_UE = ?', [id]);
}

async function rattacherUEAuParcours(id_parcours, id_UE) {
  await pool.query('INSERT IGNORE INTO CONTENIR (id_parcours, id_UE) VALUES (?, ?)', [id_parcours, id_UE]);
}

async function listerEC() {
  const [rows] = await pool.query(
    `SELECT ec.*, ue.nom_UE, ue.niveau, ue.semestre FROM ELEMENT_CONSTITUTIF ec
     JOIN UNITE_ENSEIGNEMENT ue ON ue.id_UE = ec.id_UE
     ORDER BY ue.niveau, ue.semestre, ec.nom_EC`
  );
  return rows;
}

// Catalogue des EC d'un parcours donné (utilisé pour calculer le relevé
// d'un étudiant inscrit dans ce parcours une année donnée)
async function listerECDuParcours(id_parcours) {
  const [rows] = await pool.query(
    `SELECT ec.id_EC, ec.nom_EC, ec.credit, ue.id_UE, ue.nom_UE, ue.coefficient, ue.semestre, ue.niveau
     FROM CONTENIR c
     JOIN UNITE_ENSEIGNEMENT ue ON ue.id_UE = c.id_UE
     JOIN ELEMENT_CONSTITUTIF ec ON ec.id_UE = ue.id_UE
     WHERE c.id_parcours = ?
     ORDER BY ue.semestre, ue.nom_UE, ec.nom_EC`,
    [id_parcours]
  );
  return rows;
}

async function creerEC({ nom_EC, credit, id_UE }) {
  const [result] = await pool.query(
    'INSERT INTO ELEMENT_CONSTITUTIF (nom_EC, credit, id_UE) VALUES (?, ?, ?)',
    [nom_EC, credit, id_UE]
  );
  return result.insertId;
}

async function modifierEC(id, champs) {
  const cles = Object.keys(champs);
  if (cles.length === 0) return;
  const setSql = cles.map((c) => `${c} = ?`).join(', ');
  const valeurs = cles.map((c) => champs[c]);
  await pool.query(`UPDATE ELEMENT_CONSTITUTIF SET ${setSql} WHERE id_EC = ?`, [...valeurs, id]);
}

async function supprimerEC(id) {
  await pool.query('DELETE FROM ELEMENT_CONSTITUTIF WHERE id_EC = ?', [id]);
}

// =====================================================================
// 5. INSCRIPTION (parcours/niveau suivi par un étudiant, par année)
// =====================================================================

async function listerAnneesEtudiant(numero_etudiant) {
  const [rows] = await pool.query(
    `SELECT annee_universitaire FROM INSCRIPTION WHERE numero_etudiant = ? ORDER BY annee_universitaire DESC`,
    [numero_etudiant]
  );
  return rows.map((r) => r.annee_universitaire);
}

async function obtenirInscription(numero_etudiant, annee_universitaire) {
  const [rows] = await pool.query(
    "SELECT i.*, p.nom_parcours, p.niveau, p.mention, CONCAT_WS(' ', rp.prenom_enseignant, rp.nom_enseignant) AS responsable_parcours, CONCAT_WS(' ', rm.prenom_enseignant, rm.nom_enseignant) AS responsable_mention FROM INSCRIPTION i JOIN PARCOURS p ON p.id_parcours = i.id_parcours LEFT JOIN ENSEIGNANT rp ON rp.id_enseignant = p.id_directeur LEFT JOIN ENSEIGNANT rm ON rm.id_enseignant = p.id_responsable_mention WHERE i.numero_etudiant = ? AND i.annee_universitaire = ?",
    [numero_etudiant, annee_universitaire]
  );
  return rows[0] || null;
}

// Renvoie l'inscription la plus récente (année universitaire "courante" de l'étudiant)
async function inscriptionCourante(numero_etudiant) {
  const [rows] = await pool.query(
    `SELECT i.*, p.nom_parcours, p.niveau, p.mention FROM INSCRIPTION i
     JOIN PARCOURS p ON p.id_parcours = i.id_parcours
     WHERE i.numero_etudiant = ? ORDER BY i.annee_universitaire DESC LIMIT 1`,
    [numero_etudiant]
  );
  return rows[0] || null;
}

async function creerInscription({ numero_etudiant, id_parcours, annee_universitaire, statut = 'En cours' }) {
  const [result] = await pool.query(
    `INSERT INTO INSCRIPTION (numero_etudiant, id_parcours, annee_universitaire, statut)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id_parcours = VALUES(id_parcours), statut = VALUES(statut)`,
    [numero_etudiant, id_parcours, annee_universitaire, statut]
  );
  return result.insertId;
}

async function modifierStatutInscription(numero_etudiant, annee_universitaire, statut) {
  await pool.query(
    'UPDATE INSCRIPTION SET statut = ? WHERE numero_etudiant = ? AND annee_universitaire = ?',
    [statut, numero_etudiant, annee_universitaire]
  );
}

async function listerInscriptionsEtudiant(numero_etudiant) {
  const [rows] = await pool.query(
    `SELECT i.*, p.nom_parcours, p.niveau, p.mention FROM INSCRIPTION i
     JOIN PARCOURS p ON p.id_parcours = i.id_parcours
     WHERE i.numero_etudiant = ? ORDER BY i.annee_universitaire`,
    [numero_etudiant]
  );
  return rows;
}

// =====================================================================
// 6. NOTES (EVALUER)
// =====================================================================

// Étudiants inscrits (INSCRIPTION) cette année-là dans un parcours qui
// contient cet EC : ce sont les étudiants "normalement" concernés par
// cet EC pour cette année (utilisé pour la saisie de notes courante).
async function listerEtudiantsPourECEtAnnee(id_EC, annee_universitaire) {
  const [rows] = await pool.query(
    `SELECT DISTINCT e.numero_etudiant, e.nom_etudiant, e.prenom_etudiant
     FROM ETUDIANT e
     JOIN INSCRIPTION i ON i.numero_etudiant = e.numero_etudiant AND i.annee_universitaire = ?
     JOIN CONTENIR c ON c.id_parcours = i.id_parcours
     JOIN ELEMENT_CONSTITUTIF ec ON ec.id_UE = c.id_UE
     WHERE ec.id_EC = ? AND e.actif = 1
     ORDER BY e.nom_etudiant`,
    [annee_universitaire, id_EC]
  );
  return rows;
}

async function enseignantEstAutorisePourEC(id_enseignant, id_EC) {
  const [rows] = await pool.query('SELECT 1 FROM ENSEIGNER WHERE id_enseignant = ? AND id_EC = ?', [id_enseignant, id_EC]);
  return rows.length > 0;
}

async function ajouterNote({ numero_etudiant, id_EC, annee_universitaire, note, date_evaluation, type_evaluation, id_enseignant_saisie }) {
  const [maxRows] = await pool.query(
    'SELECT COALESCE(MAX(id_evaluation), 0) AS max_id FROM EVALUER WHERE numero_etudiant = ? AND id_EC = ? AND annee_universitaire = ?',
    [numero_etudiant, id_EC, annee_universitaire]
  );
  const id_evaluation = maxRows[0].max_id + 1;

  const [result] = await pool.query(
    `INSERT INTO EVALUER (numero_etudiant, id_EC, annee_universitaire, id_evaluation, note, date_evaluation, type_evaluation, id_enseignant_saisie)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [numero_etudiant, id_EC, annee_universitaire, id_evaluation, note, date_evaluation, type_evaluation, id_enseignant_saisie]
  );

  // Si cette note est une note de rattrapage >= 10, on vérifie si elle
  // solde une dette ouverte sur ce même EC pour cet étudiant.
  if (type_evaluation === 'Rattrapage' && note >= 10) {
    await soldeDetteSiPossible(numero_etudiant, id_EC, annee_universitaire);
  }

  return result.insertId;
}

async function modifierNote(id_note, id_enseignant, { note, date_evaluation, type_evaluation }) {
  const [result] = await pool.query(
    `UPDATE EVALUER SET note = ?, date_evaluation = ?, type_evaluation = ?
     WHERE id_note = ? AND id_enseignant_saisie = ?`,
    [note, date_evaluation, type_evaluation, id_note, id_enseignant]
  );
  if (result.affectedRows > 0 && type_evaluation === 'Rattrapage' && note >= 10) {
    const [rows] = await pool.query('SELECT numero_etudiant, id_EC, annee_universitaire FROM EVALUER WHERE id_note = ?', [id_note]);
    if (rows[0]) await soldeDetteSiPossible(rows[0].numero_etudiant, rows[0].id_EC, rows[0].annee_universitaire);
  }
  return result.affectedRows > 0;
}

async function supprimerNote(id_note, id_enseignant) {
  const [result] = await pool.query('DELETE FROM EVALUER WHERE id_note = ? AND id_enseignant_saisie = ?', [id_note, id_enseignant]);
  return result.affectedRows > 0;
}

async function listerNotesEtudiantEC(numero_etudiant, id_EC, annee_universitaire) {
  const [rows] = await pool.query(
    'SELECT * FROM EVALUER WHERE numero_etudiant = ? AND id_EC = ? AND annee_universitaire = ? ORDER BY date_evaluation',
    [numero_etudiant, id_EC, annee_universitaire]
  );
  return rows;
}

// Version "1 seule requête" de listerEtudiantsPourECEtAnnee + listerNotesEtudiantEC
// combinés : au lieu de faire une requête EVALUER par étudiant (N+1), on récupère
// tous les étudiants concernés par cet EC/année ET toutes leurs notes en un seul
// LEFT JOIN, puis on regroupe les notes par étudiant côté JavaScript.
async function listerEtudiantsEtNotesPourECEtAnnee(id_EC, annee_universitaire) {
  const [rows] = await pool.query(
    `SELECT DISTINCT e.numero_etudiant, e.nom_etudiant, e.prenom_etudiant,
            ev.id_note, ev.id_evaluation, ev.note, ev.date_evaluation, ev.type_evaluation, ev.id_enseignant_saisie
     FROM ETUDIANT e
     JOIN INSCRIPTION i ON i.numero_etudiant = e.numero_etudiant AND i.annee_universitaire = ?
     JOIN CONTENIR c ON c.id_parcours = i.id_parcours
     JOIN ELEMENT_CONSTITUTIF ec ON ec.id_UE = c.id_UE
     LEFT JOIN EVALUER ev ON ev.numero_etudiant = e.numero_etudiant
                          AND ev.id_EC = ec.id_EC
                          AND ev.annee_universitaire = ?
     WHERE ec.id_EC = ? AND e.actif = 1
     ORDER BY e.nom_etudiant, ev.date_evaluation`,
    [annee_universitaire, annee_universitaire, id_EC]
  );

  // Regroupement : une ligne par étudiant, avec son tableau de notes
  const parEtudiant = new Map();
  for (const ligne of rows) {
    if (!parEtudiant.has(ligne.numero_etudiant)) {
      parEtudiant.set(ligne.numero_etudiant, {
        numero_etudiant: ligne.numero_etudiant,
        nom_etudiant: ligne.nom_etudiant,
        prenom_etudiant: ligne.prenom_etudiant,
        notes: []
      });
    }
    if (ligne.id_note !== null) {
      parEtudiant.get(ligne.numero_etudiant).notes.push({
        id_note: ligne.id_note,
        numero_etudiant: ligne.numero_etudiant,
        id_EC,
        annee_universitaire,
        id_evaluation: ligne.id_evaluation,
        note: ligne.note,
        date_evaluation: ligne.date_evaluation,
        type_evaluation: ligne.type_evaluation,
        id_enseignant_saisie: ligne.id_enseignant_saisie
      });
    }
  }
  return Array.from(parEtudiant.values());
}

// Toutes les notes d'un étudiant pour UNE année universitaire, avec
// infos EC/UE (utilisé pour calculer son relevé de cette année-là)
async function listerNotesAnnee(numero_etudiant, annee_universitaire) {
  const [rows] = await pool.query(
    `SELECT ev.*, ec.nom_EC, ec.credit, ec.id_UE, ue.code_UE, ue.nom_UE, ue.coefficient, ue.semestre
     FROM EVALUER ev
     JOIN ELEMENT_CONSTITUTIF ec ON ec.id_EC = ev.id_EC
     JOIN UNITE_ENSEIGNEMENT ue ON ue.id_UE = ec.id_UE
     WHERE ev.numero_etudiant = ? AND ev.annee_universitaire = ?`,
    [numero_etudiant, annee_universitaire]
  );
  return rows;
}

// =====================================================================
// 7. DETTES
// =====================================================================

async function listerDettesEtudiant(numero_etudiant) {
  const [rows] = await pool.query(
    `SELECT d.*, ec.nom_EC, ec.credit, ue.nom_UE, ue.niveau, ue.semestre
     FROM DETTE d
     JOIN ELEMENT_CONSTITUTIF ec ON ec.id_EC = d.id_EC
     JOIN UNITE_ENSEIGNEMENT ue ON ue.id_UE = ec.id_UE
     WHERE d.numero_etudiant = ?
     ORDER BY d.statut, d.annee_universitaire_origine`,
    [numero_etudiant]
  );
  return rows;
}

// Dettes "En cours" sur un EC donné (utilisé par l'enseignant pour
// retrouver les étudiants qu'il doit noter en rattrapage de dette)
async function listerEtudiantsEnDettePourEC(id_EC) {
  const [rows] = await pool.query(
    `SELECT d.id_dette, d.numero_etudiant, e.nom_etudiant, e.prenom_etudiant, d.annee_universitaire_origine
     FROM DETTE d
     JOIN ETUDIANT e ON e.numero_etudiant = d.numero_etudiant
     WHERE d.id_EC = ? AND d.statut = 'En cours'
     ORDER BY e.nom_etudiant`,
    [id_EC]
  );
  return rows;
}

async function ouvrirDette({ numero_etudiant, id_EC, annee_universitaire_origine }) {
  const [existantes] = await pool.query(
    `SELECT id_dette FROM DETTE WHERE numero_etudiant = ? AND id_EC = ? AND statut = 'En cours'`,
    [numero_etudiant, id_EC]
  );
  if (existantes.length > 0) return;

  await pool.query(
    `INSERT INTO DETTE (numero_etudiant, id_EC, annee_universitaire_origine, statut) VALUES (?, ?, ?, 'En cours')`,
    [numero_etudiant, id_EC, annee_universitaire_origine]
  );
}

async function soldeDetteSiPossible(numero_etudiant, id_EC, annee_universitaire_soldee) {
  await pool.query(
    `UPDATE DETTE SET statut = 'Soldée', annee_universitaire_soldee = ?
     WHERE numero_etudiant = ? AND id_EC = ? AND statut = 'En cours'`,
    [annee_universitaire_soldee, numero_etudiant, id_EC]
  );
}

const POIDS_CONTROLE_CONTINU = 0;
const POIDS_EXAMEN = 1;
const SEUIL_VALIDATION = 10;
const SEUIL_NOTE_ELIMINATOIRE = 3;

function combinerCCEtExamen(moyenneCC, noteExamen) {
  if (moyenneCC !== null && noteExamen !== null) {
    return moyenneCC * POIDS_CONTROLE_CONTINU + noteExamen * POIDS_EXAMEN;
  } else if (noteExamen !== null) {
    return noteExamen;
  } else if (moyenneCC !== null) {
    return moyenneCC;
  }
  return null;
}

// Calcule, pour un EC, la moyenne en session normale ET en session
// rattrapage à partir de la liste brute de ses notes (toutes années/
// tous types confondus pour CE couple étudiant/EC/année).
function calculerMoyenneEC(notes) {
  const cc = notes.filter((n) => ['TD', 'Projet', 'TP'].includes(n.type_evaluation));
  const normale = notes.find((n) => n.type_evaluation === 'Session Normale');
  const rattrapage = notes.find((n) => n.type_evaluation === 'Rattrapage');

  const moyenneCC = cc.length > 0 ? cc.reduce((s, n) => s + parseFloat(n.note), 0) / cc.length : null;
  const noteExamenNormale = normale ? parseFloat(normale.note) : null;

  const moyenneNormale = combinerCCEtExamen(moyenneCC, noteExamenNormale);

  let moyenneRattrapage;
  if (moyenneNormale !== null && moyenneNormale >= SEUIL_VALIDATION) {
    // EC déjà validé en session normale : rien à rattraper, le résultat est repris tel quel.
    moyenneRattrapage = moyenneNormale;
  } else if (rattrapage) {
    const noteRattrapage = parseFloat(rattrapage.note);
    const meilleureNoteExamen = noteExamenNormale !== null ? Math.max(noteExamenNormale, noteRattrapage) : noteRattrapage;
    const moyenneAlternative = combinerCCEtExamen(moyenneCC, meilleureNoteExamen);
    moyenneRattrapage = moyenneNormale !== null ? Math.max(moyenneNormale, moyenneAlternative) : moyenneAlternative;
  } else {
    // Pas de note de rattrapage saisie : le résultat reste celui de la session normale (souvent un échec, ou null si rien saisi).
    moyenneRattrapage = moyenneNormale;
  }

  return {
    moyenneNormale,
    moyenneRattrapage,
    eliminatoireNormale: moyenneNormale !== null && moyenneNormale < SEUIL_NOTE_ELIMINATOIRE,
    eliminatoireRattrapage: moyenneRattrapage !== null && moyenneRattrapage < SEUIL_NOTE_ELIMINATOIRE
  };
}

// Regroupe une liste de notes (toutes années confondues pour ce couple
// étudiant/EC) par UE puis par semestre, calcule les deux sessions à
// chaque niveau (EC -> UE -> semestre), et renvoie le résultat détaillé.
function calculerReleveSemestres(notesAnnee) {
  const semestres = {};

  for (const ligne of notesAnnee) {
    const sem = ligne.semestre;
    if (!semestres[sem]) semestres[sem] = { ues: {}, aRattrapage: false };
    // Au moins une note de rattrapage dans ce semestre => le relevé du
    // semestre affichera le résultat du rattrapage (sinon la session normale).
    if (ligne.type_evaluation === 'Rattrapage') semestres[sem].aRattrapage = true;
    const ues = semestres[sem].ues;
    if (!ues[ligne.id_UE]) {
      ues[ligne.id_UE] = { code_UE: ligne.code_UE, nom_UE: ligne.nom_UE, coefficient: parseFloat(ligne.coefficient), ecs: {} };
    }
    const ecs = ues[ligne.id_UE].ecs;
    if (!ecs[ligne.id_EC]) {
      ecs[ligne.id_EC] = { nom_EC: ligne.nom_EC, credit: parseFloat(ligne.credit), notes: [] };
    }
    ecs[ligne.id_EC].notes.push(ligne);
  }

  const resultat = {};

  for (const [nomSemestre, dataSem] of Object.entries(semestres)) {
    const uesCalculees = [];
    let sommePondNormale = 0, sommeCoefNormale = 0;
    let sommePondRattrapage = 0, sommeCoefRattrapage = 0;

    for (const ue of Object.values(dataSem.ues)) {
      let sommeCreditsN = 0, sommeNotesPondN = 0;
      let sommeCreditsR = 0, sommeNotesPondR = 0;
      const ecsCalcules = [];

      for (const ec of Object.values(ue.ecs)) {
        const { moyenneNormale, moyenneRattrapage, eliminatoireNormale, eliminatoireRattrapage } = calculerMoyenneEC(ec.notes);
        ecsCalcules.push({ nom_EC: ec.nom_EC, credit: ec.credit, moyenneNormale, moyenneRattrapage, eliminatoireNormale, eliminatoireRattrapage });
        if (moyenneNormale !== null) { sommeNotesPondN += moyenneNormale * ec.credit; sommeCreditsN += ec.credit; }
        if (moyenneRattrapage !== null) { sommeNotesPondR += moyenneRattrapage * ec.credit; sommeCreditsR += ec.credit; }
      }

      const moyenneUENormale = sommeCreditsN > 0 ? sommeNotesPondN / sommeCreditsN : null;
      const moyenneUERattrapage = sommeCreditsR > 0 ? sommeNotesPondR / sommeCreditsR : null;

      // Une note éliminatoire (< 3/20) sur un seul EC empêche la
      // compensation INTERNE à l'UE : l'UE est déclarée non-acquise même
      // si sa moyenne pondérée affichée atteint 10/20 grâce aux autres EC
      // (la moyenne numérique reste honnête, seul le VERDICT est forcé).
      const elimineNormale = ecsCalcules.some((ec) => ec.eliminatoireNormale);
      const elimineRattrapage = ecsCalcules.some((ec) => ec.eliminatoireRattrapage);

      uesCalculees.push({
        code_UE: ue.code_UE, nom_UE: ue.nom_UE, coefficient: ue.coefficient,
        moyenneNormale: moyenneUENormale, moyenneRattrapage: moyenneUERattrapage,
        elimineNormale, elimineRattrapage,
        ecs: ecsCalcules
      });

      if (moyenneUENormale !== null) { sommePondNormale += moyenneUENormale * ue.coefficient; sommeCoefNormale += ue.coefficient; }
      if (moyenneUERattrapage !== null) { sommePondRattrapage += moyenneUERattrapage * ue.coefficient; sommeCoefRattrapage += ue.coefficient; }
    }

    const moyenneGeneraleNormale = sommeCoefNormale > 0 ? sommePondNormale / sommeCoefNormale : null;
    const moyenneGeneraleRattrapage = sommeCoefRattrapage > 0 ? sommePondRattrapage / sommeCoefRattrapage : null;

    const resultatNormaleSem = calculerResultatSemestre(moyenneGeneraleNormale, uesCalculees, 'moyenneNormale', 'elimineNormale');
    resultat[nomSemestre] = {
      // L'étudiant "passe au rattrapage" seulement si le semestre n'est PAS
      // validé en session normale ET qu'il existe des notes de rattrapage.
      aRattrapage: dataSem.aRattrapage && resultatNormaleSem === 'Non validé',
      ues: uesCalculees,
      moyenneGeneraleNormale: moyenneGeneraleNormale !== null ? Math.round(moyenneGeneraleNormale * 100) / 100 : null,
      moyenneGeneraleRattrapage: moyenneGeneraleRattrapage !== null ? Math.round(moyenneGeneraleRattrapage * 100) / 100 : null,
      resultatNormale: resultatNormaleSem,
      resultatRattrapage: calculerResultatSemestre(moyenneGeneraleRattrapage, uesCalculees, 'moyenneRattrapage', 'elimineRattrapage')
    };
  }

  return resultat;
}

// Un semestre est validé si sa moyenne générale atteint 10/20
// (SEUIL_VALIDATION), même si une ou plusieurs UE sont individuellement
// en dessous de 10 ("Validé par compensation"). MAIS : si une UE porte
// une note éliminatoire (< 3/20 sur un de ses EC), ni cette UE ni le
// semestre qui la contient ne peuvent être validés par compensation,
// quelle que soit la moyenne générale obtenue — il faut réellement
// rattraper la note en dessous de 3/20. Une note égale à 10 reste
// compensable (comparaisons toujours inclusives, >=).
function calculerResultatSemestre(moyenneGenerale, ues, cleMoyenne, cleElimine) {
  if (moyenneGenerale === null) return 'Non validé';
  const semestreElimine = ues.some((ue) => ue[cleElimine]);
  if (semestreElimine) return 'Non validé';
  const uesEnDessous = ues.filter((ue) => ue[cleMoyenne] !== null && ue[cleMoyenne] < SEUIL_VALIDATION);
  const auMoinsUneUEEnDessous = uesEnDessous.length > 0;
  if (moyenneGenerale >= SEUIL_VALIDATION && auMoinsUneUEEnDessous) return 'Validé par compensation';
  if (moyenneGenerale >= SEUIL_VALIDATION) return 'Validé';
  return 'Non validé';
}

// Fonction principale appelée par les contrôleurs : calcule le relevé
// complet (deux sessions, tous semestres du niveau) d'un étudiant pour
// UNE année universitaire donnée.
async function calculerReleveAnnee(numero_etudiant, annee_universitaire) {
  const inscription = await obtenirInscription(numero_etudiant, annee_universitaire);
  if (!inscription) return null;

  const notesAnnee = await listerNotesAnnee(numero_etudiant, annee_universitaire);
  const semestres = calculerReleveSemestres(notesAnnee);

  // Décision annuelle "provisoire" (calculée à la volée, sans être
  // persistée) : ce que serait la décision si l'année était clôturée
  // maintenant avec les notes actuelles.
  const nomsSemestres = Object.keys(semestres).sort();
  let decisionProvisoire = 'En attente';
  if (nomsSemestres.length === 2) {
    const [s1, s2] = nomsSemestres.map((n) => semestres[n]);
    const s1Valide = s1.resultatRattrapage !== 'Non validé';
    const s2Valide = s2.resultatRattrapage !== 'Non validé';
    if (s1Valide && s2Valide) decisionProvisoire = 'Admis';
    else if (s1Valide || s2Valide) decisionProvisoire = 'Admis avec dette';
    else decisionProvisoire = 'Redouble';
  }

  return {
    annee_universitaire,
    mention: inscription.mention,
    niveau: inscription.niveau,
    nom_parcours: inscription.nom_parcours,
    responsable_parcours: inscription.responsable_parcours,
    responsable_mention: inscription.responsable_mention,
    statut_inscription: inscription.statut,
    semestres,
    decision_provisoire: decisionProvisoire
  };
}

// =====================================================================
// 9. CLOTURE D'ANNEE / PROMOTION AUTOMATIQUE (action administrateur)
// -----------------------------------------------------------------
// Calcule le résultat final (session rattrapage) des deux semestres de
// l'année en cours d'un étudiant, détermine Admis / Admis avec dette /
// Redouble, ouvre les dettes nécessaires, et promeut AUTOMATIQUEMENT
// l'étudiant au niveau supérieur (ou maintien en redoublement) pour l'année suivante.
// =====================================================================

function calculerAnneeSuivante(annee) {
  const match = annee ? annee.match(/^(\d{4})-(\d{4})$/) : null;
  if (match) {
    const d = parseInt(match[1], 10);
    const f = parseInt(match[2], 10);
    return `${d + 1}-${f + 1}`;
  }
  const maintenant = new Date();
  const anneeCivile = maintenant.getFullYear();
  return `${anneeCivile}-${anneeCivile + 1}`;
}

async function trouverParcoursSuivant(id_parcours) {
  const [pRows] = await pool.query('SELECT * FROM PARCOURS WHERE id_parcours = ?', [id_parcours]);
  if (pRows.length === 0) return null;
  const pActuel = pRows[0];
  if (pActuel.id_parcours_suivant_defaut) return pActuel.id_parcours_suivant_defaut;

  const niveauxOrdre = ['L1', 'L2', 'L3', 'M1', 'M2'];
  const idx = niveauxOrdre.indexOf(pActuel.niveau);
  if (idx === -1 || idx === niveauxOrdre.length - 1) {
    return pActuel.id_parcours; // Déjà M2
  }
  const niveauSuivant = niveauxOrdre[idx + 1];

  // Chercher un parcours correspondant au niveau suivant
  const [suivants] = await pool.query(
    'SELECT id_parcours, nom_parcours FROM PARCOURS WHERE niveau = ?',
    [niveauSuivant]
  );
  if (suivants.length === 0) return pActuel.id_parcours;

  const exact = suivants.find((s) => s.nom_parcours.trim().toLowerCase() === pActuel.nom_parcours.trim().toLowerCase());
  if (exact) return exact.id_parcours;

  const partiel = suivants.find((s) =>
    s.nom_parcours.toLowerCase().includes(pActuel.nom_parcours.toLowerCase()) ||
    pActuel.nom_parcours.toLowerCase().includes(s.nom_parcours.toLowerCase())
  );
  if (partiel) return partiel.id_parcours;

  return suivants[0].id_parcours;
}

async function cloturerAnneeEtudiant({ numero_etudiant, annee_universitaire, id_parcours_suivant = null, annee_universitaire_suivante = null }) {
  const inscriptionExistante = await obtenirInscription(numero_etudiant, annee_universitaire);
  if (!inscriptionExistante) throw new Error("Aucune inscription trouvée pour cette année universitaire.");
  if (inscriptionExistante.statut !== 'En cours') {
    throw new Error(`Cette année a déjà été clôturée (statut actuel : ${inscriptionExistante.statut}). Pour la re-clôturer, remettez d'abord son statut à "En cours".`);
  }

  const releve = await calculerReleveAnnee(numero_etudiant, annee_universitaire);
  if (!releve) throw new Error("Aucune inscription trouvée pour cette année universitaire.");

  const nomsSemestres = Object.keys(releve.semestres).sort();
  if (nomsSemestres.length !== 2) {
    throw new Error('Impossible de clôturer : cette formation ne compte pas exactement 2 semestres notés pour cette année.');
  }

  const [nomS1, nomS2] = nomsSemestres;
  const s1 = releve.semestres[nomS1];
  const s2 = releve.semestres[nomS2];
  const s1Valide = s1.resultatRattrapage !== 'Non validé';
  const s2Valide = s2.resultatRattrapage !== 'Non validé';

  let statutFinal;
  const dettesOuvertes = [];

  if (s1Valide && s2Valide) {
    statutFinal = 'Admis';
  } else if (s1Valide || s2Valide) {
    statutFinal = 'Admis avec dette';
    // Le semestre non validé -> on ouvre une dette pour chaque EC resté sous la moyenne au rattrapage
    const semestreEnDette = s1Valide ? s2 : s1;
    for (const ue of semestreEnDette.ues) {
      for (const ec of ue.ecs) {
        if (ec.moyenneRattrapage === null || ec.moyenneRattrapage < SEUIL_VALIDATION) {
          const [rows] = await pool.query('SELECT id_EC FROM ELEMENT_CONSTITUTIF WHERE nom_EC = ? LIMIT 1', [ec.nom_EC]);
          if (rows[0]) {
            await ouvrirDette({ numero_etudiant, id_EC: rows[0].id_EC, annee_universitaire_origine: annee_universitaire });
            dettesOuvertes.push(ec.nom_EC);
          }
        }
      }
    }
  } else {
    statutFinal = 'Redouble';
  }

  await modifierStatutInscription(numero_etudiant, annee_universitaire, statutFinal);

  // Détermination automatique du niveau et parcours suivant
  const anneeCible = annee_universitaire_suivante || calculerAnneeSuivante(annee_universitaire);
  let parcoursCible = id_parcours_suivant;
  let estDiplome = false;

  if (inscriptionExistante.niveau === 'M2' && statutFinal === 'Admis') {
    // Fin d'études / Diplômé : pas de réinscription en N+1
    estDiplome = true;
    parcoursCible = null;
  } else if (!parcoursCible) {
    if (statutFinal === 'Admis' || statutFinal === 'Admis avec dette') {
      parcoursCible = await trouverParcoursSuivant(inscriptionExistante.id_parcours);
    } else {
      // Redoublement : maintien dans le même niveau et parcours
      parcoursCible = inscriptionExistante.id_parcours;
    }
  }

  if (parcoursCible && anneeCible && !estDiplome) {
    await creerInscription({
      numero_etudiant,
      id_parcours: parcoursCible,
      annee_universitaire: anneeCible,
      statut: 'En cours'
    });
    await modifierEtudiant(numero_etudiant, { id_parcours: parcoursCible });
  }

  return { statutFinal, dettesOuvertes, parcoursSuivant: parcoursCible, anneeSuivante: estDiplome ? null : anneeCible, diplome: estDiplome };
}

async function cloturerAnneeGlobale(annee_universitaire) {
  const [inscriptions] = await pool.query(
    `SELECT i.numero_etudiant, e.nom_etudiant, e.prenom_etudiant
     FROM INSCRIPTION i
     JOIN ETUDIANT e ON e.numero_etudiant = i.numero_etudiant
     WHERE i.annee_universitaire = ? AND i.statut = 'En cours'`,
    [annee_universitaire]
  );

  const resultats = [];
  let admisCount = 0;
  let dettesCount = 0;
  let redoubleCount = 0;
  let erreursCount = 0;

  for (const ins of inscriptions) {
    try {
      const res = await cloturerAnneeEtudiant({
        numero_etudiant: ins.numero_etudiant,
        annee_universitaire
      });
      if (res.statutFinal === 'Admis') admisCount++;
      else if (res.statutFinal === 'Admis avec dette') dettesCount++;
      else if (res.statutFinal === 'Redouble') redoubleCount++;

      resultats.push({
        numero_etudiant: ins.numero_etudiant,
        nom_complet: `${ins.nom_etudiant} ${ins.prenom_etudiant}`,
        statut: res.statutFinal,
        dettes: res.dettesOuvertes,
        succes: true
      });
    } catch (err) {
      erreursCount++;
      resultats.push({
        numero_etudiant: ins.numero_etudiant,
        nom_complet: `${ins.nom_etudiant} ${ins.prenom_etudiant}`,
        erreur: err.message,
        succes: false
      });
    }
  }

  return {
    annee_universitaire,
    total: inscriptions.length,
    admis: admisCount,
    admis_avec_dette: dettesCount,
    redouble: redoubleCount,
    erreurs: erreursCount,
    details: resultats
  };
}

async function verifierEtudiantsSansNote(annee_universitaire) {
  const [rows] = await pool.query(
    `SELECT i.numero_etudiant, e.nom_etudiant, e.prenom_etudiant, p.nom_parcours,
            p.niveau, COUNT(ev.id_note) AS nombre_notes
     FROM INSCRIPTION i
     JOIN ETUDIANT e ON e.numero_etudiant = i.numero_etudiant
     JOIN PARCOURS p ON p.id_parcours = i.id_parcours
     LEFT JOIN EVALUER ev
       ON ev.numero_etudiant = i.numero_etudiant
      AND ev.annee_universitaire = i.annee_universitaire
     WHERE i.annee_universitaire = ? AND i.statut = 'En cours'
     GROUP BY i.numero_etudiant, e.nom_etudiant, e.prenom_etudiant,
              p.nom_parcours, p.niveau
     HAVING COUNT(ev.id_note) = 0
     ORDER BY e.nom_etudiant, e.prenom_etudiant`,
    [annee_universitaire]
  );
  return rows;
}

// =====================================================================
// 10. CATALOGUE GLOBAL ET DEMANDES DE REINITIALISATION
// =====================================================================

async function listerCatalogueECComplet() {
  const [rows] = await pool.query(
    `SELECT DISTINCT ec.id_EC, ec.nom_EC, ec.credit, ue.id_UE, ue.nom_UE,
            COALESCE(p.niveau, ue.niveau) AS niveau, ue.semestre,
            p.id_parcours, p.nom_parcours, TRIM(p.mention) AS mention
     FROM ELEMENT_CONSTITUTIF ec
     JOIN UNITE_ENSEIGNEMENT ue ON ue.id_UE = ec.id_UE
     JOIN CONTENIR c ON c.id_UE = ue.id_UE
     JOIN PARCOURS p ON p.id_parcours = c.id_parcours
     ORDER BY p.niveau, p.nom_parcours, ue.semestre, ec.nom_EC`
  );
  return rows;
}

// Durée de validité du lien de confirmation reçu par email
const DUREE_VALIDITE_TOKEN_MINUTES = 60;

// Génère un token aléatoire (envoyé en clair dans l'email) et son hash
// SHA-256 (seul stocké en base). On ne stocke jamais le token en clair
// pour qu'une fuite de la base ne suffise pas à réinitialiser un compte.
function genererTokenReinitialisation() {
  const token = crypto.randomBytes(32).toString('hex');
  const token_hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, token_hash };
}

// Crée la demande ET son token en une fois. Retourne le token EN CLAIR
// (à mettre dans le lien de l'email) : c'est la seule fois où il existe
// quelque part, il n'est jamais renvoyé ni relisible ensuite.
async function creerDemandeReinitialisation({ email, role, mot_de_passe_souhaite }) {
  const { token, token_hash } = genererTokenReinitialisation();
  const [result] = await pool.query(
    `INSERT INTO DEMANDE_REINITIALISATION (email, role, mot_de_passe_souhaite, statut, token_hash, token_expire)
     VALUES (?, ?, ?, 'En attente', ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [email, role, mot_de_passe_souhaite, token_hash, DUREE_VALIDITE_TOKEN_MINUTES]
  );
  return { id_demande: result.insertId, token };
}

async function listerDemandesReinitialisation(statut = null) {
  if (statut) {
    const [rows] = await pool.query(
      `SELECT * FROM DEMANDE_REINITIALISATION WHERE statut = ? ORDER BY date_demande DESC`,
      [statut]
    );
    return rows;
  }
  const [rows] = await pool.query(
    `SELECT * FROM DEMANDE_REINITIALISATION ORDER BY date_demande DESC`
  );
  return rows;
}

// Applique réellement le changement de mot de passe pour une demande donnée
// (logique commune entre la confirmation automatique par lien et un
// traitement manuel éventuel par l'admin).
async function appliquerMotDePasseDemande(demande) {
  const bcrypt = require('bcrypt');
  const hash = await bcrypt.hash(demande.mot_de_passe_souhaite, 10);

  if (demande.role === 'etudiant') {
    const etu = await trouverEtudiantParIdentifiant(demande.email);
    if (!etu) throw new Error("Aucun compte étudiant trouvé avec cet email.");
    await modifierEtudiant(etu.numero_etudiant, { mot_de_pass_etudiant: hash });
  } else if (demande.role === 'enseignant') {
    const ens = await trouverEnseignantParEmail(demande.email);
    if (!ens) throw new Error("Aucun compte enseignant trouvé avec cet email.");
    await modifierEnseignant(ens.id_enseignant, { mot_de_pass_enseignant: hash });
  } else if (demande.role === 'admin') {
    const adm = await trouverAdminParEmail(demande.email);
    if (!adm) throw new Error("Aucun compte administrateur trouvé avec cet email.");
    await pool.query('UPDATE ADMINISTRATEUR SET mot_de_pass_admin = ? WHERE id_admin = ?', [hash, adm.id_admin]);
  }

  return { email: demande.email, role: demande.role };
}

// Utilisé par la confirmation automatique : retrouve la demande à partir
// du token reçu dans le lien (on hash le token reçu et on compare aux
// hash stockés — jamais de comparaison sur le token en clair).
async function confirmerReinitialisationParToken(tokenRecu) {
  const token_hash = crypto.createHash('sha256').update(String(tokenRecu || '')).digest('hex');

  const [rows] = await pool.query(
    `SELECT * FROM DEMANDE_REINITIALISATION WHERE token_hash = ? LIMIT 1`,
    [token_hash]
  );
  const demande = rows[0];

  if (!demande) {
    const erreur = new Error("Ce lien de confirmation est invalide.");
    erreur.code = 'TOKEN_INTROUVABLE';
    throw erreur;
  }
  if (demande.statut === 'Traité') {
    const erreur = new Error("Ce lien a déjà été utilisé : votre mot de passe a déjà été réinitialisé.");
    erreur.code = 'DEJA_TRAITE';
    throw erreur;
  }
  if (demande.statut === 'Rejeté') {
    const erreur = new Error("Cette demande a été annulée.");
    erreur.code = 'REJETE';
    throw erreur;
  }
  if (new Date(demande.token_expire) < new Date()) {
    await pool.query(`UPDATE DEMANDE_REINITIALISATION SET statut = 'Expiré' WHERE id_demande = ?`, [demande.id_demande]);
    const erreur = new Error("Ce lien de confirmation a expiré. Merci de refaire une demande de réinitialisation.");
    erreur.code = 'EXPIRE';
    throw erreur;
  }

  const resultat = await appliquerMotDePasseDemande(demande);

  await pool.query(
    `UPDATE DEMANDE_REINITIALISATION SET statut = 'Traité', date_traitement = CURRENT_TIMESTAMP WHERE id_demande = ?`,
    [demande.id_demande]
  );

  return resultat;
}

// Conservé pour un éventuel traitement manuel par l'admin (dépannage) :
// applique directement le mot de passe sans passer par le token.
async function traiterDemandeReinitialisation(id_demande) {
  const [rows] = await pool.query(`SELECT * FROM DEMANDE_REINITIALISATION WHERE id_demande = ?`, [id_demande]);
  if (rows.length === 0) throw new Error("Demande introuvable.");
  const demande = rows[0];
  if (demande.statut === 'Traité') throw new Error("Cette demande a déjà été traitée.");

  const resultat = await appliquerMotDePasseDemande(demande);
  return { ...resultat, mot_de_passe_souhaite: demande.mot_de_passe_souhaite };
}

async function marquerDemandeReinitialisationTraitee(id_demande) {
  await pool.query(
    `UPDATE DEMANDE_REINITIALISATION SET statut = 'Traité', date_traitement = CURRENT_TIMESTAMP WHERE id_demande = ?`,
    [id_demande]
  );
}

async function rejeterDemandeReinitialisation(id_demande) {
  await pool.query(
    `UPDATE DEMANDE_REINITIALISATION SET statut = 'Rejeté', date_traitement = CURRENT_TIMESTAMP WHERE id_demande = ?`,
    [id_demande]
  );
}

async function supprimerDemandeReinitialisation(id_demande) {
  const [result] = await pool.query(
    `DELETE FROM DEMANDE_REINITIALISATION WHERE id_demande = ?`,
    [id_demande]
  );

  if (result.affectedRows === 0) {
    throw new Error('Demande introuvable.');
  }

  return result;
}

// =====================================================================
// 11. HISTORIQUE (archivage officiel d'un relevé figé)
// =====================================================================

async function figerResultat({ numero_etudiant, semestre, annee_universitaire, session_examen, moyenne_generale, resultat_semestre }) {
  const [result] = await pool.query(
    `INSERT INTO HISTORIQUE_RESULTAT (numero_etudiant, semestre, annee_universitaire, session_examen, moyenne_generale, resultat_semestre)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [numero_etudiant, semestre, annee_universitaire, session_examen, moyenne_generale, resultat_semestre]
  );
  return result.insertId;
}

// Calcule l'année universitaire "en cours" par défaut, au format 'AAAA-AAAA'.
// Règle usuelle : l'année universitaire commence en septembre.
function anneeUniversitaireCourante() {
  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const mois = maintenant.getMonth() + 1; // 1-12
  return mois >= 9 ? `${annee}-${annee + 1}` : `${annee - 1}-${annee}`;
}

module.exports = {
  // auth
  trouverAdminParEmail, trouverEnseignantParEmail, trouverEtudiantParIdentifiant, verifierContactsDejaUtilises,
  // étudiants
  listerEtudiants, creerEtudiant, modifierEtudiant, desactiverEtudiant, activerEtudiant, obtenirContactEtudiant,
  // enseignants
  listerEnseignants, listerParcoursDemandesResponsabilite, obtenirProfilEnseignant, creerEnseignant, modifierEnseignant, desactiverEnseignant, activerEnseignant, obtenirContactEnseignant,
  affecterEnseignantAEC, listerECDUnEnseignant, obtenirStatistiquesEnseignant,
  obtenirNotificationsEnseignant, obtenirNotificationsEtudiant, obtenirNotificationsAdmin,
  listerAffectationsEnseignantEC, supprimerAffectationEnseignantEC, obtenirStatistiquesAdmin,
  // structure académique
  listerParcours, creerParcours, modifierParcours, supprimerParcours,
  listerUE, creerUE, modifierUE, supprimerUE, rattacherUEAuParcours,
  listerEC, listerECDuParcours, creerEC, modifierEC, supprimerEC, listerCatalogueECComplet,
  // inscriptions
  listerAnneesEtudiant, obtenirInscription, inscriptionCourante, creerInscription,
  modifierStatutInscription, listerInscriptionsEtudiant,
  // notes
  listerEtudiantsPourECEtAnnee, listerEtudiantsEtNotesPourECEtAnnee, enseignantEstAutorisePourEC, ajouterNote, modifierNote,
  supprimerNote, listerNotesEtudiantEC, listerNotesAnnee,
  // dettes
  listerDettesEtudiant, listerEtudiantsEnDettePourEC, ouvrirDette, soldeDetteSiPossible,
  // calculs
  calculerMoyenneEC, calculerReleveSemestres, calculerReleveAnnee, cloturerAnneeEtudiant,
  cloturerAnneeGlobale, verifierEtudiantsSansNote, trouverParcoursSuivant, calculerAnneeSuivante,
  anneeUniversitaireCourante,
  // réinitialisation mot de passe
  creerDemandeReinitialisation, listerDemandesReinitialisation, traiterDemandeReinitialisation, marquerDemandeReinitialisationTraitee, rejeterDemandeReinitialisation, supprimerDemandeReinitialisation, confirmerReinitialisationParToken,
  // historique
  figerResultat
};


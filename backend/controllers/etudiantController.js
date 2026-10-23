// =====================================================================
// controllers/etudiantController.js
// -----------------------------------------------------------------
// Toutes les routes ici sont accessibles uniquement par un étudiant
// connecté. L'étudiant ne peut voir QUE ses propres données : on
// utilise systématiquement req.utilisateur.id (extrait du token JWT).
//
// L'étudiant peut consulter n'importe quelle année universitaire où il
// a été inscrit (?annee=2024-2025), avec pour chaque semestre les deux
// sessions (Normale et Rattrapage), ainsi que ses dettes en cours.
// =====================================================================

const { pool } = require('../config/db');
const modele = require('../models');

// GET /api/etudiant/profil : infos du profil + parcours ACTUEL
async function getProfil(req, res) {
  try {
    const numero = req.utilisateur.id;
    const [rows] = await pool.query(
            `SELECT e.numero_etudiant, e.nom_etudiant, e.prenom_etudiant, e.email_etudiant, e.date_naissance, e.lieu_naissance,
              e.sexe, e.cin, e.tel_etudiant,
              p.nom_parcours, p.niveau, p.mention
       FROM ETUDIANT e JOIN PARCOURS p ON p.id_parcours = e.id_parcours
       WHERE e.numero_etudiant = ?`,
      [numero]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Étudiant introuvable.' });
    return res.json(rows[0]);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// GET /api/etudiant/annees : liste des années universitaires disponibles
// pour ce compte (sert à peupler le sélecteur d'historique côté frontend)
async function getAnnees(req, res) {
  try {
    const annees = await modele.listerAnneesEtudiant(req.utilisateur.id);
    return res.json(annees);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// GET /api/etudiant/notes?annee=2024-2025 : relevé complet (2 sessions)
// pour l'année demandée (par défaut, l'année la plus récente)
async function getNotesEtMoyennes(req, res) {
  try {
    const numero = req.utilisateur.id;
    let { annee } = req.query;

    if (!annee) {
      const inscription = await modele.inscriptionCourante(numero);
      if (!inscription) return res.json({ semestres: {}, decision_provisoire: 'En attente' });
      annee = inscription.annee_universitaire;
    }

    const releve = await modele.calculerReleveAnnee(numero, annee);
    if (!releve) return res.status(404).json({ message: "Aucune inscription trouvée pour cette année universitaire." });
    return res.json(releve);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur lors du calcul des moyennes.' });
  }
}

// GET /api/etudiant/dettes : liste des EC en dette (soldées ou non)
async function getDettes(req, res) {
  try {
    const dettes = await modele.listerDettesEtudiant(req.utilisateur.id);
    return res.json(dettes);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function getNotifications(req, res) {
  try {
    const annee = req.query.annee || modele.anneeUniversitaireCourante();
    const notifications = await modele.obtenirNotificationsEtudiant(req.utilisateur.id, annee);
    return res.json(notifications);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// GET /api/etudiant/inscriptions : historique des inscriptions (année, niveau, statut)
async function getInscriptions(req, res) {
  try {
    const lignes = await modele.listerInscriptionsEtudiant(req.utilisateur.id);
    return res.json(lignes.map((i) => ({
      annee_universitaire: i.annee_universitaire,
      niveau: i.niveau,
      nom_parcours: i.nom_parcours,
      mention: i.mention,
      statut: i.statut
    })));
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = { getInscriptions, getProfil, getAnnees, getNotesEtMoyennes, getDettes, getNotifications };

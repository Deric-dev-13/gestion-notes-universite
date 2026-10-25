// =====================================================================
// controllers/enseignantController.js
// -----------------------------------------------------------------
// Espace Enseignant : sélection du contexte de travail (EC), saisie
// des notes pour une ANNÉE UNIVERSITAIRE donnée (l'enseignant peut
// choisir une année passée pour noter un rattrapage de dette), et
// consultation/traitement des dettes ouvertes sur les EC qu'il gère.
// =====================================================================

const modele = require('../models');

// GET /api/enseignant/profil : informations personnelles de l'enseignant connecté
async function getProfil(req, res) {
  try {
    const profil = await modele.obtenirProfilEnseignant(req.utilisateur.id);
    if (!profil) return res.status(404).json({ message: 'Enseignant introuvable.' });
    return res.json(profil);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// GET /api/enseignant/mes-ec : catalogue des EC affectés à l'enseignant
// (indépendant de l'année : le catalogue est réutilisé chaque année)
async function getMesEC(req, res) {
  try {
    const ecs = await modele.listerECDUnEnseignant(req.utilisateur.id);
    return res.json(ecs);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// GET /api/enseignant/statistiques?annee=2025-2026
async function getStatistiques(req, res) {
  try {
    const annee = req.query.annee || modele.anneeUniversitaireCourante();
    const statistiques = await modele.obtenirStatistiquesEnseignant(req.utilisateur.id, annee);
    return res.json(statistiques);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function getNotifications(req, res) {
  try {
    const annee = req.query.annee || modele.anneeUniversitaireCourante();
    const notifications = await modele.obtenirNotificationsEnseignant(req.utilisateur.id, annee);
    return res.json(notifications);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// GET /api/enseignant/ec/:id_EC/etudiants?annee=2025-2026
// Liste des étudiants normalement concernés par cet EC pour l'année
// choisie (ceux dont l'inscription de cette année-là est dans un
// parcours qui contient cet EC), avec leurs notes déjà saisies.
async function getEtudiantsEtNotes(req, res) {
  try {
    const id_enseignant = req.utilisateur.id;
    const id_EC = parseInt(req.params.id_EC, 10);
    const annee = req.query.annee;
    if (!annee) return res.status(400).json({ message: 'Le paramètre "annee" (année universitaire) est requis.' });

    const autorise = await modele.enseignantEstAutorisePourEC(id_enseignant, id_EC);
    if (!autorise) return res.status(403).json({ message: "Vous n'êtes pas affecté à cet élément constitutif." });

    // Une seule requête (LEFT JOIN) au lieu d'une requête par étudiant :
    // évite le pattern N+1, important pour les EC avec beaucoup d'étudiants.
    const id_parcours = req.query.id_parcours ? parseInt(req.query.id_parcours, 10) : null;
    if (req.query.id_parcours && Number.isNaN(id_parcours)) return res.status(400).json({ message: 'Parcours invalide.' });
    const resultat = await modele.listerEtudiantsEtNotesPourECEtAnnee(id_EC, annee, id_parcours);
   // const resultat = await modele.listerEtudiantsEtNotesPourECEtAnnee(id_EC, annee);
    return res.json(resultat);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// GET /api/enseignant/ec/:id_EC/dettes : étudiants en dette sur cet EC
// (ils ne sont pas forcément inscrits cette année dans un parcours qui
// contient cet EC - c'est justement pour cela qu'ils sont en dette)
async function getDettesPourEC(req, res) {
  try {
    const id_enseignant = req.utilisateur.id;
    const id_EC = parseInt(req.params.id_EC, 10);

    const autorise = await modele.enseignantEstAutorisePourEC(id_enseignant, id_EC);
    if (!autorise) return res.status(403).json({ message: "Vous n'êtes pas affecté à cet élément constitutif." });

    const dettes = await modele.listerEtudiantsEnDettePourEC(id_EC);
    return res.json(dettes);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// POST /api/enseignant/notes
// Corps : { numero_etudiant, id_EC, annee_universitaire, note, date_evaluation, type_evaluation }
// L'année universitaire est fournie par le formulaire : cela permet de
// saisir une note pour l'année en cours COMME pour une année passée
// (rattrapage de dette), sans distinction technique particulière.
async function creerNote(req, res) {
  try {
    const id_enseignant = req.utilisateur.id;
    const { numero_etudiant, id_EC, annee_universitaire, note, date_evaluation, type_evaluation } = req.body;

    if (note === undefined || note < 0 || note > 20) {
      return res.status(400).json({ message: 'La note doit être comprise entre 0 et 20.' });
    }
    if (!annee_universitaire) {
      return res.status(400).json({ message: "L'année universitaire est obligatoire." });
    }

    const autorise = await modele.enseignantEstAutorisePourEC(id_enseignant, id_EC);
    if (!autorise) return res.status(403).json({ message: "Vous n'êtes pas affecté à cet élément constitutif." });

    const id_note = await modele.ajouterNote({
      numero_etudiant, id_EC, annee_universitaire, note, date_evaluation, type_evaluation, id_enseignant_saisie: id_enseignant
    });

    return res.status(201).json({ message: 'Note enregistrée.', id_note });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: "Erreur serveur lors de l'enregistrement de la note." });
  }
}

// PUT /api/enseignant/notes/:id_note : modification (uniquement ses propres notes,
// quelle que soit l'année universitaire de la note - y compris une note ancienne)
async function modifierNote(req, res) {
  try {
    const id_enseignant = req.utilisateur.id;
    const id_note = parseInt(req.params.id_note, 10);
    const { note, date_evaluation, type_evaluation } = req.body;

    if (note !== undefined && (note < 0 || note > 20)) {
      return res.status(400).json({ message: 'La note doit être comprise entre 0 et 20.' });
    }

    const ok = await modele.modifierNote(id_note, id_enseignant, { note, date_evaluation, type_evaluation });
    if (!ok) {
      return res.status(403).json({ message: "Modification refusée : cette note n'existe pas ou ne vous appartient pas." });
    }
    return res.json({ message: 'Note modifiée avec succès.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// DELETE /api/enseignant/notes/:id_note
async function supprimerNote(req, res) {
  try {
    const id_enseignant = req.utilisateur.id;
    const id_note = parseInt(req.params.id_note, 10);

    const ok = await modele.supprimerNote(id_note, id_enseignant);
    if (!ok) {
      return res.status(403).json({ message: "Suppression refusée : cette note n'existe pas ou ne vous appartient pas." });
    }
    return res.json({ message: 'Note supprimée avec succès.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = { getProfil, getMesEC, getStatistiques, getNotifications, getEtudiantsEtNotes, getDettesPourEC, creerNote, modifierNote, supprimerNote };

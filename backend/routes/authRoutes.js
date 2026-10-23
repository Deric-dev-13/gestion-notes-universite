// =====================================================================
// routes/authRoutes.js
// -----------------------------------------------------------------
// Un fichier de routes ne fait QUE relier une URL + méthode HTTP à une
// fonction du contrôleur. Toute la logique reste dans le contrôleur.
// =====================================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifierToken } = require('../middleware/authMiddleware');
const { limiteurLogin, limiteurDemandeReinitialisation } = require('../middleware/rateLimiters');

// POST /api/auth/login   { identifiant, mot_de_passe }
router.post('/login', limiteurLogin, authController.login);

// --- Auto-inscription & Outils publics (routes publiques, aucun token requis) ---
// GET /api/auth/parcours : liste des parcours pour le formulaire d'inscription étudiant
router.get('/parcours', authController.listerParcoursPublic);
// GET /api/auth/catalogue-ec : catalogue complet pour le choix des EC enseignant
router.get('/catalogue-ec', authController.listerCatalogueECPublic);
// POST /api/auth/inscription-etudiant   { nom, prenom, date_naissance, email, mot_de_passe, id_parcours }
router.post('/inscription-etudiant', authController.inscrireEtudiant);
// POST /api/auth/inscription-enseignant { nom, prenom, email, mot_de_passe, id_ecs }
router.post('/inscription-enseignant', authController.inscrireEnseignant);
// POST /api/auth/demande-reinitialisation { email, role, mot_de_passe_souhaite }
router.post('/demande-reinitialisation', limiteurDemandeReinitialisation, authController.demanderReinitialisation);
// GET /api/auth/confirmer-reinitialisation/:token : appelée quand l'utilisateur
// clique sur le lien reçu par email ; c'est ce qui déclenche le changement réel.
router.get('/confirmer-reinitialisation/:token', authController.confirmerReinitialisation);

// GET /api/auth/profil  (nécessite d'être connecté)
router.get('/profil', verifierToken, authController.profil);

module.exports = router;

// =====================================================================
// routes/etudiantRoutes.js
// -----------------------------------------------------------------
// Toutes les routes de ce fichier sont protégées : il faut un token
// JWT valide (verifierToken) ET le rôle "etudiant" (autoriserRoles).
// =====================================================================

const express = require('express');
const router = express.Router();
const etudiantController = require('../controllers/etudiantController');
const { verifierToken, autoriserRoles } = require('../middleware/authMiddleware');

// Ces deux middlewares s'appliquent à TOUTES les routes ci-dessous
router.use(verifierToken, autoriserRoles('etudiant'));

router.get('/profil', etudiantController.getProfil);
router.get('/inscriptions', etudiantController.getInscriptions);
router.get('/annees', etudiantController.getAnnees);
router.get('/notes', etudiantController.getNotesEtMoyennes);
router.get('/dettes', etudiantController.getDettes);
router.get('/notifications', etudiantController.getNotifications);

module.exports = router;

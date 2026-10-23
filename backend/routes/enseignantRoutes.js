// =====================================================================
// routes/enseignantRoutes.js
// =====================================================================

const express = require('express');
const router = express.Router();
const enseignantController = require('../controllers/enseignantController');
const { verifierToken, autoriserRoles } = require('../middleware/authMiddleware');

router.use(verifierToken, autoriserRoles('enseignant'));

router.get('/profil', enseignantController.getProfil);
router.get('/mes-ec', enseignantController.getMesEC);
router.get('/statistiques', enseignantController.getStatistiques);
router.get('/notifications', enseignantController.getNotifications);
router.get('/ec/:id_EC/etudiants', enseignantController.getEtudiantsEtNotes);
router.get('/ec/:id_EC/dettes', enseignantController.getDettesPourEC);
router.post('/notes', enseignantController.creerNote);
router.put('/notes/:id_note', enseignantController.modifierNote);
router.delete('/notes/:id_note', enseignantController.supprimerNote);

module.exports = router;

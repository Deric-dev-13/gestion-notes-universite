// =====================================================================
// routes/adminRoutes.js
// =====================================================================

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifierToken, autoriserRoles } = require('../middleware/authMiddleware');

router.use(verifierToken, autoriserRoles('admin'));

router.get('/statistiques', adminController.obtenirStatistiquesAdmin);
router.get('/notifications', adminController.getNotificationsAdmin);

// --- Étudiants ---
router.get('/etudiants', adminController.listerEtudiants);
router.post('/etudiants', adminController.creerEtudiant);
router.put('/etudiants/:id', adminController.modifierEtudiant);
router.put('/etudiants/:id/mot-de-passe', adminController.reinitialiserMotDePasseEtudiant);
router.put('/etudiants/:id/desactiver', adminController.desactiverEtudiant);
router.put('/etudiants/:id/activer', adminController.activerEtudiant);
router.get('/etudiants/:id/inscriptions', adminController.getInscriptionsEtudiant);
router.get('/etudiants/:id/releve', adminController.getReleveEtudiant);
router.get('/etudiants/:id/releve/pdf', adminController.telechargerRelevePDFAdmin);
router.get('/etudiants/:id/dettes', adminController.getDettesEtudiant);

// --- Enseignants ---
router.get('/enseignants', adminController.listerEnseignants);
router.post('/enseignants', adminController.creerEnseignant);
router.put('/enseignants/:id', adminController.modifierEnseignant);
router.put('/enseignants/:id/mot-de-passe', adminController.reinitialiserMotDePasseEnseignant);
router.put('/enseignants/:id/desactiver', adminController.desactiverEnseignant);
router.put('/enseignants/:id/activer', adminController.activerEnseignant);

// --- Parcours ---
router.get('/parcours', adminController.listerParcours);
router.post('/parcours', adminController.creerParcours);
router.put('/parcours/:id', adminController.modifierParcours);
router.delete('/parcours/:id', adminController.supprimerParcours);

// --- UE / EC (catalogue, indépendant de l'année universitaire) ---
router.get('/ue', adminController.listerUE);
router.post('/ue', adminController.creerUE);
router.put('/ue/:id', adminController.modifierUE);
router.delete('/ue/:id', adminController.supprimerUE);
router.post('/ue/:id/rattacher', adminController.rattacherUE);
router.get('/ec', adminController.listerEC);
router.post('/ec', adminController.creerEC);
router.put('/ec/:id', adminController.modifierEC);
router.delete('/ec/:id', adminController.supprimerEC);

// --- Affectations ---
router.post('/affectations/enseignant-ec', adminController.affecterEnseignantAEC);
router.get('/affectations/enseignant-ec', adminController.listerAffectationsEnseignantEC);
router.delete('/affectations/enseignant-ec/:idEnseignant/:idEC', adminController.supprimerAffectationEnseignantEC);
router.post('/affectations/etudiant-parcours', adminController.inscrireEtudiantDansParcours);

// --- Inscriptions par année universitaire (historique L1 -> M2) ---
router.post('/inscriptions', adminController.creerInscription);

// --- Clôture d'année / promotion (Admis, Admis avec dette, Redouble) ---
router.post('/cloture-annee', adminController.cloturerAnnee);
router.get('/cloture-annee-globale/verifier', adminController.verifierClotureAnneeGlobale);
router.post('/cloture-annee-globale', adminController.cloturerAnneeGlobale);

// --- Demandes de réinitialisation de mot de passe (Mot de passe oublié) ---
router.get('/demandes-reinitialisation', adminController.listerDemandesReinitialisation);
router.post('/demandes-reinitialisation/:id/traiter', adminController.traiterDemandeReinitialisation);
router.post('/demandes-reinitialisation/:id/rejeter', adminController.rejeterDemandeReinitialisation);
router.delete('/demandes-reinitialisation/:id', adminController.supprimerDemandeReinitialisation);

module.exports = router;

// =====================================================================
// controllers/authController.js
// -----------------------------------------------------------------
// Rôle : gérer la connexion (login) pour les 3 profils (Étudiant,
// Enseignant, Administrateur). On expose une seule route /login qui
// essaie de retrouver l'identifiant dans les 3 tables, dans un ordre
// précis, puis vérifie le mot de passe avec bcrypt, puis génère un
// token JWT contenant le rôle et l'id de l'utilisateur.
// =====================================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const modele = require('../models');
const { envoyerEmail } = require('../utils/emailSender');

// Génère un token signé, valable JWT_EXPIRES_IN (voir .env)
function genererToken(utilisateur) {
  return jwt.sign(
    { id: utilisateur.id, role: utilisateur.role, email: utilisateur.email, nom: utilisateur.nom },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

async function login(req, res) {
  try {
    const { identifiant, mot_de_passe } = req.body;
    if (!identifiant || !mot_de_passe) {
      return res.status(400).json({ message: 'Identifiant et mot de passe requis.' });
    }

    // 1. On essaie d'abord l'administrateur
    const admin = await modele.trouverAdminParEmail(identifiant);
    if (admin) {
      const motDePasseValide = await bcrypt.compare(mot_de_passe, admin.mot_de_pass_admin);
      if (!motDePasseValide) return res.status(401).json({ message: 'Mot de passe incorrect.' });
      const token = genererToken({ id: admin.id_admin, role: 'admin', email: admin.email_admin, nom: admin.nom_admin });
      return res.json({ token, role: 'admin', nom: admin.nom_admin, prenom: admin.prenom_admin });
    }

    // 2. Puis l'enseignant
    const enseignant = await modele.trouverEnseignantParEmail(identifiant);
    if (enseignant) {
      const motDePasseValide = await bcrypt.compare(mot_de_passe, enseignant.mot_de_pass_enseignant);
      if (!motDePasseValide) return res.status(401).json({ message: 'Mot de passe incorrect.' });
      if (!enseignant.actif) return res.status(403).json({ message: "Compte inactif : soit il est en attente de validation par un administrateur, soit il a été désactivé. Contactez l'administration." });
      const token = genererToken({ id: enseignant.id_enseignant, role: 'enseignant', email: enseignant.email_enseignant, nom: enseignant.nom_enseignant });
      return res.json({ token, role: 'enseignant', nom: enseignant.nom_enseignant, prenom: enseignant.prenom_enseignant });
    }

    // 3. Puis l'étudiant (identifiant = numéro OU email, cahier des charges 3.1)
    const etudiant = await modele.trouverEtudiantParIdentifiant(identifiant);
    if (etudiant) {
      const motDePasseValide = await bcrypt.compare(mot_de_passe, etudiant.mot_de_pass_etudiant);
      if (!motDePasseValide) return res.status(401).json({ message: 'Mot de passe incorrect.' });
      if (!etudiant.actif) return res.status(403).json({ message: "Compte inactif : soit il est en attente de validation par un administrateur, soit il a été désactivé. Contactez l'administration." });
      const token = genererToken({ id: etudiant.numero_etudiant, role: 'etudiant', email: etudiant.email_etudiant, nom: etudiant.nom_etudiant });
      return res.json({ token, role: 'etudiant', nom: etudiant.nom_etudiant, prenom: etudiant.prenom_etudiant });
    }

    // Aucun utilisateur trouvé dans les 3 tables
    return res.status(401).json({ message: 'Identifiant introuvable.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
  }
}

// Renvoie les infos de l'utilisateur actuellement connecté (utile pour le frontend
// afin de savoir quel tableau de bord afficher après un rechargement de page)
async function profil(req, res) {
  return res.json({ utilisateur: req.utilisateur });
}

const TOURS_DE_HASH = 10; // "salt rounds" bcrypt : plus c'est élevé, plus c'est sûr mais lent

// =====================================================================
// AUTO-INSCRIPTION (sans passer par l'administrateur)
// -----------------------------------------------------------------
// Ces routes sont PUBLIQUES (pas de token requis, voir authRoutes.js).
// Un étudiant doit choisir un parcours existant (créé au préalable par
// l'admin) ; un enseignant s'inscrit sans parcours dirigé (l'admin
// pourra l'affecter à des EC ensuite depuis son espace).
// Dans les deux cas, le compte créé est immédiatement utilisable :
// si votre établissement préfère une validation manuelle avant
// activation, il suffit de créer les comptes avec actif = 0 ici et
// de garder l'activation dans l'espace admin (bouton "Activer").
// =====================================================================

// GET /api/auth/parcours : liste publique des parcours, utilisée pour
// peupler le menu déroulant du formulaire d'inscription étudiant.
async function listerParcoursPublic(req, res) {
  try {
    const parcours = await modele.listerParcours();
    // On ne renvoie que les champs utiles, pas de données sensibles
    return res.json(parcours.map((p) => ({ id_parcours: p.id_parcours, nom_parcours: p.nom_parcours, niveau: p.niveau, mention: p.mention })));
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// GET /api/auth/catalogue-ec : catalogue public complet (parcours, niveau, UE, EC)
// pour permettre le choix des EC lors de l'inscription des enseignants.
async function listerCatalogueECPublic(req, res) {
  try {
    const ecs = await modele.listerCatalogueECComplet();
    return res.json(ecs);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// POST /api/auth/inscription-etudiant
async function inscrireEtudiant(req, res) {
  try {
    const { nom, prenom, date_naissance, lieu_naissance, sexe, cin, tel_etudiant, email, mot_de_passe, id_parcours, annee_universitaire } = req.body;

    if (!nom || !prenom || !sexe || !email || !mot_de_passe || !id_parcours || !annee_universitaire) {
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent être renseignés (nom, prénom, sexe, email, mot de passe, parcours et année universitaire).' });
    }
    const correspondanceAnnee = /^([0-9]{4})-([0-9]{4})$/.exec(annee_universitaire.trim());
    if (!correspondanceAnnee || Number(correspondanceAnnee[2]) !== Number(correspondanceAnnee[1]) + 1) {
      return res.status(400).json({ message: "L'année universitaire doit être au format AAAA-AAAA (exemple : 2025-2026)." });
    }
    if (mot_de_passe.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const contacts = await modele.verifierContactsDejaUtilises({ cin, telephone: tel_etudiant });
    if (contacts.cinUtilise) return res.status(409).json({ message: 'Cette CIN est déjà utilisée.' });
    if (contacts.telephoneUtilise) return res.status(409).json({ message: 'Ce téléphone est déjà utilisé.' });

    const hash = await bcrypt.hash(mot_de_passe, TOURS_DE_HASH);
    const numero = await modele.creerEtudiant({ nom, prenom, date_naissance: date_naissance || null, lieu_naissance: lieu_naissance || null, sexe, cin: cin || null, tel_etudiant: tel_etudiant || null, email, mot_de_passe_hash: hash, id_parcours, actif: 0 });

    await modele.creerInscription({ numero_etudiant: numero, id_parcours, annee_universitaire: annee_universitaire.trim(), statut: 'En cours' });

    return res.status(201).json({
      message: "Votre demande d'inscription a été enregistrée. Un administrateur doit valider votre compte avant que vous puissiez vous connecter."
    });
  } catch (erreur) {
    if (erreur.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'inscription.' });
  }
}

// POST /api/auth/inscription-enseignant
async function inscrireEnseignant(req, res) {
  try {
    const { nom, prenom, sexe, matricule, date_naissance, cin, tel_enseignant, diplome, grade, specialite, mention_etabisement_attache, role_responsabilite, id_parcours_responsabilite, email, mot_de_passe, id_ecs, ecs } = req.body;

    if (!nom || !prenom || !sexe || !matricule || !email || !mot_de_passe) {
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent être renseignés (nom, prénom, sexe, matricule, email, mot de passe).' });
    }
    if (mot_de_passe.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const contacts = await modele.verifierContactsDejaUtilises({ cin, telephone: tel_enseignant });
    if (contacts.cinUtilise) return res.status(409).json({ message: 'Cette CIN est déjà utilisée.' });
    if (contacts.telephoneUtilise) return res.status(409).json({ message: 'Ce téléphone est déjà utilisé.' });

    const hash = await bcrypt.hash(mot_de_passe, TOURS_DE_HASH);
    // id_parcours_responsabilite arrive du formulaire comme un TABLEAU
    // d'IDs (plusieurs parcours/mentions peuvent être cochés à la fois).
    const idEnseignant = await modele.creerEnseignant({ nom, prenom, sexe, matricule, date_naissance: date_naissance || null, cin: cin || null, tel_enseignant: tel_enseignant || null, diplome: diplome || null, grade: grade || null, specialite: specialite || null, mention_etabisement_attache: mention_etabisement_attache || null, role_responsabilite_demande: role_responsabilite || null, id_parcours_responsabilite_demande: Array.isArray(id_parcours_responsabilite) ? id_parcours_responsabilite : [], email, mot_de_passe_hash: hash, id_parcours: null, actif: 0 });

    // Affectation automatique aux ECs sélectionnés lors de l'inscription
    const listeEC = Array.isArray(id_ecs) ? id_ecs : (Array.isArray(ecs) ? ecs : []);
    for (const ecId of listeEC) {
      const idInt = parseInt(ecId, 10);
      if (!isNaN(idInt)) {
        await modele.affecterEnseignantAEC(idEnseignant, idInt);
      }
    }

    return res.status(201).json({
      message: "Votre demande d'inscription avec vos ECs choisis a été enregistrée. Un administrateur doit valider votre compte avant que vous puissiez vous connecter."
    });
  } catch (erreur) {
    if (erreur.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'inscription.' });
  }
}

// POST /api/auth/demande-reinitialisation
// -----------------------------------------------------------------
// Réinitialisation en libre-service : pas de validation admin.
// 1. On vérifie que le compte existe.
// 2. On crée la demande avec un token secret à usage unique (valable
//    1h) et on envoie IMMÉDIATEMENT un email contenant un lien de
//    confirmation vers le frontend.
// 3. Le mot de passe n'est changé QUE si l'utilisateur clique ce lien
//    (voir confirmerReinitialisation ci-dessous). Sans clic, rien ne
//    change : ça garantit que c'est bien le propriétaire de la boîte
//    mail qui a demandé la réinitialisation, pas quelqu'un qui a juste
//    deviné/connaît son adresse email.
async function demanderReinitialisation(req, res) {
  try {
    const { email, role, mot_de_passe_souhaite } = req.body;
    if (!email || !role || !mot_de_passe_souhaite) {
      return res.status(400).json({ message: 'Email, rôle et nouveau mot de passe souhaité sont requis.' });
    }
    if (mot_de_passe_souhaite.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    // Vérifier que le compte existe bien
    let compte = null;
    if (role === 'etudiant') {
      compte = await modele.trouverEtudiantParIdentifiant(email);
    } else if (role === 'enseignant') {
      compte = await modele.trouverEnseignantParEmail(email);
    } else if (role === 'admin') {
      compte = await modele.trouverAdminParEmail(email);
    }

    if (!compte) {
      return res.status(404).json({ message: 'Aucun compte trouvé avec cette adresse email pour ce rôle.' });
    }

    const { id_demande, token } = await modele.creerDemandeReinitialisation({
      email: email.trim(),
      role,
      mot_de_passe_souhaite
    });

    // Lien pointant vers la page frontend qui confirmera côté serveur.
    // FRONTEND_URL doit être défini dans .env (ex: http://localhost:5500
    // en développement, ou https://votre-domaine en production).
    const baseFrontend = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const lienConfirmation = `${baseFrontend}/confirmer-reinitialisation.html?token=${token}`;

    try {
      await envoyerEmail({
        destinataire: email.trim(),
        sujet: 'Confirmez la réinitialisation de votre mot de passe',
        texte:
          `Bonjour,\n\n` +
          `Une demande de réinitialisation de mot de passe a été faite pour votre compte (${role}) ` +
          `sur la plateforme de Gestion de Notes.\n\n` +
          `Si c'est bien vous, cliquez sur le lien suivant pour confirmer et activer votre nouveau mot de passe ` +
          `(valable 1 heure) :\n${lienConfirmation}\n\n` +
          `Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email : ` +
          `votre mot de passe actuel restera inchangé tant que vous n'aurez pas cliqué sur ce lien.\n`
      });
    } catch (erreurEmail) {
      console.error("Échec d'envoi de l'email de confirmation :", erreurEmail);
      // On annule la demande : sans email envoyé, l'utilisateur n'a aucun
      // moyen de la confirmer, autant éviter de laisser une demande orpheline.
      await modele.supprimerDemandeReinitialisation(id_demande);
      return res.status(502).json({ message: "Votre demande a bien été reçue mais l'email de confirmation n'a pas pu être envoyé. Réessayez plus tard ou contactez l'administration." });
    }

    return res.status(201).json({
      message: "Un email de confirmation vous a été envoyé. Cliquez sur le lien qu'il contient pour activer votre nouveau mot de passe (valable 1 heure). Si vous ne cliquez pas, votre mot de passe actuel ne sera pas modifié."
    });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur lors de la demande de réinitialisation.' });
  }
}

// GET /api/auth/confirmer-reinitialisation/:token
// -----------------------------------------------------------------
// Appelée par la page frontend confirmer-reinitialisation.html quand
// l'utilisateur clique sur le lien reçu par email. C'est CE clic, et
// uniquement lui, qui déclenche le changement réel du mot de passe.
async function confirmerReinitialisation(req, res) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ message: 'Lien de confirmation invalide.' });
    }

    const resultat = await modele.confirmerReinitialisationParToken(token);

    return res.json({
      message: `Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.`,
      role: resultat.role
    });
  } catch (erreur) {
    // Erreurs "attendues" (lien déjà utilisé, expiré, invalide...) :
    // pas de status 500, on renvoie un message clair à afficher tel quel.
    const codesConnus = ['TOKEN_INTROUVABLE', 'DEJA_TRAITE', 'REJETE', 'EXPIRE'];
    if (codesConnus.includes(erreur.code)) {
      return res.status(410).json({ message: erreur.message });
    }
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur lors de la confirmation.' });
  }
}

module.exports = {
  login,
  profil,
  listerParcoursPublic,
  listerCatalogueECPublic,
  inscrireEtudiant,
  inscrireEnseignant,
  demanderReinitialisation,
  confirmerReinitialisation
};


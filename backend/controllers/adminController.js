// =====================================================================
// controllers/adminController.js
// -----------------------------------------------------------------
// Espace Administrateur (cahier des charges 3.3) :
//  - Gestion complète des utilisateurs (création, modification,
//    réinitialisation mot de passe, désactivation)
//  - Gestion de la structure académique (parcours, EC)
//  - Affectation enseignants <-> EC, inscription étudiants <-> parcours
// =====================================================================

const bcrypt = require('bcrypt');
const modele = require('../models');
const { envoyerEmail } = require('../utils/emailSender');

const TOURS_DE_HASH = 10; // "salt rounds" bcrypt : plus c'est élevé, plus c'est sûr mais lent

// ---------------------------------------------------------------------
// UTILISATEURS - ÉTUDIANTS
// ---------------------------------------------------------------------

async function listerEtudiants(req, res) {
  try {
    const etudiants = await modele.listerEtudiants(req.query.id_parcours || null);
    return res.json(etudiants);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function creerEtudiant(req, res) {
  try {
    const { nom, prenom, date_naissance, lieu_naissance, sexe, cin, tel_etudiant, email, mot_de_passe, id_parcours, annee_universitaire } = req.body;
    if (!nom || !prenom || !sexe || !email || !mot_de_passe || !id_parcours) {
      return res.status(400).json({ message: 'Nom, prénom, sexe, email, mot de passe et parcours sont obligatoires.' });
    }
    const hash = await bcrypt.hash(mot_de_passe, TOURS_DE_HASH);
    const id = await modele.creerEtudiant({ nom, prenom, date_naissance: date_naissance || null, lieu_naissance: lieu_naissance || null, sexe, cin: cin || null, tel_etudiant: tel_etudiant || null, email, mot_de_passe_hash: hash, id_parcours });
    // On crée directement son inscription pour l'année universitaire choisie
    // (ou l'année en cours par défaut), afin qu'il ait un relevé calculable.
    await modele.creerInscription({
      numero_etudiant: id, id_parcours,
      annee_universitaire: annee_universitaire || modele.anneeUniversitaireCourante(),
      statut: 'En cours'
    });
    return res.status(201).json({ message: 'Étudiant créé.', numero_etudiant: id });
  } catch (erreur) {
    if (erreur.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Cet email, CIN ou matricule est déjà utilisé.' });
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function modifierEtudiant(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const champs = { ...req.body };
    delete champs.mot_de_passe; // le mot de passe se change via la route dédiée ci-dessous
    await modele.modifierEtudiant(id, champs);
    return res.json({ message: 'Étudiant mis à jour.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// PUT /api/admin/etudiants/:id/reinitialiser-mot-de-passe
async function reinitialiserMotDePasseEtudiant(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { nouveau_mot_de_passe } = req.body;
    if (!nouveau_mot_de_passe || nouveau_mot_de_passe.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }
    const hash = await bcrypt.hash(nouveau_mot_de_passe, TOURS_DE_HASH);
    await modele.modifierEtudiant(id, { mot_de_pass_etudiant: hash });
    return res.json({ message: 'Mot de passe réinitialisé.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// PUT /api/admin/etudiants/:id/desactiver
async function desactiverEtudiant(req, res) {
  try {
    await modele.desactiverEtudiant(parseInt(req.params.id, 10));
    return res.json({ message: 'Compte étudiant désactivé.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// PUT /api/admin/etudiants/:id/activer
async function activerEtudiant(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const contact = await modele.obtenirContactEtudiant(id);
    if (!contact) return res.status(404).json({ message: 'Étudiant introuvable.' });
    await modele.activerEtudiant(id);
    try {
      await envoyerEmail({
        destinataire: contact.email,
        sujet: 'Activation de votre compte Gestion de Notes',
        texte: `Bonjour ${contact.prenom || ''},\n\nBonne nouvelle : votre compte étudiant est maintenant activé. Vous pouvez accéder à votre espace Gestion de Notes avec vos identifiants habituels.\n\nBienvenue sur la plateforme.\n\nCordialement,\nL'administration universitaire.`
      });
    } catch (erreurEmail) {
      await modele.desactiverEtudiant(id);
      throw erreurEmail;
    }
    return res.json({ message: 'Compte étudiant activé et email envoyé automatiquement.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// ---------------------------------------------------------------------
// UTILISATEURS - ENSEIGNANTS
// ---------------------------------------------------------------------

async function listerEnseignants(req, res) {
  try {
    const enseignants = await modele.listerEnseignants();
    return res.json(enseignants);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function creerEnseignant(req, res) {
  try {
    const { nom, prenom, sexe, matricule, date_naissance, cin, tel_enseignant, diplome, grade, specialite, mention_etabisement_attache, email, mot_de_passe, id_parcours } = req.body;
    if (!nom || !prenom || !sexe || !matricule || !email || !mot_de_passe) {
      return res.status(400).json({ message: 'Nom, prénom, sexe, matricule, email et mot de passe sont obligatoires.' });
    }
    const hash = await bcrypt.hash(mot_de_passe, TOURS_DE_HASH);
    const id = await modele.creerEnseignant({ nom, prenom, sexe, matricule, date_naissance: date_naissance || null, cin: cin || null, tel_enseignant: tel_enseignant || null, diplome: diplome || null, grade: grade || null, specialite: specialite || null, mention_etabisement_attache: mention_etabisement_attache || null, email, mot_de_passe_hash: hash, id_parcours });
    return res.status(201).json({ message: 'Enseignant créé.', id_enseignant: id });
  } catch (erreur) {
    if (erreur.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function modifierEnseignant(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const champs = { ...req.body };
    delete champs.mot_de_passe;
    await modele.modifierEnseignant(id, champs);
    return res.json({ message: 'Enseignant mis à jour.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function reinitialiserMotDePasseEnseignant(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { nouveau_mot_de_passe } = req.body;
    if (!nouveau_mot_de_passe || nouveau_mot_de_passe.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }
    const hash = await bcrypt.hash(nouveau_mot_de_passe, TOURS_DE_HASH);
    await modele.modifierEnseignant(id, { mot_de_pass_enseignant: hash });
    return res.json({ message: 'Mot de passe réinitialisé.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function desactiverEnseignant(req, res) {
  try {
    await modele.desactiverEnseignant(parseInt(req.params.id, 10));
    return res.json({ message: 'Compte enseignant désactivé.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// PUT /api/admin/enseignants/:id/activer
async function activerEnseignant(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const contact = await modele.obtenirContactEnseignant(id);
    if (!contact) return res.status(404).json({ message: 'Enseignant introuvable.' });
    await modele.activerEnseignant(id);
    try {
      await envoyerEmail({
        destinataire: contact.email,
        sujet: 'Activation de votre compte Gestion de Notes',
        texte: `Bonjour ${contact.prenom || ''},\n\nBonne nouvelle : votre compte enseignant est maintenant activé. Vous pouvez accéder à votre espace Gestion de Notes avec vos identifiants habituels.\n\nBienvenue sur la plateforme.\n\nCordialement,\nL'administration universitaire.`
      });
    } catch (erreurEmail) {
      await modele.desactiverEnseignant(id);
      throw erreurEmail;
    }
    return res.json({ message: 'Compte enseignant activé et email envoyé automatiquement.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// ---------------------------------------------------------------------
// STRUCTURE ACADÉMIQUE - PARCOURS
// ---------------------------------------------------------------------

async function listerParcours(req, res) {
  try {
    return res.json(await modele.listerParcours());
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function creerParcours(req, res) {
  try {
    const { nom_parcours, niveau, mention, id_directeur, id_responsable_mention } = req.body;
    if (!nom_parcours || !niveau || !mention) {
      return res.status(400).json({ message: 'Champs obligatoires manquants.' });
    }
    const id = await modele.creerParcours({ nom_parcours, niveau, mention, id_directeur, id_responsable_mention });
    return res.status(201).json({ message: 'Parcours créé.', id_parcours: id });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function modifierParcours(req, res) {
  try {
    await modele.modifierParcours(parseInt(req.params.id, 10), req.body);
    return res.json({ message: 'Parcours mis à jour.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function supprimerParcours(req, res) {
  try {
    await modele.supprimerParcours(parseInt(req.params.id, 10));
    return res.json({ message: 'Parcours supprimé.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur (le parcours contient peut-être encore des étudiants).' });
  }
}

// ---------------------------------------------------------------------
// STRUCTURE ACADÉMIQUE - UE et EC
// ---------------------------------------------------------------------

async function listerUE(req, res) {
  try {
    return res.json(await modele.listerUE());
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function creerUE(req, res) {
  try {
    const { code_UE, nom_UE, coefficient, niveau, semestre, id_parcours } = req.body;
    if (!nom_UE || !coefficient || !niveau || !semestre) {
      return res.status(400).json({ message: 'Champs obligatoires manquants (nom, coefficient, niveau, semestre).' });
    }
    const id = await modele.creerUE({ code_UE, nom_UE, coefficient, niveau, semestre });
    if (id_parcours) await modele.rattacherUEAuParcours(id_parcours, id);
    return res.status(201).json({ message: 'UE créée.', id_UE: id });
  } catch (erreur) {
    if (erreur.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ce code UE existe déjà.' });
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// POST /api/admin/ue/:id/rattacher { id_parcours } : rattache une UE existante à un parcours de plus
async function rattacherUE(req, res) {
  try {
    const id_UE = parseInt(req.params.id, 10);
    const { id_parcours } = req.body;
    if (!id_parcours) return res.status(400).json({ message: 'id_parcours requis.' });
    await modele.rattacherUEAuParcours(id_parcours, id_UE);
    return res.json({ message: 'UE rattachée au parcours.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function modifierUE(req, res) {
  try {
    await modele.modifierUE(parseInt(req.params.id, 10), req.body);
    return res.json({ message: 'UE mise à jour.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function supprimerUE(req, res) {
  try {
    await modele.supprimerUE(parseInt(req.params.id, 10));
    return res.json({ message: 'UE supprimée.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur (l’UE contient peut-être encore des EC).' });
  }
}

async function listerEC(req, res) {
  try {
    return res.json(await modele.listerEC());
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function creerEC(req, res) {
  try {
    const { nom_EC, credit, id_UE } = req.body;
    if (!nom_EC || !credit || !id_UE) {
      return res.status(400).json({ message: 'Champs obligatoires manquants (nom, crédit, UE).' });
    }
    const id = await modele.creerEC({ nom_EC, credit, id_UE });
    return res.status(201).json({ message: 'Élément constitutif créé.', id_EC: id });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function modifierEC(req, res) {
  try {
    await modele.modifierEC(parseInt(req.params.id, 10), req.body);
    return res.json({ message: 'Élément constitutif mis à jour.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function supprimerEC(req, res) {
  try {
    await modele.supprimerEC(parseInt(req.params.id, 10));
    return res.json({ message: 'Élément constitutif supprimé.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// ---------------------------------------------------------------------
// AFFECTATIONS
// ---------------------------------------------------------------------

// POST /api/admin/affectations/enseignant-ec { id_enseignant, id_EC }
async function affecterEnseignantAEC(req, res) {
  try {
    const { id_enseignant, id_EC } = req.body;
    if (!id_enseignant || !id_EC) return res.status(400).json({ message: 'id_enseignant et id_EC requis.' });
    await modele.affecterEnseignantAEC(id_enseignant, id_EC);
    return res.status(201).json({ message: 'Enseignant affecté à cet élément constitutif.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function listerAffectationsEnseignantEC(req, res) {
  try {
    return res.json(await modele.listerAffectationsEnseignantEC());
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function supprimerAffectationEnseignantEC(req, res) {
  try {
    const id_enseignant = parseInt(req.params.idEnseignant, 10);
    const id_EC = parseInt(req.params.idEC, 10);
    if (!id_enseignant || !id_EC) return res.status(400).json({ message: 'Identifiants d\'affectation invalides.' });
    await modele.supprimerAffectationEnseignantEC(id_enseignant, id_EC);
    return res.json({ message: 'Affectation annulée.' });
  } catch (erreur) {
    console.error(erreur);
    if (erreur.code === 'ER_ROW_IS_REFERENCED_2' || erreur.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ message: 'Cette affectation ne peut pas être annulée car elle est déjà utilisée dans des notes.' });
    }
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

async function obtenirStatistiquesAdmin(req, res) {
  try {
    return res.json(await modele.obtenirStatistiquesAdmin());
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// L'inscription "rapide" d'un étudiant dans un parcours (change juste son
// parcours actuel) - utile pour une simple correction administrative,
// ex: erreur de filière à la création du compte.
//
// IMPORTANT : en plus de mettre à jour ETUDIANT.id_parcours (le parcours
// "actuel" affiché sur le profil), on répercute aussi ce changement sur
// la ligne INSCRIPTION de l'année universitaire EN COURS de cet
// étudiant. Sans cela, la table ETUDIANT et la table INSCRIPTION se
// désynchronisent : le profil affiche le nouveau parcours, mais
// l'historique des inscriptions et le relevé de notes (qui, eux, sont
// calculés à partir de INSCRIPTION - voir calculerReleveAnnee)
// continuent d'afficher l'ancien parcours pour l'année en cours.
async function inscrireEtudiantDansParcours(req, res) {
  try {
    const { numero_etudiant, id_parcours } = req.body;
    if (!numero_etudiant || !id_parcours) return res.status(400).json({ message: 'numero_etudiant et id_parcours requis.' });

    await modele.modifierEtudiant(numero_etudiant, { id_parcours });

    // On retrouve l'inscription la plus récente de l'étudiant (son
    // année universitaire "en cours") et on la met à jour avec le
    // nouveau parcours, pour que l'historique et le relevé restent
    // cohérents avec le profil.
    const courante = await modele.inscriptionCourante(numero_etudiant);
    if (courante) {
      await modele.creerInscription({
        numero_etudiant,
        id_parcours,
        annee_universitaire: courante.annee_universitaire,
        statut: courante.statut,
      });
    }

    return res.json({ message: 'Étudiant inscrit dans le parcours.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// ---------------------------------------------------------------------
// INSCRIPTIONS PAR ANNEE UNIVERSITAIRE (historique L1 -> M2)
// ---------------------------------------------------------------------

// POST /api/admin/inscriptions { numero_etudiant, id_parcours, annee_universitaire, statut? }
// Crée (ou met à jour) la ligne d'inscription de l'étudiant pour une
// année universitaire donnée. C'est ce qui permet de garder tout
// l'historique de sa progression (une ligne par année).
async function creerInscription(req, res) {
  try {
    const { numero_etudiant, id_parcours, annee_universitaire, statut } = req.body;
    if (!numero_etudiant || !id_parcours || !annee_universitaire) {
      return res.status(400).json({ message: 'numero_etudiant, id_parcours et annee_universitaire sont requis.' });
    }
    await modele.creerInscription({ numero_etudiant, id_parcours, annee_universitaire, statut });
    // Si c'est l'inscription la plus récente, on met aussi à jour le parcours "actuel" affiché sur le compte
    const courante = await modele.inscriptionCourante(numero_etudiant);
    if (courante && courante.annee_universitaire === annee_universitaire) {
      await modele.modifierEtudiant(numero_etudiant, { id_parcours });
    }
    return res.status(201).json({ message: 'Inscription enregistrée.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// GET /api/admin/etudiants/:id/inscriptions : historique complet d'un étudiant
async function getInscriptionsEtudiant(req, res) {
  try {
    const inscriptions = await modele.listerInscriptionsEtudiant(parseInt(req.params.id, 10));
    return res.json(inscriptions);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// GET /api/admin/etudiants/:id/releve?annee=... : relevé (2 sessions) d'un étudiant pour une année
async function getReleveEtudiant(req, res) {
  try {
    const numero = parseInt(req.params.id, 10);
    const { annee } = req.query;
    if (!annee) return res.status(400).json({ message: 'Le paramètre "annee" est requis.' });
    const releve = await modele.calculerReleveAnnee(numero, annee);
    if (!releve) return res.status(404).json({ message: 'Aucune inscription trouvée pour cette année.' });
    return res.json(releve);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// ---------------------------------------------------------------------
// CLOTURE D'ANNEE / PROMOTION
// ---------------------------------------------------------------------

// POST /api/admin/cloture-annee
// Corps : { numero_etudiant, annee_universitaire, id_parcours_suivant, annee_universitaire_suivante }
// Calcule le résultat final de l'année (session rattrapage), détermine
// Admis / Admis avec dette / Redouble, ouvre les dettes nécessaires, et
// inscrit l'étudiant pour l'année suivante dans le parcours choisi.
async function cloturerAnnee(req, res) {
  try {
    const { numero_etudiant, annee_universitaire, id_parcours_suivant, annee_universitaire_suivante } = req.body;
    if (!numero_etudiant || !annee_universitaire) {
      return res.status(400).json({ message: 'numero_etudiant et annee_universitaire sont requis.' });
    }
    const resultat = await modele.cloturerAnneeEtudiant({
      numero_etudiant, annee_universitaire, id_parcours_suivant, annee_universitaire_suivante
    });
    return res.json({
      message: `Année clôturée : ${resultat.statutFinal}.`,
      statut: resultat.statutFinal,
      dettes_ouvertes: resultat.dettesOuvertes
    });
  } catch (erreur) {
    console.error(erreur);
    return res.status(400).json({ message: erreur.message || 'Erreur lors de la clôture de l\'année.' });
  }
}

// GET /api/admin/cloture-annee-globale/verifier?annee=AAAA-AAAA
async function verifierClotureAnneeGlobale(req, res) {
  try {
    const annee_universitaire = (req.query.annee || '').trim();
    if (!annee_universitaire) {
      return res.status(400).json({ message: "L'année universitaire est obligatoire." });
    }
    const etudiantsSansNote = await modele.verifierEtudiantsSansNote(annee_universitaire);
    return res.json({
      annee_universitaire,
      etudiants_sans_note: etudiantsSansNote,
      total_sans_note: etudiantsSansNote.length
    });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur lors de la vérification des notes.' });
  }
}

// POST /api/admin/cloture-annee-globale { annee_universitaire, confirmer_sans_note? }
async function cloturerAnneeGlobale(req, res) {
  try {
    const { annee_universitaire, confirmer_sans_note = false } = req.body;
    if (!annee_universitaire) {
      return res.status(400).json({ message: "L'année universitaire est obligatoire." });
    }
    const etudiantsSansNote = await modele.verifierEtudiantsSansNote(annee_universitaire);
    if (etudiantsSansNote.length > 0 && !confirmer_sans_note) {
      return res.status(409).json({
        message: `${etudiantsSansNote.length} étudiant(s) inscrit(s) n'ont aucune note pour cette année. Vérifiez-les avant de confirmer la clôture.`,
        etudiants_sans_note: etudiantsSansNote,
        total_sans_note: etudiantsSansNote.length,
        confirmation_requise: true
      });
    }
    const rapport = await modele.cloturerAnneeGlobale(annee_universitaire);
    return res.json({
      message: `Clôture de l'année ${annee_universitaire} effectuée avec succès : ${rapport.admis} admis, ${rapport.admis_avec_dette} admis avec dette, ${rapport.redouble} redoublants.`,
      rapport
    });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: erreur.message || 'Erreur lors de la clôture globale.' });
  }
}

// ---------------------------------------------------------------------
// DEMANDES DE RÉINITIALISATION DE MOT DE PASSE (MOT DE PASSE OUBLIÉ)
// ---------------------------------------------------------------------

async function getNotificationsAdmin(req, res) {
  try {
    return res.json(await modele.obtenirNotificationsAdmin());
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// GET /api/admin/demandes-reinitialisation?statut=En attente
async function listerDemandesReinitialisation(req, res) {
  try {
    const statut = req.query.statut || null;
    const demandes = await modele.listerDemandesReinitialisation(statut);
    return res.json(demandes);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// POST /api/admin/demandes-reinitialisation/:id/traiter
async function traiterDemandeReinitialisation(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const resultat = await modele.traiterDemandeReinitialisation(id);
    const titreRole = resultat.role === 'enseignant' ? 'enseignant' : resultat.role === 'etudiant' ? 'étudiant' : 'administrateur';
    await envoyerEmail({
      destinataire: resultat.email,
      sujet: 'Nouveau mot de passe pour votre compte Gestion de Notes',
      texte: `Bonjour,\n\nLe mot de passe de votre compte ${titreRole} vient d'être modifié à la suite de votre demande.\n\nVotre nouveau mot de passe temporaire est : ${resultat.mot_de_passe_souhaite}\n\nPour protéger votre compte, connectez-vous puis choisissez un nouveau mot de passe personnel.\n\nCordialement,\nL'administration universitaire.`
    });
    await modele.marquerDemandeReinitialisationTraitee(id);
    return res.json({
      message: `Mot de passe réinitialisé et email envoyé automatiquement à ${resultat.email}.`
    });
  } catch (erreur) {
    console.error(erreur);
    return res.status(400).json({ message: erreur.message || 'Erreur lors du traitement de la demande.' });
  }
}

// POST /api/admin/demandes-reinitialisation/:id/rejeter
async function rejeterDemandeReinitialisation(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    await modele.rejeterDemandeReinitialisation(id);
    return res.json({ message: 'Demande rejetée.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

// DELETE /api/admin/demandes-reinitialisation/:id
async function supprimerDemandeReinitialisation(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    await modele.supprimerDemandeReinitialisation(id);
    return res.json({ message: 'Demande de réinitialisation supprimée.' });
  } catch (erreur) {
    console.error(erreur);
    return res.status(400).json({ message: erreur.message || 'Erreur lors de la suppression de la demande.' });
  }
}

// ---------------------------------------------------------------------
// TÉLÉCHARGEMENT RELEVÉ PDF (VUE ADMIN)
// ---------------------------------------------------------------------
const { genererPDFReleve } = require('../utils/pdfGenerator');
const { pool } = require('../config/db');

// GET /api/admin/etudiants/:id/releve/pdf?annee=...&session=normale|rattrapage
async function telechargerRelevePDFAdmin(req, res) {
  try {
    const numero = parseInt(req.params.id, 10);
    const session = req.query.session === 'rattrapage' ? 'rattrapage' : 'normale';
    const { annee } = req.query;
    const semestre = req.query.semestre ? String(req.query.semestre).toUpperCase() : null;

    if (!annee) return res.status(400).json({ message: 'Le paramètre "annee" est requis.' });
    if (semestre && !/^S(10|[1-9])$/.test(semestre)) {
      return res.status(400).json({ message: 'Semestre invalide (S1 à S10).' });
    }

    const [infosRows] = await pool.query(
      `SELECT nom_etudiant, prenom_etudiant, numero_etudiant, date_naissance, lieu_naissance FROM ETUDIANT WHERE numero_etudiant = ?`,
      [numero]
    );
    if (infosRows.length === 0) return res.status(404).json({ message: 'Étudiant introuvable.' });
    const infos = infosRows[0];

    const releve = await modele.calculerReleveAnnee(numero, annee);
    if (!releve) return res.status(404).json({ message: "Aucune inscription trouvée pour cette année universitaire." });

    if (semestre && !(releve.semestres && releve.semestres[semestre])) {
      return res.status(404).json({ message: `Aucun résultat pour le semestre ${semestre}.` });
    }

    return genererPDFReleve({
      res,
      infosEtudiant: infos,
      annee,
      session,
      semestre,
      releve
    });
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur lors de la génération du PDF.' });
  }
}

// GET /api/admin/etudiants/:id/dettes : dettes d'un étudiant (vue admin)
async function getDettesEtudiant(req, res) {
  try {
    const dettes = await modele.listerDettesEtudiant(parseInt(req.params.id, 10));
    return res.json(dettes);
  } catch (erreur) {
    console.error(erreur);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
}

module.exports = {
  listerEtudiants, creerEtudiant, modifierEtudiant, reinitialiserMotDePasseEtudiant, desactiverEtudiant, activerEtudiant,
  listerEnseignants, creerEnseignant, modifierEnseignant, reinitialiserMotDePasseEnseignant, desactiverEnseignant, activerEnseignant,
  listerParcours, creerParcours, modifierParcours, supprimerParcours,
  listerUE, creerUE, modifierUE, supprimerUE, rattacherUE,
  listerEC, creerEC, modifierEC, supprimerEC,
  affecterEnseignantAEC, listerAffectationsEnseignantEC, supprimerAffectationEnseignantEC, obtenirStatistiquesAdmin, inscrireEtudiantDansParcours,
  creerInscription, getInscriptionsEtudiant, getReleveEtudiant, telechargerRelevePDFAdmin,
  cloturerAnnee, verifierClotureAnneeGlobale, cloturerAnneeGlobale, getDettesEtudiant,
  listerDemandesReinitialisation, traiterDemandeReinitialisation, rejeterDemandeReinitialisation, supprimerDemandeReinitialisation, getNotificationsAdmin
};


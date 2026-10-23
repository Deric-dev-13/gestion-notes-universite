// =====================================================================
// middleware/authMiddleware.js
// -----------------------------------------------------------------
// Un "middleware" Express est une fonction qui s'exécute AVANT le
// contrôleur, sur le chemin (req, res, next). Ici on l'utilise pour
// deux choses :
//   1. verifierToken   -> vérifie que la requête contient un JWT valide
//   2. autoriserRoles   -> vérifie que le rôle de l'utilisateur connecté
//                          a le droit d'accéder à cette route
// =====================================================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Étape 1 : le client doit envoyer le token dans l'en-tête HTTP :
//   Authorization: Bearer <token>
function verifierToken(req, res, next) {
  const enTete = req.headers['authorization'];
  if (!enTete || !enTete.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Accès refusé : token manquant.' });
  }

  const token = enTete.split(' ')[1];

  try {
    // jwt.verify décode le token ET vérifie sa signature/expiration.
    // Si le token a été modifié ou a expiré, une erreur est levée.
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.utilisateur = payload; // { id, role, email } -> disponible dans tous les contrôleurs suivants
    next(); // on passe la main au middleware/contrôleur suivant
  } catch (erreur) {
    return res.status(403).json({ message: 'Token invalide ou expiré.' });
  }
}

// Étape 2 : restreint l'accès à certains rôles.
// Utilisation : autoriserRoles('admin', 'enseignant')
function autoriserRoles(...rolesAutorises) {
  return (req, res, next) => {
    if (!req.utilisateur || !rolesAutorises.includes(req.utilisateur.role)) {
      return res.status(403).json({ message: "Accès refusé : rôle insuffisant pour cette action." });
    }
    next();
  };
}

module.exports = { verifierToken, autoriserRoles };

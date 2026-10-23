// =====================================================================
// middleware/rateLimiters.js
// -----------------------------------------------------------------
// Limite le nombre de tentatives de connexion par IP, pour empêcher le
// brute-force de mots de passe. Sans ça, rien n'empêche un script
// d'essayer des milliers de combinaisons par minute contre un compte.
// =====================================================================

const rateLimit = require('express-rate-limit');

const limiteurLogin = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  limit: 10,                // 10 tentatives par IP dans cette fenêtre
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes(au moins 1 minute).' }
});

const limiteurDemandeReinitialisation = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de demandes de réinitialisation depuis cette adresse. Réessayez plus tard.(au moins 1h)' }
});

module.exports = { limiteurLogin, limiteurDemandeReinitialisation };

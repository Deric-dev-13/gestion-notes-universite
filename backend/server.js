// =====================================================================
// server.js
// -----------------------------------------------------------------
// Point d'entrée de l'application backend. Ce fichier :
//   1. Charge la configuration (.env)
//   2. Configure Express (middlewares globaux : CORS, JSON)
//   3. Branche chaque groupe de routes sur son préfixe d'URL
//   4. Démarre le serveur HTTP après avoir vérifié la connexion DB
//
// Pour lancer le serveur : npm install puis npm start (ou npm run dev)
// =====================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const { testConnection } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const etudiantRoutes = require('./routes/etudiantRoutes');
const enseignantRoutes = require('./routes/enseignantRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Nécessaire pour que express-rate-limit identifie correctement l'IP
// réelle du client si le serveur est un jour placé derrière un proxy.
app.set('trust proxy', 1);

// --- Middlewares globaux ---
app.use(helmet());        // en-têtes de sécurité HTTP standards
app.use(cors());          // autorise le frontend (autre origine/port) à appeler cette API
app.use(express.json());  // parse automatiquement le JSON envoyé dans req.body
app.use(compression());   // compresse les réponses (gzip), surtout utile pour les gros relevés/listes

// --- Route de test simple pour vérifier que l'API répond ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API Gestion de Notes opérationnelle.' });
});

// --- Branchement des routes, chacune avec son préfixe ---
app.use('/api/auth', authRoutes);
app.use('/api/etudiant', etudiantRoutes);
app.use('/api/enseignant', enseignantRoutes);
app.use('/api/admin', adminRoutes);

// --- Gestion des routes non trouvées (404) ---
app.use((req, res) => {
  res.status(404).json({ message: 'Route non trouvée.' });
});

// --- Gestionnaire d'erreurs global (filet de sécurité) ---
// Express appelle automatiquement ce middleware si une erreur est passée à next(erreur)
app.use((erreur, req, res, next) => {
  console.error('Erreur non gérée :', erreur);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
});

const PORT = process.env.PORT || 5000;

// On vérifie que MySQL répond AVANT de démarrer le serveur HTTP,
// pour éviter d'accepter des requêtes alors que la BDD est down.
testConnection().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur backend démarré et accessible sur le réseau sur le port ${PORT}`);
  //app.listen(PORT, () => {
    //console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
  });
});

// =====================================================================
// config/db.js
// -----------------------------------------------------------------
// Rôle : créer un "pool" de connexions vers la base MySQL.
// Un pool = un ensemble de connexions réutilisables. C'est plus
// performant qu'ouvrir/fermer une connexion à chaque requête, car le
// serveur gère souvent plusieurs requêtes en parallèle.
// On utilise mysql2/promise pour pouvoir écrire du code asynchrone
// avec async/await plutôt qu'avec des callbacks imbriqués.
// =====================================================================

require('dotenv').config(); // charge les variables du fichier .env dans process.env
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 17922, //3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4', // essentiel pour les accents français (é, è, à...) : sans ceci, certains clients MySQL retombent sur un charset qui déforme les caractères accentués
  dateStrings: true,  // renvoie les dates (DATE, DATETIME) sous forme de chaînes 'YYYY-MM-DD' au lieu d'objets Date JS avec décalage ISO
  waitForConnections: true, // si toutes les connexions sont occupées, on attend au lieu de planter
  ssl: {
    rejectUnauthorized: false
  },
  // connectionLimit : nombre max de connexions simultanées vers MySQL.
  // 10 est le défaut mysql2, trop faible pour beaucoup d'utilisateurs simultanés
  // (chaque requête HTTP peut occuper une connexion pendant tout son traitement).
  // Valeur ajustable via .env selon les limites de max_connections du serveur MySQL.
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 50,
  // queueLimit : nombre max de requêtes en attente d'une connexion libre.
  // 0 = file d'attente illimitée -> sous forte charge, les requêtes s'empilent
  // indéfiniment et les utilisateurs attendent sans jamais avoir d'erreur claire.
  // On préfère rejeter proprement (erreur "trop de requêtes") au-delà d'un seuil,
  // plutôt que de laisser tout le monde attendre indéfiniment.
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT, 10) || 200
});

// Petite fonction utilitaire pour vérifier au démarrage que la connexion fonctionne.
// Elle est appelée une seule fois dans server.js.
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connexion à la base de données MySQL réussie.');
    // Création conditionnelle de la table DEMANDE_REINITIALISATION si elle n'existe pas encore
    await connection.query(`
      CREATE TABLE IF NOT EXISTS DEMANDE_REINITIALISATION (
        id_demande INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(150) NOT NULL,
        role ENUM('etudiant', 'enseignant', 'admin') NOT NULL,
        mot_de_passe_souhaite VARCHAR(255) NOT NULL,
        statut ENUM('En attente', 'Traité', 'Rejeté') NOT NULL DEFAULT 'En attente',
        date_demande TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_traitement TIMESTAMP NULL
      )
    `);
    connection.release(); // on rend la connexion au pool, on ne la ferme pas définitivement
  } catch (error) {
    console.error('❌ Impossible de se connecter à MySQL :', error.message);
    process.exit(1); // on arrête le serveur si la BDD est inaccessible, inutile de continuer
  }
}

module.exports = { pool, testConnection };

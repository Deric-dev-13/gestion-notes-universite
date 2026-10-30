// Import d'un fichier SQL dans la base distante (Aiven)
const fs = require('fs');
const mysql = require('mysql2/promise');

(async () => {
  const fichier = process.argv[2];
  const sql = fs.readFileSync(fichier, 'utf8');
  const connexion = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true,
    charset: 'utf8mb4'
  });
  await connexion.query('SET SESSION sql_require_primary_key = 0');
  await connexion.query(sql);
  const [tables] = await connexion.query('SHOW TABLES');
  console.log('Import terminé. Tables :', tables.length);
  console.log(tables.map((t) => Object.values(t)[0]).join(', '));
  await connexion.end();
})().catch((e) => { console.error('Erreur :', e.message); process.exit(1); });
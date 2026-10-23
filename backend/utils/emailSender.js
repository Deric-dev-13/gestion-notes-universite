const nodemailer = require('nodemailer');

function obtenirTransporteur() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = (process.env.SMTP_PASSWORD || '').replace(/\s/g, '');

  if (!host || !user || !password) {
    throw new Error('Configuration SMTP incomplète. Définissez SMTP_HOST, SMTP_USER et SMTP_PASSWORD dans backend/.env.');
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || (port === 465)).toLowerCase() === 'true';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: password }
  });
}

async function envoyerEmail({ destinataire, sujet, texte }) {
  if (!destinataire) throw new Error('Adresse email du destinataire manquante.');

  const transporteur = obtenirTransporteur();
  return transporteur.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: destinataire,
    subject: sujet,
    text: texte
  });
}

module.exports = { envoyerEmail };

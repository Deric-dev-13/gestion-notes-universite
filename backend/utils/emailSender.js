const Brevo = require('@getbrevo/brevo');

function obtenirClientApi() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("Configuration manquante. Définissez BREVO_API_KEY dans vos variables d'environnement.");
  }

  const defaultClient = Brevo.ApiClient.instance;
  const apiKeyInstance = defaultClient.authentications['api-key'];
  apiKeyInstance.apiKey = apiKey;

  return new Brevo.TransactionalEmailsApi();
}

async function envoyerEmail({ destinataire, sujet, texte }) {
  if (!destinataire) throw new Error('Adresse email du destinataire manquante.');

  const apiInstance = obtenirClientApi();
  const sendSmtpEmail = new Brevo.SendSmtpEmail();

  sendSmtpEmail.subject = sujet;
  sendSmtpEmail.textContent = texte;
  // Utilise l'adresse configurée sur Render comme expéditeur
  sendSmtpEmail.sender = { name: "Gestion de Notes", email: process.env.SMTP_USER };
  sendSmtpEmail.to = [{ email: destinataire }];

  return apiInstance.sendTransacEmail(sendSmtpEmail);
}

module.exports = { envoyerEmail };


/*const nodemailer = require('nodemailer');

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

module.exports = { envoyerEmail };*/

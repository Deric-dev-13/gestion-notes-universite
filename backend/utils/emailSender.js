async function envoyerEmail({ destinataire, sujet, texte }) {
  if (!destinataire) throw new Error('Adresse email du destinataire manquante.');
  if (!process.env.BREVO_API_KEY) {
    throw new Error("Configuration manquante. Définissez BREVO_API_KEY.");
  }

  // Requête HTTP directe sur l'API de Brevo (Zéro dépendance, impossible de casser)
  const response = await fetch('https://brevo.com', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: "Gestion de Notes", email: process.env.SMTP_USER },
      to: [{ email: destinataire }],
      subject: sujet,
      textContent: texte
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Erreur Brevo API: ${JSON.stringify(errorData)}`);
  }

  return await response.json();
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

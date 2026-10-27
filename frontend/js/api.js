// =====================================================================
// js/api.js
// -----------------------------------------------------------------
// Module partagé par les 3 espaces (étudiant/enseignant/admin).
// Il centralise :
//   - l'URL de base de l'API
//   - la fonction appelApi() qui ajoute automatiquement le token JWT
//     dans l'en-tête Authorization et gère les erreurs communes
//   - des fonctions utilitaires (stockage du token, déconnexion...)
// Chargé en premier dans chaque page HTML via <script src="../js/api.js">
// =====================================================================


// URL de base : dynamique, basée sur l'adresse depuis laquelle la page est
// chargée (fonctionne que ce soit localhost, une IP locale changeante, ou
// un vrai nom de domaine en production). Une IP codée en dur casserait
// l'application dès que la machine change de réseau ou d'adresse.
const API_BASE_URL = `https://6af8e3f60e29622562d0937c86e44879.loophole.site/api`;
//const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:5000/api`;

//const API_BASE_URL = ``;
//const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:5000/api`;


// --- Gestion du token dans le stockage du navigateur ---
// On utilise localStorage pour que la session survive au rechargement
// de la page (contrairement à une simple variable JS).
function enregistrerSession({ token, role, nom, prenom }) {
  localStorage.setItem('token', token);
  localStorage.setItem('role', role);
  localStorage.setItem('nom', nom || '');
  localStorage.setItem('prenom', prenom || '');
}

function getToken() {
  return localStorage.getItem('token');
}

function getRole() {
  return localStorage.getItem('role');
}

function deconnexion() {
  localStorage.clear();
  window.location.href = new URL('../index.html', window.location.href).href;
}

// Redirige vers la page de login si aucun token n'est présent,
// ou si le rôle stocké ne correspond pas à l'espace attendu.
// A appeler en haut de chaque app.js d'espace protégé.
function protegerPage(roleAttendu) {
  const token = getToken();
  const role = getRole();
  if (!token || role !== roleAttendu) {
    window.location.href = new URL('../index.html', window.location.href).href;
  }
}

// --- Fonction générique d'appel API ---
// méthode: 'GET' | 'POST' | 'PUT' | 'DELETE'
// corps: objet JS (sera converti en JSON) ou null
// options: { pdf: true } si on attend un fichier binaire en retour
async function appelApi(chemin, methode = 'GET', corps = null, options = {}) {
  const enTetes = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) enTetes['Authorization'] = `Bearer ${token}`;

  const config = { method: methode, headers: enTetes };
  if (corps) config.body = JSON.stringify(corps);

  const reponse = await fetch(`${API_BASE_URL}${chemin}`, config);

  // Si le token a expiré ou est invalide, on renvoie l'utilisateur au login
  if (reponse.status === 401 || reponse.status === 403) {
    const data = await reponse.json().catch(() => ({}));
    // 403 peut aussi signifier "droits insuffisants" sur une action précise,
    // donc on ne déconnecte que si le message concerne le token lui-même.
    if (data.message && data.message.toLowerCase().includes('token')) {
      deconnexion();
      return;
    }
    throw new Error(data.message || 'Accès refusé.');
  }

  if (options.pdf) {
    if (!reponse.ok) throw new Error('Erreur lors de la génération du PDF.');
    return reponse.blob(); // fichier binaire
  }

  const data = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    throw new Error(data.message || 'Une erreur est survenue.');
  }
  return data;
}

// Déclenche le téléchargement d'un blob PDF côté navigateur
function telechargerBlob(blob, nomFichier) {
  const url = window.URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(url);
}

// Petite fonction d'affichage de messages d'erreur/succès réutilisable
function afficherMessage(idElement, texte, type = 'erreur') {
  const el = document.getElementById(idElement);
  if (!el) return;
  el.textContent = texte;
  el.className = type === 'erreur'
    ? 'text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm'
    : 'text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm';
  el.classList.remove('hidden');
}

// Nettoie et formate une date pour supprimer la partie heure ISO ("T21:00:00.000Z")
function formaterDate(valeur) {
  if (!valeur) return '-';
  if (typeof valeur === 'string') {
    if (valeur.includes('T')) {
      const d = new Date(valeur);
      if (!isNaN(d.getTime())) {
        const annee = d.getFullYear();
        const mois = String(d.getMonth() + 1).padStart(2, '0');
        const jour = String(d.getDate()).padStart(2, '0');
        return `${annee}-${mois}-${jour}`;
      }
      return valeur.split('T')[0];
    }
    return valeur;
  }
  if (valeur instanceof Date) {
    const annee = valeur.getFullYear();
    const mois = String(valeur.getMonth() + 1).padStart(2, '0');
    const jour = String(valeur.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  }
  return String(valeur);
}

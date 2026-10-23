// =====================================================================
// etudiant/app.js
// -----------------------------------------------------------------
// Logique de l'espace étudiant. Nouveautés :
//   - Sélecteur d'année universitaire (historique complet L1 -> M2)
//   - Bascule Session Normale / Session Rattrapage sur les mêmes données
//   - Onglet "Mes dettes" listant les EC à repasser
//   - Téléchargement PDF qui respecte l'année ET la session choisies
// =====================================================================

protegerPage('etudiant');

const elNom = document.getElementById('nomEtudiant');
const elInfoParcours = document.getElementById('infoParcours');
const elContenuProfil = document.getElementById('contenuProfil');
const elConteneurSemestres = document.getElementById('conteneurSemestres');
const elCarteDecision = document.getElementById('carteDecision');
const elSelectAnnee = document.getElementById('selectAnnee');
const elCorpsDettes = document.getElementById('corpsTableauDettes');

document.getElementById('btnDeconnexion').addEventListener('click', deconnexion);

const notificationEtudiant = document.getElementById('notification');
if (notificationEtudiant) {
  notificationEtudiant.classList.add('relative');

  const badgeNotifications = document.createElement('span');
  badgeNotifications.id = 'notification-badge-etudiant';
  badgeNotifications.className = 'absolute -top-1.5 -right-1 min-w-[14px] h-[14px] px-1 text-[8px] leading-[14px] text-center rounded-full bg-red-500 text-white font-semibold shadow-sm';
  badgeNotifications.textContent = '0';
  notificationEtudiant.appendChild(badgeNotifications);

  const panneauNotifications = document.createElement('div');
  panneauNotifications.id = 'notification-panel';
  panneauNotifications.className = 'notification-panel hidden';
  document.body.appendChild(panneauNotifications);

  async function chargerNotificationsEtudiant() {
    try {
      const items = await appelApi('/etudiant/notifications');
      const notifications = (Array.isArray(items) ? items : []).filter(item => item.id !== 'aucune');
      const total = notifications.length;
      badgeNotifications.textContent = total;
      badgeNotifications.classList.remove('hidden');

      panneauNotifications.innerHTML = `
        <div class="notification-header">Notifications</div>
        <ul class="notification-list">
          ${notifications.length > 0
            ? notifications.map((item) => `<li>${item.texte || 'Notification'}</li>`).join('')
            : '<li>Aucune notification active pour votre compte.</li>'}
        </ul>
      `;
    } catch (erreur) {
      badgeNotifications.textContent = '0';
      badgeNotifications.classList.remove('hidden');
      panneauNotifications.innerHTML = `
        <div class="notification-header">Notifications</div>
        <ul class="notification-list">
          <li>Impossible de charger vos notifications.</li>
        </ul>
      `;
    }
  }

  notificationEtudiant.addEventListener('click', async () => {
    const estOuvert = !panneauNotifications.classList.contains('hidden');
    document.querySelectorAll('.notification-panel').forEach((panel) => panel.classList.add('hidden'));
    if (!estOuvert) {
      await chargerNotificationsEtudiant();
      panneauNotifications.classList.remove('hidden');
    }
  });

  document.addEventListener('click', (event) => {
    if (!panneauNotifications.contains(event.target) && event.target !== notificationEtudiant) {
      panneauNotifications.classList.add('hidden');
    }
  });

  chargerNotificationsEtudiant();
}

const btnMenuMobileEtudiant = document.getElementById('btnMenuMobileEtudiant');
const ongletsEtudiant = document.getElementById('ongletsEtudiant');

if (ongletsEtudiant && !document.getElementById('btnDeconnexionMobileEtudiant')) {
  const btnDeconnexionMobile = document.createElement('button');
  btnDeconnexionMobile.id = 'btnDeconnexionMobileEtudiant';
  btnDeconnexionMobile.type = 'button';
  btnDeconnexionMobile.className = 'btn-deconnexion-mobile bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm mt-auto';
  btnDeconnexionMobile.textContent = 'Déconnexion';
  btnDeconnexionMobile.addEventListener('click', deconnexion);
  ongletsEtudiant.appendChild(btnDeconnexionMobile);
}

function fermerMenuMobileEtudiant() {
  if (!ongletsEtudiant) return;
  ongletsEtudiant.classList.remove('menu-open');
  if (btnMenuMobileEtudiant) {
    btnMenuMobileEtudiant.setAttribute('aria-expanded', 'false');
  }
}

function ouvrirMenuMobileEtudiant() {
  if (!ongletsEtudiant) return;
  ongletsEtudiant.classList.add('menu-open');
  if (btnMenuMobileEtudiant) {
    btnMenuMobileEtudiant.setAttribute('aria-expanded', 'true');
  }
}

if (btnMenuMobileEtudiant) {
  btnMenuMobileEtudiant.addEventListener('click', () => {
    const estOuvert = ongletsEtudiant && ongletsEtudiant.classList.contains('menu-open');
    if (estOuvert) {
      fermerMenuMobileEtudiant();
    } else {
      ouvrirMenuMobileEtudiant();
    }
  });
}

// État en mémoire
let sessionCourante = 'normale'; // 'normale' | 'rattrapage'
let releveCourant = null;        // dernier relevé chargé
let profilCourant = null;

// --------------------------------------------------------------
// Onglets Notes / Dettes
// --------------------------------------------------------------
document.querySelectorAll('.page-btn').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    document.querySelectorAll('.page-btn').forEach((b) => {
      b.classList.remove('bg-blue-900', 'text-white');
      b.classList.add('bg-white', 'text-gray-700');
    });
    bouton.classList.add('bg-blue-900', 'text-white');
    bouton.classList.remove('bg-white', 'text-gray-700');

    const page = bouton.dataset.page;
    const carteProfil = document.getElementById('carteProfil');
    const pageNotes = document.getElementById('page-notes');
    const pageDettes = document.getElementById('page-dettes');
    const carteStatuts = document.getElementById('carteStatuts');

    carteProfil.classList.toggle('hidden', page !== 'profil');
    carteStatuts.classList.toggle('hidden', page !== 'status');
    pageNotes.classList.toggle('hidden', page !== 'notes');
    pageDettes.classList.toggle('hidden', page !== 'dettes');

    if (window.innerWidth < 768) {
      fermerMenuMobileEtudiant();
    }
  });
});

document.addEventListener('click', (event) => {
  if (window.innerWidth >= 768) return;
  if (!ongletsEtudiant || !btnMenuMobileEtudiant) return;
  const cliqueDansNav = ongletsEtudiant.contains(event.target);
  const cliqueSurBouton = btnMenuMobileEtudiant.contains(event.target);
  if (!cliqueDansNav && !cliqueSurBouton && ongletsEtudiant.classList.contains('menu-open')) {
    fermerMenuMobileEtudiant();
  }
});

// --------------------------------------------------------------
// Bascule Session Normale / Rattrapage
// --------------------------------------------------------------
document.querySelectorAll('.btn-session').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    sessionCourante = bouton.dataset.session;
    document.querySelectorAll('.btn-session').forEach((b) => {
      b.classList.remove('bg-blue-900', 'text-white');
      b.classList.add('text-gray-600');
    });
    bouton.classList.add('bg-blue-900', 'text-white');
    bouton.classList.remove('text-gray-600');
    if (releveCourant) afficherReleve(releveCourant);
  });
});

function extraireCodeMention(mention) {
  if (!mention) return 'INF';
  const m = mention.trim().toUpperCase();
  if (m.includes('CIVIL') || m === 'GC') return 'GC';
  if (m.includes('ELECTR') || m.includes('ÉLECTR') || m === 'GE') return 'GE';
  if (m.includes('MECAN') || m.includes('MÉCAN') || m === 'GM') return 'GM';
  if (m.includes('INDUSTRIEL') || m === 'GI') return 'GI';
  if (m.includes('TELECOM') || m.includes('TÉLÉCOM') || m === 'GTR' || m === 'TC') return 'GTR';
  if (m.includes('INFO') || m === 'INF') return 'INF';
  if (m.includes('MATH')) return 'MATH';
  if (m.includes('PHYSIQUE')) return 'PHYS';
  if (m.includes('CHIMIE')) return 'CHIM';
  if (m.includes('GESTION') || m.includes('ECONOMIE') || m.includes('ÉCONOMIE')) return 'ECO';

  const mots = m.split(/\s+/).filter(Boolean);
  if (mots.length === 1 && mots[0].length <= 4) return mots[0];
  if (mots.length > 1) return mots.map((w) => w[0]).join('').slice(0, 4);
  return m.slice(0, 4);
}

function genererMatricule(numero, mention, annee) {
  const anneePrefix = annee ? String(annee).slice(0, 4) : '2024';
  const code = extraireCodeMention(mention);
  const numPad = String(numero || '').padStart(4, '0');
  return `${anneePrefix}${code}${numPad}`;
}

// --------------------------------------------------------------
// Chargement initial
// --------------------------------------------------------------
async function initialiser() {
  elNom.textContent = `${localStorage.getItem('prenom')} ${localStorage.getItem('nom')}`;
  await chargerProfil();
  await chargerAnnees();
  await chargerDettes();
  await chargerStatuts();
}

async function chargerProfil() {
  try {
    profilCourant = await appelApi('/etudiant/profil');
    const matricule = genererMatricule(profilCourant.numero_etudiant, profilCourant.mention, '2024');
    elInfoParcours.innerHTML = `<span class="bg-blue-800 text-blue-100 px-2 py-0.5 rounded text-xs font-semibold mr-1.5">${profilCourant.mention || 'Mention'}</span> <span class="bg-yellow-400 text-blue-950 px-2 py-0.5 rounded text-xs font-black mr-1.5">${profilCourant.niveau}</span> <span class="text-blue-800 font-medium text-xs">${profilCourant.nom_parcours}</span>`;
    elContenuProfil.innerHTML = `
      <div><span class="block text-gray-400 text-xs">Numéro étudiant</span><strong class="text-blue-900 text-xs">${profilCourant.numero_etudiant}</strong></div>
      <div><span class="block text-gray-400 text-xs">Nom complet</span><strong class="text-gray-800 text-xs">${profilCourant.nom_etudiant} ${profilCourant.prenom_etudiant}</strong></div>
      <div><span class="block text-gray-400 text-xs">Sexe</span><strong class="text-gray-800 text-xs">${profilCourant.sexe || '-'}</strong></div>
      <div><span class="block text-gray-400 text-xs">Date de naissance</span><strong class="text-gray-800 text-xs">${formaterDate(profilCourant.date_naissance)}</strong></div>
      <div><span class="block text-gray-400 text-xs">CIN</span><strong class="text-gray-800 text-xs">${profilCourant.cin || '-'}</strong></div>
      <div><span class="block text-gray-400 text-xs">Téléphone</span><strong class="text-gray-800 text-xs">${profilCourant.tel_etudiant || '-'}</strong></div>
      <div><span class="block text-gray-400 text-xs">Mention</span><span class="inline-block bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded text-xs">${profilCourant.mention || 'Non renseignée'}</span></div>
      <div><span class="block text-gray-400 text-xs">Niveau</span><span class="inline-block bg-emerald-100 text-emerald-900 font-extrabold px-2.5 py-0.5 rounded text-xs">${profilCourant.niveau}</span></div>
      <div><span class="block text-gray-400 text-xs">Parcours</span><strong class="text-gray-800 text-xs">${profilCourant.nom_parcours}</strong></div>
      <div><span class="block text-gray-400 text-xs">Email</span><span class="text-gray-600 text-xs truncate block" title="${profilCourant.email_etudiant}">${profilCourant.email_etudiant}</span></div>
    `;
  } catch (erreur) {
    afficherMessage('messageErreur', erreur.message);
  }
}

async function chargerAnnees() {
  try {
    const annees = await appelApi('/etudiant/annees');
    if (annees.length === 0) {
      elConteneurSemestres.innerHTML = '<p class="text-gray-500">Aucune inscription enregistrée pour le moment.</p>';
      elSelectAnnee.innerHTML = '<option>Aucune année</option>';
      return;
    }
    elSelectAnnee.innerHTML = annees.map((a) => `<option value="${a}">${a}</option>`).join('');
    elSelectAnnee.value = annees[0];
    await chargerNotesEtMoyennes(annees[0]);
  } catch (erreur) {
    afficherMessage('messageErreur', erreur.message);
  }
}

elSelectAnnee.addEventListener('change', () => chargerNotesEtMoyennes(elSelectAnnee.value));

async function chargerNotesEtMoyennes(annee) {
  try {
    releveCourant = await appelApi(`/etudiant/notes?annee=${encodeURIComponent(annee)}`);
    afficherReleve(releveCourant);
    afficherCatalogueStatuts(annee);
  } catch (erreur) {
    afficherMessage('messageErreur', erreur.message);
  }
}

function genererMention(moyenne) {
  if (moyenne === null || isNaN(moyenne)) return 'N/A';
  if (moyenne >= 16) return 'Très Bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez Bien';
  if (moyenne >= 10) return 'Passable';
  return 'Ajourné';
}

function genererStatutUE(moyenne, elimine) {
  if (elimine) return { icone: '❌', label: 'NV', badge: 'text-red-700 font-bold' };
  if (moyenne === null || isNaN(moyenne)) return { icone: '-', label: 'N/A', badge: 'text-gray-400' };
  if (moyenne >= 10) return { icone: '✅', label: 'V', badge: 'text-green-700 font-bold' };
  return { icone: '❌', label: 'NV', badge: 'text-red-700 font-bold' };
}

// --------------------------------------------------------------
// Affichage du relevé officiel selon le modèle exact demandé
// --------------------------------------------------------------
function afficherReleve(releve) {
  elConteneurSemestres.innerHTML = '';
  const semestresTries = Object.keys(releve.semestres || {}).sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')));
  if (!semestresTries.length) {
    elConteneurSemestres.innerHTML = '<p class="text-gray-500">Aucune note enregistree pour cette annee.</p>';
    elCarteDecision.classList.add('hidden');
    return;
  }

  const annee = elSelectAnnee.value;
  const mention = releve.mention || (profilCourant && profilCourant.mention) || 'Non renseignee';
  const parcours = releve.nom_parcours || (profilCourant && profilCourant.nom_parcours) || 'Tronc Commun';
  const numero = profilCourant ? profilCourant.numero_etudiant : '';
  const nom = profilCourant ? profilCourant.nom_etudiant : (localStorage.getItem('nom') || '');
  const prenom = profilCourant ? profilCourant.prenom_etudiant : (localStorage.getItem('prenom') || '');
  const niveau = releve.niveau || (profilCourant && profilCourant.niveau) || '';
  const matricule = genererMatricule(numero, mention, annee);
  const dateNaissance = formaterDateLongue(profilCourant && profilCourant.date_naissance);
  const dateEtLieu = [dateNaissance, profilCourant && profilCourant.lieu_naissance].filter(Boolean).join(' \u00e0 ') || 'Non renseigne';
  const diplome = /^L/i.test(niveau) ? 'LAPEN' : /^M/i.test(niveau) ? 'MAPEN' : 'Non renseigne';
  const sessionLabel = sessionCourante === 'rattrapage' ? 'Session Rattrapage' : 'Session Normale';
  const moyenneCle = sessionCourante === 'rattrapage' ? 'moyenneRattrapage' : 'moyenneNormale';
  const moyenneSemestreCle = sessionCourante === 'rattrapage' ? 'moyenneGeneraleRattrapage' : 'moyenneGeneraleNormale';
  const resultatCle = sessionCourante === 'rattrapage' ? 'resultatRattrapage' : 'resultatNormale';
  const escape = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const display = (value, digits = 2) => value == null || Number.isNaN(Number(value)) ? '-' : Number(value).toFixed(digits).replace('.', ',');
  const cursus = 'ACADEMIQUE ET PROFESSIONNALISANT';
  const aujourdHui = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

  elConteneurSemestres.className = 'space-y-8';
  for (const nomSemestre of semestresTries) {
    const dataSem = releve.semestres[nomSemestre];
    // Onglet Rattrapage : si l'étudiant n'a pas passé le rattrapage pour ce
    // semestre (validé en session normale), on n'affiche pas de résultat.
    if (sessionCourante === 'rattrapage' && !dataSem.aRattrapage) {
      const bloc = document.createElement('div');
      bloc.className = 'bg-white rounded-xl shadow p-6 text-center';
      bloc.innerHTML = `<h3 class="font-semibold text-gray-800 mb-1">Semestre ${escape(nomSemestre)}</h3>
        <p class="text-gray-600">Vous n'êtes pas passé(e) au rattrapage pour ce semestre. Consultez la 1re session (Session Normale) pour voir votre résultat.</p>`;
      elConteneurSemestres.appendChild(bloc);
      continue;
    }
    const moyenneSemestre = dataSem[moyenneSemestreCle];
    const resultatSemestre = dataSem[resultatCle] || 'En attente';
    const toutesLesUE = dataSem.ues || [];
    const nbEcSemestre = toutesLesUE.reduce((total, ue) => total + Math.max(1, (ue.ecs || []).length), 0);
    let creditsPossibles = 0;
    let creditsObtenus = 0;
    let lignes = '';
    let premiereLigneSemestre = true;

    for (const ue of toutesLesUE) {
      const ecs = ue.ecs && ue.ecs.length ? ue.ecs : [null];
      const moyenneUE = ue[moyenneCle];
      const cleElimineUE = sessionCourante === 'rattrapage' ? 'elimineRattrapage' : 'elimineNormale';
      const elimineUE = !!ue[cleElimineUE];
      const statut = genererStatutUE(moyenneUE, elimineUE);
      const creditsUE = (ue.ecs || []).reduce((sum, ec) => sum + (Number(ec.credit) || 0), 0);
      creditsPossibles += creditsUE;
      // Crédits obtenus uniquement si l'UE est réellement validée (>=10,
      // sans note éliminatoire) : le seuil de compensation est 10/20, pas 8.
      if (statut.label === 'V') creditsObtenus += creditsUE;

      ecs.forEach((ec, index) => {
        const first = index === 0;
        const row = [];
        if (premiereLigneSemestre) {
          row.push(`<td rowspan="${nbEcSemestre}" class="releve-cell releve-semestre-cell">${escape(nomSemestre)}</td>`);
          premiereLigneSemestre = false;
        }
        if (first) {
          row.push(`<td rowspan="${ecs.length}" class="releve-cell releve-code-cell">${escape(ue.code_UE || '')}</td>`);
          row.push(`<td rowspan="${ecs.length}" class="releve-cell releve-intitule-ue">${escape(ue.nom_UE || '')}</td>`);
          row.push(`<td rowspan="${ecs.length}" class="releve-cell releve-num-cell">${creditsUE}</td>`);
        }
        row.push(`<td class="releve-cell releve-intitule-ec">${escape(ec ? ec.nom_EC : '')}</td>`);
        row.push(`<td class="releve-cell releve-num-cell">${ec ? (Number(ec.credit) || 0) : '-'}</td>`);
        row.push(`<td class="releve-cell releve-num-cell">${ec ? (Number(ec.credit) || 0) : '-'}</td>`);
        const cleElimineEC = sessionCourante === 'rattrapage' ? 'eliminatoireRattrapage' : 'eliminatoireNormale';
        const ecElimine = ec && ec[cleElimineEC];
        const texteNoteEC = ec ? display(ec[moyenneCle]) + (ecElimine ? '*' : '') : '-';
        row.push(`<td class="releve-cell releve-num-cell releve-note${ecElimine ? ' releve-note-eliminatoire' : ''}">${texteNoteEC}</td>`);
        if (first) {
          const labelStatut = statut.label === 'V' ? 'Unite acquise' : (elimineUE ? 'Non validee (note < 3)' : 'Non validee');
          const colorStatut = statut.label === 'V' ? 'releve-valide' : 'releve-non-valide';
          row.push(`<td rowspan="${ecs.length}" class="releve-cell releve-num-cell releve-moy-ue">${display(moyenneUE)}</td>`);
          row.push(`<td rowspan="${ecs.length}" class="releve-cell releve-resultat ${colorStatut}">${labelStatut}</td>`);
        }
        lignes += `<tr>${row.join('')}</tr>`;
      });
    }

    const dateEtLieuSafe = escape(dateEtLieu);
    const entete = `
      <div class="releve-entete">
        <div class="releve-identite-institution">
          <img src="../photos/logo_universite.jpg" alt="Universite d'Antsiranana" class="releve-logo">
          <div class="releve-institution">
            <h2>UNIVERSIT&Eacute; D'ANTSIRANANA</h2>
            <p>&Eacute;COLE NORMALE SUP&Eacute;RIEURE POUR L'ENSEIGNEMENT TECHNIQUE (ENSET)</p>
          </div>
          <img src="../photos/logo_enset.jpg" alt="ENSET" class="releve-logo">
        </div>
        <div class="releve-parcours-entete">
          <div><strong>Domaine :</strong> SCIENCES DE L'&Eacute;DUCATION</div>
          <div><strong>Mention :</strong> ${escape(mention)}</div>
          <div><strong>Parcours :</strong> ${escape(parcours)}</div>
          <div><strong>Cursus :</strong> ${cursus}</div>
          <div class="releve-annee"><strong>Annee universitaire :</strong> ${escape(annee)}</div>
        </div>
        <h3 class="releve-titre">RELEVE DE NOTES</h3>
        <div class="releve-identite-etudiant">
          <div><strong>Nom et prenoms :</strong> ${escape(nom)} ${escape(prenom)}</div>
          <div><strong>Date et lieu de naissance :</strong> ${dateEtLieuSafe}</div>
          <div><strong>Diplome prepare :</strong> ${diplome} <span class="releve-session">${escape(sessionLabel)}</span></div>
        </div>
      </div>`;

    const semContainer = document.createElement('section');
    semContainer.className = 'releve-page-semestre';
    semContainer.innerHTML = `
      ${entete}
      <div class="releve-bandeau-semestre">
        <strong>SEMESTRE ${escape(nomSemestre)}</strong>
        <span>Moyenne : ${display(moyenneSemestre)} / 20 &nbsp; | &nbsp; Statut : ${escape(resultatSemestre)}</span>
      </div>
      <div class="releve-table-scroll">
        <table class="releve-table">
          <thead>
            <tr>
              <th rowspan="2">Semestre</th>
              <th colspan="3">Unit&eacute;s d'Enseignement (UE)</th>
              <th colspan="3">&Eacute;l&eacute;ments Constitutifs (EC)</th>
              <th colspan="3">R&eacute;sultats obtenus</th>
            </tr>
            <tr>
              <th>Code</th><th>Intitul&eacute;(s)</th><th>Cr&eacute;dits requis</th>
              <th>Intitul&eacute;(s)</th><th>Cr&eacute;dits requis</th><th>Coef.</th>
              <th>Note</th><th>Moy. UE</th><th>R&eacute;sultat</th>
            </tr>
          </thead>
          <tbody>
            ${lignes}
            <tr class="releve-total-row">
              <td colspan="8">Resultats du semestre &nbsp; | &nbsp; Credits : ${creditsPossibles}</td>
              <td class="releve-num-cell">${display(moyenneSemestre)}</td>
              <td class="releve-resultat">${escape(resultatSemestre)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="releve-synthese-semestre">
        <strong>Moyenne du semestre : ${display(moyenneSemestre)}</strong>
        <strong>Mention : ${genererMention(moyenneSemestre)}</strong>
        <strong>Credits obtenus : ${creditsObtenus}</strong>
      </div>
      <div class="releve-decision-semestre">
        <strong>Decision du jury :</strong> ${escape(resultatSemestre)}
        <span>Antsiranana, le ${escape(aujourdHui)}</span>
      </div>
      <div class="releve-signatures">
        <div><strong>Le Responsable du Parcours</strong><span>${escape(releve.responsable_parcours || 'A renseigner')}</span><small>Signature et cachet</small></div>
        <div><strong>Le Responsable de la Mention</strong><span>${escape(releve.responsable_mention || 'A renseigner')}</span><small>Signature et cachet</small></div>
      </div>`;
    elConteneurSemestres.appendChild(semContainer);
  }
  elCarteDecision.classList.add('hidden');
}

function formaterDateLongue(valeur) {
  if (!valeur) return '';
  const brut = typeof valeur === 'string' ? valeur.slice(0, 10) : `${valeur.getFullYear()}-${String(valeur.getMonth() + 1).padStart(2, '0')}-${String(valeur.getDate()).padStart(2, '0')}`;
  const [annee, mois, jour] = brut.split('-').map(Number);
  const nomsMois = ['janvier', 'f\u00e9vrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'ao\u00fbt', 'septembre', 'octobre', 'novembre', 'd\u00e9cembre'];
  return annee && nomsMois[mois - 1] ? `${String(jour).padStart(2, '0')} ${nomsMois[mois - 1]} ${annee}` : '';
}

// --------------------------------------------------------------
// Catalogue des statuts académiques
// --------------------------------------------------------------
const CATALOGUE_STATUTS = [
  { valeur: 'En cours', css: 'statut-en-cours', badge: 'badge-en-cours', titre: '⏳ En cours', texte: "L'année universitaire n'est pas encore clôturée : la décision du jury n'est pas encore rendue." },
  { valeur: 'Admis', css: 'statut-admis', badge: 'badge-valide', titre: '✅ Admis', texte: 'Les deux semestres sont validés : vous passez au niveau supérieur sans dette.' },
  { valeur: 'Admis avec dette', css: 'statut-dette', badge: 'badge-dette', titre: '⚠️ Admis avec dette', texte: "Un semestre n'est pas validé : vous passez au niveau supérieur mais devez repasser les EC en dette." },
  { valeur: 'Redouble', css: 'statut-redouble', badge: 'badge-non-valide', titre: '🔁 Redouble / Ajourné', texte: "Aucun semestre validé : vous êtes ajourné(e) et vous reprenez le même niveau l'année suivante." }
];
let historiqueInscriptions = [];

async function chargerStatuts() {
  try {
    historiqueInscriptions = await appelApi('/etudiant/inscriptions');
    const corps = document.getElementById('corpsHistoriqueStatuts');
    corps.innerHTML = historiqueInscriptions.length
      ? [...historiqueInscriptions].reverse().map((i) => {
          const def = CATALOGUE_STATUTS.find((c) => c.valeur === i.statut) || CATALOGUE_STATUTS[0];
          return `<tr><td class="px-3 py-2">${i.annee_universitaire}</td><td class="px-3 py-2">${i.niveau}</td><td class="px-3 py-2">${i.nom_parcours}</td><td class="px-3 py-2"><span class="badge ${def.badge}">${def.titre.replace(/^\S+\s/, '')}</span></td></tr>`;
        }).join('')
      : '<tr><td colspan="4" class="px-3 py-4 text-gray-400 text-center">Aucune inscription enregistrée.</td></tr>';
    afficherCatalogueStatuts(elSelectAnnee.value);
  } catch (erreur) {
    afficherMessage('messageErreur', erreur.message);
  }
}

function afficherCatalogueStatuts(annee) {
  const insc = historiqueInscriptions.find((i) => i.annee_universitaire === annee);
  const statut = insc ? insc.statut : null;
  document.getElementById('catalogueStatuts').innerHTML = CATALOGUE_STATUTS.map((c) => `
    <div class="statut-carte ${c.css} ${c.valeur === statut ? 'actif' : ''}">
      <h4>${c.titre}</h4><p>${c.texte}</p><span class="marque">● Votre statut en ${annee}</span>
    </div>`).join('');
  document.getElementById('texteStatutCourant').textContent = statut
    ? `Année ${annee} : votre statut est « ${statut === 'Redouble' ? 'Redouble / Ajourné' : statut} ».`
    : 'Aucun statut disponible pour cette année.';
}

// --------------------------------------------------------------
// Dettes
// --------------------------------------------------------------
async function chargerDettes() {
  try {
    const dettes = await appelApi('/etudiant/dettes');
    if (dettes.length === 0) {
      elCorpsDettes.innerHTML = '<tr><td colspan="5" class="px-3 py-4 text-gray-400 text-center">Aucune dette. 🎉</td></tr>';
      return;
    }
    elCorpsDettes.innerHTML = dettes.map((d) => `
      <tr>
        <td class="px-3 py-2">${d.nom_EC}</td>
        <td class="px-3 py-2">${d.nom_UE}</td>
        <td class="px-3 py-2">${d.annee_universitaire_origine}</td>
        <td class="px-3 py-2">${d.statut === 'Soldée' ? '<span class="badge badge-valide">Soldée</span>' : '<span class="badge badge-non-valide">En cours</span>'}</td>
        <td class="px-3 py-2">${d.annee_universitaire_soldee || '-'}</td>
      </tr>
    `).join('');
  } catch (erreur) {
    afficherMessage('messageErreur', erreur.message);
  }
}

// --------------------------------------------------------------
// Téléchargement PDF & Impression
// --------------------------------------------------------------

initialiser();


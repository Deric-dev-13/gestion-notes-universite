// =====================================================================
// enseignant/app.js
// -----------------------------------------------------------------
// Logique de l'espace enseignant. Nouveautés :
//   - Sélecteur d'année universitaire : l'enseignant choisit pour QUELLE
//     année il saisit une note (année en cours OU année passée, pour
//     corriger une note ou noter un rattrapage de dette).
//   - Onglet "Étudiants en dette sur cet EC" : liste les étudiants qui
//     doivent repasser cet EC (peu importe leur parcours actuel), avec
//     une saisie de note dédiée qui solde automatiquement la dette si
//     la note de rattrapage est >= 10.
// =====================================================================

protegerPage('enseignant');

//document.getElementById('nomEnseignant').textContent =
  //`${localStorage.getItem('prenom')} ${localStorage.getItem('nom')}`;
//document.getElementById('btnDeconnexion').addEventListener('click', deconnexion);

const notificationEnseignant = document.getElementById('notification');
if (notificationEnseignant) {
  notificationEnseignant.classList.add('relative');

  const badgeNotifications = document.createElement('span');
  badgeNotifications.id = 'notification-badge-enseignant';
  badgeNotifications.className = 'absolute -top-1.5 -right-1 min-w-[14px] h-[14px] px-1 text-[8px] leading-[14px] text-center rounded-full bg-red-500 text-white font-semibold shadow-sm';
  badgeNotifications.textContent = '0';
  notificationEnseignant.appendChild(badgeNotifications);

  const panneauNotifications = document.createElement('div');
  panneauNotifications.id = 'notification-panel';
  panneauNotifications.className = 'notification-panel hidden';
  document.body.appendChild(panneauNotifications);

  function echapperHtml(texte) {
    return String(texte).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Détail des étudiants en dette : nom, parcours, niveau et EC concernés
  function rendreDetailsNotification(details) {
    if (!Array.isArray(details) || details.length === 0) return '';
    return '<ul style="margin:6px 0 0 0;padding-left:16px;list-style:disc;">' + details.map((d) =>
      `<li style="margin-bottom:6px;"><strong>${echapperHtml(d.etudiant)}</strong><br>` +
      `Parcours : ${echapperHtml(d.parcours)} — Niveau : ${echapperHtml(d.niveau)}<br>` +
      'EC en dette :<ul style="margin:2px 0 0 0;padding-left:14px;list-style:circle;">' +
      d.ecs.map((ec) => `<li>${echapperHtml(ec.nom)} <em>(dette de ${echapperHtml(ec.annee)}, niveau ${echapperHtml(ec.niveau)})</em></li>`).join('') +
      '</ul></li>'
      //`EC en dette : ${d.ecs.map(echapperHtml).join(', ')}</li>`
    ).join('') + '</ul>';
  }

  async function chargerNotificationsEnseignant() {
    try {
      const items = await appelApi('/enseignant/notifications');
      const notifications = (Array.isArray(items) ? items : []).filter(item => item.id !== 'aucune');
      const total = notifications.length;
      badgeNotifications.textContent = total;
      badgeNotifications.classList.remove('hidden');

      panneauNotifications.innerHTML = `
        <div class="notification-header">Notifications</div>
        <ul class="notification-list">
          ${notifications.length > 0
            ? notifications.map((item) => `<li>${echapperHtml(item.texte || 'Notification')}${rendreDetailsNotification(item.details)}</li>`).join('')
            //? notifications.map((item) => `<li>${item.texte || 'Notification'}</li>`).join('')
            : '<li>Aucune notification active pour votre espace.</li>'}
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

  notificationEnseignant.addEventListener('click', async () => {
    const estOuvert = !panneauNotifications.classList.contains('hidden');
    document.querySelectorAll('.notification-panel').forEach((panel) => panel.classList.add('hidden'));
    if (!estOuvert) {
      await chargerNotificationsEnseignant();
      panneauNotifications.classList.remove('hidden');
    }
  });

  document.addEventListener('click', (event) => {
    if (!panneauNotifications.contains(event.target) && event.target !== notificationEnseignant) {
      panneauNotifications.classList.add('hidden');
    }
  });

  chargerNotificationsEnseignant();
}

const btnMenuMobileEnseignant = document.getElementById('btnMenuMobileEnseignant');
const ongletsEnseignant = document.getElementById('ongletsEnseignant');

if (ongletsEnseignant && !document.getElementById('btnDeconnexionMobileEnseignant')) {
  const btnDeconnexionMobile = document.createElement('button');
  btnDeconnexionMobile.id = 'btnDeconnexionMobileEnseignant';
  btnDeconnexionMobile.type = 'button';
  btnDeconnexionMobile.className = 'btn-deconnexion-mobile bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm mt-auto';
  btnDeconnexionMobile.textContent = 'Déconnexion';
  btnDeconnexionMobile.addEventListener('click', deconnexion);
  ongletsEnseignant.appendChild(btnDeconnexionMobile);
}

function fermerMenuMobileEnseignant() {
  if (!ongletsEnseignant) return;
  ongletsEnseignant.classList.remove('menu-open');
  if (btnMenuMobileEnseignant) {
    btnMenuMobileEnseignant.setAttribute('aria-expanded', 'false');
  }
}

function ouvrirMenuMobileEnseignant() {
  if (!ongletsEnseignant) return;
  ongletsEnseignant.classList.add('menu-open');
  if (btnMenuMobileEnseignant) {
    btnMenuMobileEnseignant.setAttribute('aria-expanded', 'true');
  }
}

if (btnMenuMobileEnseignant) {
  btnMenuMobileEnseignant.addEventListener('click', () => {
    const estOuvert = ongletsEnseignant && ongletsEnseignant.classList.contains('menu-open');
    if (estOuvert) {
      fermerMenuMobileEnseignant();
    } else {
      ouvrirMenuMobileEnseignant();
    }
  });
}

// État en mémoire
let tousLesEC = [];
let ecSelectionneCourant = null;
let etudiantsCourants = [];
let dettesCourantes = [];
let modeModaleDette = false; // true = la modale sert à saisir une note de rattrapage de dette

// Références DOM
const selectMention = document.getElementById('selectMention');
const selectParcours = document.getElementById('selectParcours');
const selectNiveau = document.getElementById('selectNiveau');
const selectEC = document.getElementById('selectEC');
const selectAnnee = document.getElementById('selectAnneeEnseignant');
const carteEtudiants = document.getElementById('carteEtudiants');
const carteDettes = document.getElementById('carteDettes');
const corpsTableau = document.getElementById('corpsTableauEtudiants');
const corpsTableauDettes = document.getElementById('corpsTableauDettes');
const modale = document.getElementById('modaleNote');

let rechercheECEnseignant = null;
let listeRechercheECEnseignant = null;

function initialiserRechercheECEnseignant() {
  if (!selectEC || rechercheECEnseignant) return;

  const conteneur = document.createElement('div');
  conteneur.className = 'relative';
  conteneur.style.zIndex = '1';
  conteneur.style.overflow = 'visible';
  selectEC.parentNode.insertBefore(conteneur, selectEC);
  conteneur.appendChild(selectEC);
  selectEC.style.display = 'none';

  rechercheECEnseignant = document.createElement('input');
  rechercheECEnseignant.type = 'search';
  rechercheECEnseignant.placeholder = 'Rechercher une matière (EC)...';
  rechercheECEnseignant.autocomplete = 'off';
  rechercheECEnseignant.className = 'border border-blue-300 rounded-lg px-3 py-2 w-full font-medium';
  rechercheECEnseignant.style.paddingRight = '2.5rem';
  rechercheECEnseignant.style.boxSizing = 'border-box';
  rechercheECEnseignant.style.backgroundColor = '#ffffff';

  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.textContent = '▼';
  bouton.className = 'absolute text-gray-600';
  bouton.style.right = '0.25rem';
  bouton.style.top = '50%';
  bouton.style.transform = 'translateY(-50%)';
  bouton.style.width = '2rem';
  bouton.style.height = '2rem';
  bouton.style.zIndex = '2';
  bouton.setAttribute('aria-label', 'Afficher les matières');

  listeRechercheECEnseignant = document.createElement('div');
  listeRechercheECEnseignant.id = 'listeRechercheECEnseignant';
  listeRechercheECEnseignant.className = 'hidden absolute border border-gray-300 rounded-lg shadow-lg menu-deroulant-recherche';
  listeRechercheECEnseignant.style.top = '100%';
  listeRechercheECEnseignant.style.left = '0';
  listeRechercheECEnseignant.style.width = '100%';
  listeRechercheECEnseignant.style.maxHeight = '15rem';
  listeRechercheECEnseignant.style.overflowY = 'auto';
  listeRechercheECEnseignant.style.zIndex = '1050';
  listeRechercheECEnseignant.style.backgroundColor = '#ffffff';
  listeRechercheECEnseignant.style.opacity = '1';
  conteneur.append(rechercheECEnseignant, bouton, listeRechercheECEnseignant);

  const synchroniser = () => {
    const option = selectEC.options[selectEC.selectedIndex];
    rechercheECEnseignant.value = (option && option.value) ? option.textContent : '';
  };

  const masquerOptions = () => {
    listeRechercheECEnseignant.classList.add('hidden');
    conteneur.classList.remove('select-conteneur-actif');
    conteneur.style.zIndex = '';
    const carte = conteneur.closest('.bg-white, section');
    if (carte) {
      carte.classList.remove('carte-select-active');
      carte.style.zIndex = '';
    }
  };

  const afficherOptions = (texte = '') => {
    const filtre = texte.trim().toLowerCase();
    const options = [...selectEC.options].filter((option) =>
      option.value !== '' && (!filtre || option.textContent.toLowerCase().includes(filtre))
    );
    listeRechercheECEnseignant.innerHTML = options.length > 0
      ? options.map((option) => `<button type="button" class="option-recherche block w-full text-left px-3 py-2 transition-colors" data-value="${option.value}">${option.textContent}</button>`).join('')
      : '<div class="px-3 py-2 text-gray-500" style="background-color: #ffffff;">Aucune matière trouvée.</div>';
    listeRechercheECEnseignant.classList.remove('hidden');

    conteneur.classList.add('select-conteneur-actif');
    conteneur.style.zIndex = '1000';
    const carte = conteneur.closest('.bg-white, section');
    if (carte) {
      carte.classList.add('carte-select-active');
      carte.style.position = 'relative';
      carte.style.zIndex = '1000';
    }
  };

  rechercheECEnseignant.addEventListener('focus', () => {
    rechercheECEnseignant.select();
    afficherOptions('');
  });
  rechercheECEnseignant.addEventListener('click', () => {
    rechercheECEnseignant.select();
    afficherOptions('');
  });
  rechercheECEnseignant.addEventListener('input', () => {
    afficherOptions(rechercheECEnseignant.value);
  });
  bouton.addEventListener('click', () => {
    rechercheECEnseignant.focus();
    afficherOptions('');
  });
  listeRechercheECEnseignant.addEventListener('mousedown', (event) => {
    const option = event.target.closest('[data-value]');
    if (!option) return;
    selectEC.value = option.dataset.value;
    selectEC.dispatchEvent(new Event('change', { bubbles: true }));
    synchroniser();
    masquerOptions();
  });
  document.addEventListener('click', (event) => {
    if (!conteneur.contains(event.target)) masquerOptions();
  });

  selectEC._rechercheEC = { synchroniser, afficherOptions };
  synchroniser();
}

function synchroniserRechercheECEnseignant() {
  if (selectEC?._rechercheEC) selectEC._rechercheEC.synchroniser();
}

async function chargerStatistiquesEnseignant() {
  const statistiques = await appelApi('/enseignant/statistiques');
  document.getElementById('anneeStatistiquesEnseignant').textContent = `Année universitaire : ${statistiques.annee_universitaire}`;
  const cartes = [
    ['total_ec_affectes', 'Total des EC affectés', 'text-blue-900'],
    ['total_ec_avec_notes', 'EC avec au moins une note', 'text-green-700'],
    ['total_etudiants_sans_note', 'Étudiants sans note', 'text-orange-600']
  ];
  document.getElementById('cartesStatistiquesEnseignant').innerHTML = cartes.map(([cle, libelle, couleur]) => `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <p class="text-sm text-gray-500">${libelle}</p>
      <strong class="block mt-2 text-3xl ${couleur}">${statistiques[cle] || 0}</strong>
    </div>
  `).join('');
}

document.getElementById('btnRafraichirStatistiquesEnseignant').addEventListener('click', chargerStatistiquesEnseignant);

async function chargerProfilEnseignant() {
  const profil = await appelApi('/enseignant/profil');
  const valeur = (champ) => champ || '-';
  document.getElementById('contenuProfilEnseignant').innerHTML = `
    <div><span class="block text-gray-400 text-xs">Nom complet</span><strong class="text-gray-800 text-xs">${profil.nom_enseignant} ${profil.prenom_enseignant}</strong></div>
    <div><span class="block text-gray-400 text-xs">Matricule</span><strong class="text-blue-900 text-xs">${valeur(profil.matricule_enseignant)}</strong></div>
    <div><span class="block text-gray-400 text-xs">Sexe</span><strong class="text-gray-800 text-xs">${valeur(profil.sexe)}</strong></div>
    <div><span class="block text-gray-400 text-xs">Date de naissance</span><strong class="text-gray-800 text-xs">${formaterDate(profil.date_naissance)}</strong></div>
    <div><span class="block text-gray-400 text-xs">CIN</span><strong class="text-gray-800 text-xs">${valeur(profil.cin)}</strong></div>
    <div><span class="block text-gray-400 text-xs">Téléphone</span><strong class="text-gray-800 text-xs">${valeur(profil.tel_enseignant)}</strong></div>
    <div><span class="block text-gray-400 text-xs">Diplôme</span><strong class="text-gray-800 text-xs">${valeur(profil.diplome)}</strong></div>
    <div><span class="block text-gray-400 text-xs">Grade</span><strong class="text-gray-800 text-xs">${valeur(profil.grade)}</strong></div>
    <div><span class="block text-gray-400 text-xs">Spécialité</span><strong class="text-gray-800 text-xs">${valeur(profil.specialite)}</strong></div>
    <div class="col-span-2"><span class="block text-gray-400 text-xs">Établissement d'attache</span><strong class="text-gray-800 text-xs">${valeur(profil.mention_etabisement_attache)}</strong></div>
    <div class="col-span-2"><span class="block text-gray-400 text-xs">Email</span><strong class="text-gray-800 text-xs break-all">${profil.email_enseignant}</strong></div>
  `;
}

// --------------------------------------------------------------
// Sélecteur d'année universitaire (commence à 2024-2025)
// --------------------------------------------------------------
function genererAnneesUniversitaires() {
  const anneeDepart = 2024;
  const maintenant = new Date();
  const anneeCourante = maintenant.getFullYear();
  const fin = Math.max(anneeCourante + 3, 2030);
  const annees = [];
  for (let a = anneeDepart; a <= fin; a++) {
    annees.push(`${a}-${a + 1}`);
  }
  return annees;
}

function initialiserSelectAnnee() {
  const annees = genererAnneesUniversitaires();
  selectAnnee.innerHTML = annees.map((a) => `<option value="${a}">${a}</option>`).join('');
  // Sélectionne 2024-2025 ou l'année en cours
  const maintenant = new Date();
  const anneeCivile = maintenant.getFullYear();
  const anneeCourante = maintenant.getMonth() + 1 >= 9 ? `${anneeCivile}-${anneeCivile + 1}` : `${anneeCivile - 1}-${anneeCivile}`;
  selectAnnee.value = annees.includes(anneeCourante) ? anneeCourante : '2024-2025';
}

// --------------------------------------------------------------
// Onglets Étudiants / Dettes
// --------------------------------------------------------------
document.querySelectorAll('.onglet-ens-btn').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    document.querySelectorAll('.onglet-ens-btn').forEach((b) => {
      b.classList.remove('bg-blue-900', 'text-white');
      b.classList.add('bg-white', 'text-gray-700');
    });
    bouton.classList.add('bg-blue-900', 'text-white');
    bouton.classList.remove('bg-white', 'text-gray-700');

    const carteProfilEnseignant = document.getElementById('carteProfilEnseignant');
    const carteContexteEnseignant = document.getElementById('carteContexteEnseignant');

    if (bouton.dataset.onglet === 'profil') {
      carteProfilEnseignant.classList.remove('hidden');
      carteContexteEnseignant.classList.add('hidden');
      carteEtudiants.classList.add('hidden');
      carteDettes.classList.add('hidden');
    } else if (bouton.dataset.onglet === 'etudiants') {
      carteProfilEnseignant.classList.add('hidden');
      carteContexteEnseignant.classList.remove('hidden');
      carteDettes.classList.add('hidden');
      if (ecSelectionneCourant) carteEtudiants.classList.remove('hidden');
    } else {
      carteProfilEnseignant.classList.add('hidden');
      carteContexteEnseignant.classList.remove('hidden');
      carteEtudiants.classList.add('hidden');
      if (ecSelectionneCourant) { carteDettes.classList.remove('hidden'); chargerDettesPourEC(); }
    }
      majMessageChoixEC();
    if (window.innerWidth < 768) {
      fermerMenuMobileEnseignant();
    }
  });
});

document.addEventListener('click', (event) => {
  if (window.innerWidth >= 768) return;
  if (!ongletsEnseignant || !btnMenuMobileEnseignant) return;
  const cliqueDansNav = ongletsEnseignant.contains(event.target);
  const cliqueSurBouton = btnMenuMobileEnseignant.contains(event.target);
  if (!cliqueDansNav && !cliqueSurBouton && ongletsEnseignant.classList.contains('menu-open')) {
    fermerMenuMobileEnseignant();
  }
});

// --------------------------------------------------------------
// Chargement initial & Filtres Mention / Parcours / Niveau / EC
// --------------------------------------------------------------
async function initialiser() {
  initialiserSelectAnnee();
  try {
    await Promise.all([chargerProfilEnseignant(), chargerStatistiquesEnseignant()]);
    tousLesEC = await appelApi('/enseignant/mes-ec');
    if (tousLesEC.length === 0) {
      selectMention.innerHTML = '<option value="">Aucun EC affecté</option>';
      selectParcours.innerHTML = '<option value="">-</option>';
      selectNiveau.innerHTML = '<option value="">-</option>';
      selectEC.innerHTML = '<option value="">-</option>';
      initialiserRechercheECEnseignant();
      synchroniserRechercheECEnseignant();
      return;
    }
    remplirFiltres();
  } catch (erreur) {
    afficherMessage('messageErreur', erreur.message);
  }
}

function optionsUniques(tableau, cle) {
  return [...new Map(tableau.filter((item) => item[cle]).map((item) => [item[cle], item])).values()];
}

function remplirFiltres() {
  // 1. Remplir les Mentions
  const mentionsUniques = [...new Set(tousLesEC.map((ec) => ec.mention || '').filter(Boolean))].sort();
  selectMention.innerHTML = '<option value="">Toutes les mentions</option>' +
    mentionsUniques.map((m) => `<option value="${m}">${m}</option>`).join('');

  actualiserFiltresEtEC();
}

function actualiserFiltresEtEC() {
  const mentionChoisie = selectMention.value;
  const parcoursChoisi = selectParcours.value;
  const niveauChoisi = selectNiveau.value;

  // Filtrage du sous-ensemble des ECs
  let sousEnsemble = tousLesEC;
  if (mentionChoisie) {
    sousEnsemble = sousEnsemble.filter((ec) => ec.mention === mentionChoisie);
  }

  // 2. Mettre à jour la liste des Parcours selon la mention
  const parcoursUniques = optionsUniques(sousEnsemble, 'id_parcours');
  selectParcours.innerHTML = '<option value="">Tous les parcours</option>' +
    parcoursUniques.map((p) => `<option value="${p.id_parcours}">${p.nom_parcours} (${p.niveau})</option>`).join('');
  if (parcoursChoisi && parcoursUniques.some((p) => String(p.id_parcours) === String(parcoursChoisi))) {
    selectParcours.value = parcoursChoisi;
  }

  // Filtrage supplémentaire par parcours
  let sousEnsembleParcours = sousEnsemble;
  if (selectParcours.value) {
    sousEnsembleParcours = sousEnsembleParcours.filter((ec) => String(ec.id_parcours) === selectParcours.value);
  }

  // 3. Mettre à jour la liste des Niveaux selon mention + parcours
  const niveauxUniques = [...new Set(sousEnsembleParcours.map((ec) => ec.niveau).filter(Boolean))].sort();
  selectNiveau.innerHTML = '<option value="">Tous les niveaux</option>' +
    niveauxUniques.map((n) => `<option value="${n}">${n}</option>`).join('');
  if (niveauChoisi && niveauxUniques.includes(niveauChoisi)) {
    selectNiveau.value = niveauChoisi;
  }

  // 4. Mettre à jour la liste des EC disponibles
  let ecDisponibles = sousEnsembleParcours;
  if (selectNiveau.value) {
    ecDisponibles = ecDisponibles.filter((ec) => ec.niveau === selectNiveau.value);
  }

  // Déduplication des EC par id_EC pour l'affichage dans le select
  const mapEC = new Map();
  ecDisponibles.forEach((ec) => {
    if (!mapEC.has(ec.id_EC)) mapEC.set(ec.id_EC, ec);
  });
  const ecUniques = Array.from(mapEC.values());

  if (ecUniques.length === 0) {
    selectEC.innerHTML = '<option value="">-- Aucun EC correspondant --</option>';
    initialiserRechercheECEnseignant();
    synchroniserRechercheECEnseignant();
    masquerCartes();
    ecSelectionneCourant = null;
    majMessageChoixEC();
    return;
  }

  selectEC.innerHTML = '<option value="">-- Sélectionner un EC --</option>' +
    ecUniques.map((ec) => {
      const mentionTxt = ec.mention ? `[${ec.mention}] ` : '';
      return `<option value="${ec.id_EC}">${mentionTxt}${ec.nom_EC} (${ec.nom_parcours} - ${ec.niveau})</option>`;
    }).join('');
  initialiserRechercheECEnseignant();

  // Si l'EC précédemment sélectionné fait encore partie de la liste, on le conserve
  if (ecSelectionneCourant && ecUniques.some((ec) => ec.id_EC === ecSelectionneCourant.id_EC)) {
    selectEC.value = ecSelectionneCourant.id_EC;
  } else if (ecUniques.length === 1) {
    // Si un seul EC correspond aux filtres, sélection automatique
    selectEC.value = ecUniques[0].id_EC;
    selectionnerEC(ecUniques[0]);
  } else {
    masquerCartes();
    ecSelectionneCourant = null;
    majMessageChoixEC();
  }
  synchroniserRechercheECEnseignant();
}

selectMention.addEventListener('change', () => {
  selectParcours.value = '';
  selectNiveau.value = '';
  actualiserFiltresEtEC();
});

selectParcours.addEventListener('change', () => {
  selectNiveau.value = '';
  actualiserFiltresEtEC();
   if (ecSelectionneCourant && !carteEtudiants.classList.contains('hidden')) chargerEtudiantsEtNotes();
});

selectNiveau.addEventListener('change', () => {
  actualiserFiltresEtEC();
});

selectEC.addEventListener('change', async () => {
  const idEC = selectEC.value;
  masquerCartes();
  if (!idEC) { ecSelectionneCourant = null; majMessageChoixEC(); return; }
  const ec = tousLesEC.find((e) => String(e.id_EC) === idEC);
  if (ec) selectionnerEC(ec);
});

async function selectionnerEC(ec) {
  ecSelectionneCourant = ec;
  await chargerEtudiantsEtNotes();
  const ongletActif = document.querySelector('.onglet-ens-btn.bg-blue-900').dataset.onglet;
  if (ongletActif === 'etudiants') {
    carteEtudiants.classList.remove('hidden');
  } else {
    carteDettes.classList.remove('hidden');
    await chargerDettesPourEC();
  }
  majMessageChoixEC();
}

selectAnnee.addEventListener('change', () => {
  if (ecSelectionneCourant && !carteEtudiants.classList.contains('hidden')) chargerEtudiantsEtNotes();
});

// Affiche l'aide si l'onglet actif a besoin d'un EC et qu'aucun n'est choisi
function majMessageChoixEC() {
  const message = document.getElementById('messageChoixEC');
  if (!message) return;
  const bouton = document.querySelector('.onglet-ens-btn.bg-blue-900');
  const ongletActif = bouton ? bouton.dataset.onglet : null;
  const besoinEC = ongletActif === 'etudiants' || ongletActif === 'dettes';
  message.classList.toggle('hidden', !(besoinEC && !ecSelectionneCourant));
}

function masquerCartes() {
  carteEtudiants.classList.add('hidden');
  carteDettes.classList.add('hidden');
}

// --------------------------------------------------------------
// Étudiants de l'année sélectionnée + leurs notes
// --------------------------------------------------------------
async function chargerEtudiantsEtNotes() {
  try {
    const annee = selectAnnee.value;
    // Si un parcours est choisi, on n'affiche que les étudiants de CE parcours
    const idParcours = selectParcours.value;
    const filtreParcours = idParcours ? `&id_parcours=${encodeURIComponent(idParcours)}` : '';
    etudiantsCourants = await appelApi(`/enseignant/ec/${ecSelectionneCourant.id_EC}/etudiants?annee=${encodeURIComponent(annee)}${filtreParcours}`);
    //etudiantsCourants = await appelApi(`/enseignant/ec/${ecSelectionneCourant.id_EC}/etudiants?annee=${encodeURIComponent(annee)}`);
    afficherTableauEtudiants();
  } catch (erreur) {
    afficherMessage('messageErreur', erreur.message);
  }
}

function afficherTableauEtudiants() {
  if (etudiantsCourants.length === 0) {
    corpsTableau.innerHTML = '<tr><td colspan="5" class="px-4 py-4 text-gray-400 text-center">Aucun étudiant inscrit dans ce contexte pour cette année.</td></tr>';
    return;
  }
  corpsTableau.innerHTML = etudiantsCourants.map((etu) => `
    <tr>
      <td class="px-4 py-2 font-mono text-xs">${etu.numero_etudiant}</td>
      <td class="px-4 py-2 font-medium">${etu.nom_etudiant}</td>
      <td class="px-4 py-2">${etu.prenom_etudiant}</td>
      <td class="px-4 py-2">
        <div class="flex flex-wrap gap-2">
          ${etu.notes.map((n) => `
            <span class="inline-flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 text-xs">
              ${n.type_evaluation} : <strong>${parseFloat(n.note).toFixed(2)}</strong>
              <button data-id-note="${n.id_note}" class="btnModifierNote text-blue-700 hover:underline">✎</button>
              <button data-id-note="${n.id_note}" class="btnSupprimerNote text-red-600 hover:underline">✕</button>
            </span>
          `).join('') || '<span class="text-gray-400 text-xs">Aucune note saisie</span>'}
        </div>
      </td>
      <td class="px-4 py-2">
        <button data-numero="${etu.numero_etudiant}" class="btnNoterEtudiantDirect bg-blue-900 hover:bg-blue-800 text-white px-2.5 py-1 rounded text-xs transition">
          + Noter
        </button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.btnModifierNote').forEach((bouton) => {
    bouton.addEventListener('click', () => ouvrirModaleModification(bouton.dataset.idNote));
  });
  document.querySelectorAll('.btnSupprimerNote').forEach((bouton) => {
    bouton.addEventListener('click', () => supprimerNote(bouton.dataset.idNote));
  });
  document.querySelectorAll('.btnNoterEtudiantDirect').forEach((bouton) => {
    bouton.addEventListener('click', () => ouvrirModalePourEtudiant(bouton.dataset.numero));
  });
}

// --------------------------------------------------------------
// Étudiants en dette sur l'EC sélectionné
// --------------------------------------------------------------
async function chargerDettesPourEC() {
  try {
    dettesCourantes = await appelApi(`/enseignant/ec/${ecSelectionneCourant.id_EC}/dettes`);
    if (dettesCourantes.length === 0) {
      corpsTableauDettes.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-gray-400 text-center">Aucun étudiant en dette sur cet EC.</td></tr>';
      return;
    }
    corpsTableauDettes.innerHTML = dettesCourantes.map((d) => `
      <tr>
        <td class="px-4 py-2 font-mono text-xs">${d.numero_etudiant}</td>
        <td class="px-4 py-2 font-medium">${d.nom_etudiant} ${d.prenom_etudiant}</td>
        <td class="px-4 py-2">${d.annee_universitaire_origine}</td>
        <td class="px-4 py-2">
          <button data-numero="${d.numero_etudiant}" class="btnNoterDetteDirect bg-yellow-700 hover:bg-yellow-600 text-white px-2.5 py-1 rounded text-xs transition">
            + Noter rattrapage
          </button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.btnNoterDetteDirect').forEach((bouton) => {
      bouton.addEventListener('click', () => ouvrirModalePourDette(bouton.dataset.numero));
    });
  } catch (erreur) {
    afficherMessage('messageErreur', erreur.message);
  }
}

// --------------------------------------------------------------
// Modale d'ajout / modification de note
// --------------------------------------------------------------
function ouvrirModalePourEtudiant(numeroEtudiant) {
  modeModaleDette = false;
  document.getElementById('titreModale').textContent = 'Saisir une note';
  document.getElementById('idNote').value = '';
  document.getElementById('modaleEtudiant').disabled = false;
  document.getElementById('modaleEtudiant').innerHTML = etudiantsCourants
    .map((e) => `<option value="${e.numero_etudiant}">${e.nom_etudiant} ${e.prenom_etudiant}</option>`).join('');
  if (numeroEtudiant) document.getElementById('modaleEtudiant').value = numeroEtudiant;
  document.getElementById('modaleAnnee').value = selectAnnee.value;
  document.getElementById('modaleAnnee').readOnly = false;
  document.getElementById('modaleNoteValeur').value = '';
  document.getElementById('modaleType').value = 'Session Normale';
  document.getElementById('modaleDate').value = new Date().toISOString().slice(0, 10);
  ouvrirModale();
}

function ouvrirModalePourDette(numeroEtudiant) {
  if (dettesCourantes.length === 0) return;
  modeModaleDette = true;
  document.getElementById('titreModale').textContent = 'Saisir une note de rattrapage de dette';
  document.getElementById('idNote').value = '';
  document.getElementById('modaleEtudiant').disabled = false;
  document.getElementById('modaleEtudiant').innerHTML = dettesCourantes
    .map((d) => `<option value="${d.numero_etudiant}">${d.nom_etudiant} ${d.prenom_etudiant} (dette ${d.annee_universitaire_origine})</option>`).join('');
  if (numeroEtudiant) document.getElementById('modaleEtudiant').value = numeroEtudiant;
  document.getElementById('modaleAnnee').value = selectAnnee.value;
  document.getElementById('modaleAnnee').readOnly = false;
  document.getElementById('modaleNoteValeur').value = '';
  document.getElementById('modaleType').value = 'Rattrapage';
  document.getElementById('modaleDate').value = new Date().toISOString().slice(0, 10);
  ouvrirModale();
}

document.getElementById('btnAjouterNote').addEventListener('click', () => ouvrirModalePourEtudiant());
document.getElementById('btnAjouterNoteDette').addEventListener('click', () => ouvrirModalePourDette());

function ouvrirModaleModification(idNote) {
  let noteTrouvee = null;
  let etudiantProprietaire = null;
  for (const etu of etudiantsCourants) {
    const n = etu.notes.find((note) => String(note.id_note) === String(idNote));
    if (n) { noteTrouvee = n; etudiantProprietaire = etu; break; }
  }
  if (!noteTrouvee) return;

  modeModaleDette = false;
  document.getElementById('titreModale').textContent = 'Modifier la note';
  document.getElementById('idNote').value = idNote;
  document.getElementById('modaleEtudiant').innerHTML =
    `<option value="${etudiantProprietaire.numero_etudiant}">${etudiantProprietaire.nom_etudiant} ${etudiantProprietaire.prenom_etudiant}</option>`;
  document.getElementById('modaleEtudiant').disabled = true;
  document.getElementById('modaleAnnee').value = noteTrouvee.annee_universitaire;
  document.getElementById('modaleAnnee').readOnly = true; // on ne change pas l'année d'une note existante
  document.getElementById('modaleNoteValeur').value = noteTrouvee.note;
  document.getElementById('modaleType').value = noteTrouvee.type_evaluation;
  document.getElementById('modaleDate').value = noteTrouvee.date_evaluation.slice(0, 10);
  ouvrirModale();
}

function ouvrirModale() {
  modale.classList.remove('hidden');
  modale.classList.add('flex');
}
document.getElementById('btnFermerModale').addEventListener('click', () => {
  modale.classList.add('hidden');
  modale.classList.remove('flex');
});

document.getElementById('formNote').addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  const idNote = document.getElementById('idNote').value;
  const corps = {
    numero_etudiant: parseInt(document.getElementById('modaleEtudiant').value, 10),
    id_EC: ecSelectionneCourant.id_EC,
    annee_universitaire: document.getElementById('modaleAnnee').value.trim(),
    note: parseFloat(document.getElementById('modaleNoteValeur').value),
    type_evaluation: document.getElementById('modaleType').value, // Exemple: 'normale' ou 'rattrapage'
    date_evaluation: document.getElementById('modaleDate').value
  };

  // =====================================================================
  // VÉRIFICATION ANTI-DOUBLON (Session Normale / Rattrapage)
  // =====================================================================
  if (!idNote) { // On vérifie uniquement s'il s'agit d'un NOUVEL ajout
    const listeAControler = modeModaleDette ? dettesCourantes : etudiantsCourants;
    
    // Rechercher l'étudiant concerné dans la mémoire locale
    const etudiantTrouve = listeAControler.find(e => 
      parseInt(e.numero_etudiant, 10) === corps.numero_etudiant || 
      parseInt(e.id, 10) === corps.numero_etudiant
    );

    if (etudiantTrouve && etudiantTrouve.notes && Array.isArray(etudiantTrouve.notes)) {
      // Vérifier si une note possède déjà le même type d'évaluation pour cette année
      const noteDoublon = etudiantTrouve.notes.find(n => 
        n.type_evaluation === corps.type_evaluation && 
        n.annee_universitaire === corps.annee_universitaire
      );

      if (noteDoublon) {
        afficherMessage('messageErreur', `Erreur : Une note de session "${corps.type_evaluation}" existe déjà pour cet étudiant cette année, vous devez modifier la note existante au lieu d'en créer une nouvelle.`);
        return; // Bloque l'envoi vers l'API
      }
    }
  }
  // =====================================================================

  try {
    if (idNote) {
      await appelApi(`/enseignant/notes/${idNote}`, 'PUT', corps);
      afficherMessage('messageSucces', 'Note modifiée avec succès.', 'succes');
    } else {
      await appelApi('/enseignant/notes', 'POST', corps);
      afficherMessage('messageSucces', modeModaleDette ? 'Note de dette enregistrée. Si elle est ≥ 10, la dette est soldée automatiquement.' : 'Note enregistrée avec succès.', 'succes');
    }
    modale.classList.add('hidden');
    modale.classList.remove('flex');

    if (modeModaleDette) {
      await chargerDettesPourEC();
    } else {
      await chargerEtudiantsEtNotes();
    }
  } catch (erreur) {
    afficherMessage('messageErreur', erreur.message);
  }
});


async function supprimerNote(idNote) {
  if (!confirm('Supprimer définitivement cette note ?')) return;
  try {
    await appelApi(`/enseignant/notes/${idNote}`, 'DELETE');
    afficherMessage('messageSucces', 'Note supprimée.', 'succes');
    await chargerEtudiantsEtNotes();
  } catch (erreur) {
    afficherMessage('messageErreur', erreur.message);
  }
}

initialiser();
majMessageChoixEC();

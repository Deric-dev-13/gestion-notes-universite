// =====================================================================
// admin/app.js
// -----------------------------------------------------------------
// Logique de l'espace administrateur.
// Structure du fichier :
//   1. Gestion des onglets
//   2. Chargement + rendu par entité (parcours, UE, EC, enseignants, étudiants)
//   3. Formulaires de création
//   4. Onglet "Progression / Clôture d'année" : inscriptions annuelles,
//      clôture (promotion Admis/Admis avec dette/Redouble), historique
// =====================================================================

protegerPage('admin');

const getElement = (id) => {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`Élément admin manquant : #${id}`);
  }
  return element;
};

const optionsSelectsEnAttente = new WeakMap();
const selectsAvecMiseAJourDifferee = new WeakSet();
const selectsAvecRecherche = new WeakSet();

function initialiserRechercheSelect(select, placeholder, libelle) {
  if (!select || selectsAvecRecherche.has(select)) return;

  const conteneur = document.createElement('div');
  conteneur.className = 'relative';
  conteneur.style.position = 'relative';
  conteneur.style.overflow = 'visible';
  conteneur.style.zIndex = '1';
  select.parentNode.insertBefore(conteneur, select);
  conteneur.appendChild(select);
  select.style.display = 'none';

  const recherche = document.createElement('input');
  recherche.type = 'search';
  recherche.className = 'border rounded-lg px-3 py-2 w-full';
  recherche.style.width = '100%';
  recherche.style.paddingRight = '2.5rem';
  recherche.style.boxSizing = 'border-box';
  recherche.style.backgroundColor = '#ffffff';
  recherche.placeholder = placeholder;
  recherche.autocomplete = 'off';
  recherche.setAttribute('aria-label', libelle);

  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'absolute text-gray-600';
  bouton.style.position = 'absolute';
  bouton.style.right = '0.25rem';
  bouton.style.top = '50%';
  bouton.style.transform = 'translateY(-50%)';
  bouton.style.height = '2rem';
  bouton.style.width = '2rem';
  bouton.style.padding = '0';
  bouton.style.zIndex = '2';
  bouton.textContent = '▼';
  bouton.setAttribute('aria-label', `Afficher les ${libelle.toLowerCase()}`);

  const liste = document.createElement('div');
  liste.className = 'hidden absolute mt-1 w-full border border-gray-300 rounded-lg shadow-lg menu-deroulant-recherche';
  liste.style.position = 'absolute';
  liste.style.top = '100%';
  liste.style.left = '0';
  liste.style.width = '100%';
  liste.style.maxHeight = '15rem';
  liste.style.overflowY = 'auto';
  liste.style.overflowX = 'hidden';
  liste.style.zIndex = '1050';
  liste.style.backgroundColor = '#ffffff';
  liste.style.opacity = '1';
  conteneur.append(recherche, bouton, liste);

  const masquerOptions = () => {
    liste.classList.add('hidden');
    conteneur.classList.remove('select-conteneur-actif');
    conteneur.style.zIndex = '';
    const carte = conteneur.closest('.bg-white, section');
    if (carte) {
      carte.classList.remove('carte-select-active');
      carte.style.zIndex = '';
    }
  };

  const afficherOptions = (texte = '') => {
    document.querySelectorAll('.menu-deroulant-recherche').forEach((el) => {
      if (el !== liste) el.classList.add('hidden');
    });
    document.querySelectorAll('.select-conteneur-actif').forEach((el) => {
      if (el !== conteneur) {
        el.classList.remove('select-conteneur-actif');
        el.style.zIndex = '';
      }
    });
    document.querySelectorAll('.carte-select-active').forEach((el) => {
      el.classList.remove('carte-select-active');
      el.style.zIndex = '';
    });

    const filtre = texte.trim().toLowerCase();
    const options = [...select.options].filter((option) =>
      option.value !== '' && (!filtre || option.textContent.toLowerCase().includes(filtre))
    );
    liste.innerHTML = options.length > 0
      ? options.map((option) => `<button type="button" class="option-recherche block w-full text-left px-3 py-2 transition-colors" data-value="${option.value}">${option.textContent}</button>`).join('')
      : `<div class="px-3 py-2 text-gray-500" style="background-color: #ffffff;">Aucun ${libelle.toLowerCase()} trouvé.</div>`;
    liste.classList.remove('hidden');

    conteneur.classList.add('select-conteneur-actif');
    conteneur.style.zIndex = '1000';
    const carte = conteneur.closest('.bg-white, section');
    if (carte) {
      carte.classList.add('carte-select-active');
      carte.style.position = 'relative';
      carte.style.zIndex = '1000';
    }
  };

  const synchroniserTexte = () => {
    const option = select.options[select.selectedIndex];
    recherche.value = (option && option.value !== '') ? option.textContent : '';
  };

  recherche.addEventListener('focus', () => {
    recherche.select();
    afficherOptions('');
  });
  recherche.addEventListener('click', () => {
    recherche.select();
    afficherOptions('');
  });
  recherche.addEventListener('input', () => afficherOptions(recherche.value));
  bouton.addEventListener('click', () => {
    recherche.focus();
    afficherOptions('');
  });
  liste.addEventListener('mousedown', (event) => {
    const option = event.target.closest('[data-value]');
    if (!option) return;
    select.value = option.dataset.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    synchroniserTexte();
    masquerOptions();
  });
  document.addEventListener('click', (event) => {
    if (!conteneur.contains(event.target)) masquerOptions();
  });

  selectsAvecRecherche.add(select);
  select._rechercheSelect = { afficherOptions, synchroniserTexte };
  synchroniserTexte();
}

function mettreAJourOptionsSelect(select, options) {
  if (!select || select.innerHTML === options) return;

  if (document.activeElement === select) {
    optionsSelectsEnAttente.set(select, options);
    if (!selectsAvecMiseAJourDifferee.has(select)) {
      selectsAvecMiseAJourDifferee.add(select);
      select.addEventListener('blur', () => {
        const optionsEnAttente = optionsSelectsEnAttente.get(select);
        optionsSelectsEnAttente.delete(select);
        selectsAvecMiseAJourDifferee.delete(select);
        if (optionsEnAttente !== undefined) {
          mettreAJourOptionsSelect(select, optionsEnAttente);
        }
      });
    }
    return;
  }

  const valeurActuelle = select.value;
  select.innerHTML = options;
  if ([...select.options].some((option) => option.value === valeurActuelle)) {
    select.value = valeurActuelle;
  }
  if (select._rechercheSelect) {
    select._rechercheSelect.synchroniserTexte();
  }
}

const nomAdmin = getElement('nomAdmin');
if (nomAdmin) {
  nomAdmin.textContent = `${localStorage.getItem('prenom') || ''} ${localStorage.getItem('nom') || ''}`.trim();
}

/*const btnDeconnexion = getElement('btnDeconnexion');
if (btnDeconnexion) {
  btnDeconnexion.addEventListener('click', deconnexion);
}*/

const notificationAdmin = getElement('notification');
if (notificationAdmin) {
  notificationAdmin.classList.add('relative');

  const badgeNotifications = document.createElement('span');
  badgeNotifications.id = 'notification-badge-admin';
  badgeNotifications.className = 'absolute -top-1.5 -right-1 min-w-[14px] h-[14px] px-1 text-[8px] leading-[14px] text-center rounded-full bg-red-500 text-white font-semibold shadow-sm';
  badgeNotifications.textContent = '0';
  notificationAdmin.appendChild(badgeNotifications);

  const panneauNotifications = document.createElement('div');
  panneauNotifications.id = 'notification-panel';
  panneauNotifications.className = 'notification-panel hidden';
  document.body.appendChild(panneauNotifications);

  async function chargerNotificationsAdmin() {
    try {
      const items = await appelApi('/admin/notifications');
      const notifications = (Array.isArray(items) ? items : []).filter(item => item.id !== 'aucune');
      const total = notifications.length;
      badgeNotifications.textContent = total;
      badgeNotifications.classList.remove('hidden');

      panneauNotifications.innerHTML = `
        <div class="notification-header">Notifications</div>
        <ul class="notification-list">
          ${notifications.length > 0
            ? notifications.map((item) => `<li>${item.texte || 'Notification'}</li>`).join('')
            : '<li>Aucune notification en attente pour le moment.</li>'}
        </ul>
      `;
    } catch (erreur) {
      badgeNotifications.textContent = '0';
      badgeNotifications.classList.remove('hidden');
      panneauNotifications.innerHTML = `
        <div class="notification-header">Notifications</div>
        <ul class="notification-list">
          <li>Impossible de charger les notifications.</li>
        </ul>
      `;
    }
  }

  notificationAdmin.addEventListener('click', async () => {
    const estOuvert = !panneauNotifications.classList.contains('hidden');
    document.querySelectorAll('.notification-panel').forEach((panel) => panel.classList.add('hidden'));
    if (!estOuvert) {
      await chargerNotificationsAdmin();
      panneauNotifications.classList.remove('hidden');
    }
  });

  document.addEventListener('click', (event) => {
    if (!panneauNotifications.contains(event.target) && event.target !== notificationAdmin) {
      panneauNotifications.classList.add('hidden');
    }
  });

  chargerNotificationsAdmin();
}

const btnMenuMobile = getElement('btnMenuMobile');
const ongletsNav = getElement('ongletsNav');

if (ongletsNav && !getElement('btnDeconnexionMobileAdmin')) {
  const btnDeconnexionMobile = document.createElement('button');
  btnDeconnexionMobile.id = 'btnDeconnexionMobileAdmin';
  btnDeconnexionMobile.type = 'button';
  btnDeconnexionMobile.className = 'btn-deconnexion-mobile bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm mt-auto';
  btnDeconnexionMobile.textContent = 'Déconnexion';
  btnDeconnexionMobile.addEventListener('click', deconnexion);
  ongletsNav.appendChild(btnDeconnexionMobile);
}

function fermerMenuMobile() {
  if (!ongletsNav) return;
  ongletsNav.classList.remove('menu-open');
  if (btnMenuMobile) {
    btnMenuMobile.setAttribute('aria-expanded', 'false');
  }
}

function ouvrirMenuMobile() {
  if (!ongletsNav) return;
  ongletsNav.classList.add('menu-open');
  if (btnMenuMobile) {
    btnMenuMobile.setAttribute('aria-expanded', 'true');
  }
}

if (btnMenuMobile) {
  btnMenuMobile.addEventListener('click', () => {
    const estOuvert = ongletsNav.classList.contains('menu-open');
    if (estOuvert) {
      fermerMenuMobile();
    } else {
      ouvrirMenuMobile();
    }
  });
}

// --------------------------------------------------------------
// 1. Gestion des onglets
// --------------------------------------------------------------
document.querySelectorAll('.onglet-btn').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    const pageCible = getElement(`page-${bouton.dataset.onglet}`);
    if (!pageCible) {
      console.warn(`Page d'onglet introuvable : page-${bouton.dataset.onglet}`);
      return;
    }

    document.querySelectorAll('.onglet-btn').forEach((b) => {
      b.classList.remove('bg-blue-900', 'text-white');
      b.classList.add('bg-white', 'text-gray-700');
    });
    bouton.classList.add('bg-blue-900', 'text-white');
    bouton.classList.remove('bg-white', 'text-gray-700');

    document.querySelectorAll('.page-onglet').forEach((page) => page.classList.add('hidden'));
    pageCible.classList.remove('hidden');

    if (window.innerWidth < 768) {
      fermerMenuMobile();
    }
  });
});

document.addEventListener('click', (event) => {
  if (window.innerWidth >= 768) return;
  if (!ongletsNav || !btnMenuMobile) return;
  const cliqueDansNav = ongletsNav.contains(event.target);
  const cliqueSurBouton = btnMenuMobile.contains(event.target);
  if (!cliqueDansNav && !cliqueSurBouton && ongletsNav.classList.contains('menu-open')) {
    fermerMenuMobile();
  }
});

// --------------------------------------------------------------
// État en mémoire partagé entre les onglets
// --------------------------------------------------------------
let cacheParcours = [];
let cacheUE = [];
let cacheEC = [];
let cacheEnseignants = [];
let cacheEtudiants = [];

const libellesStatistiques = [
  ['etudiants_inscrits', 'Étudiants inscrits', 'text-green-700'],
  ['total_etudiants', 'Total étudiants', 'text-blue-900'],
  ['etudiants_en_attente', 'Étudiants en attente', 'text-orange-600'],
  ['enseignants_inscrits', 'Enseignants inscrits', 'text-green-700'],
  ['total_enseignants', 'Total enseignants', 'text-blue-900'],
  ['enseignants_en_attente', 'Enseignants en attente', 'text-orange-600'],
  ['total_ec', 'Total EC', 'text-indigo-700'],
  ['total_ue', 'Total UE', 'text-indigo-700'],
  ['total_mentions', 'Total mentions', 'text-purple-700'],
  ['total_parcours', 'Total parcours', 'text-purple-700']
];

async function chargerStatistiques() {
  const conteneurStatistiques = getElement('cartesStatistiques');
  if (!conteneurStatistiques) return;

  const statistiques = await appelApi('/admin/statistiques');
  conteneurStatistiques.innerHTML = libellesStatistiques.map(([cle, libelle, couleur]) => `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <p class="text-xs text-gray-500 leading-4">${libelle}</p>
      <strong class="block mt-2 text-2xl ${couleur}">${statistiques[cle] || 0}</strong>
    </div>
  `).join('');
}

// --------------------------------------------------------------
// 2. PARCOURS
// --------------------------------------------------------------
let rechercheParcours = '';
let parcoursEnModification = null;

function quitterModeModificationParcours() {
  parcoursEnModification = null;
  getElement('titreFormulaireParcours').textContent = 'Créer un parcours';
  getElement('btnEnregistrerParcours').textContent = 'Créer le parcours';
  getElement('btnAnnulerModificationParcours').classList.add('hidden');
  getElement('formCreerParcours').reset();
}

function entrerEnModeModificationParcours(parcours) {
  parcoursEnModification = parcours.id_parcours;
  getElement('parNom').value = parcours.nom_parcours;
  getElement('parNiveau').value = parcours.niveau;
  getElement('parMention').value = parcours.mention;
  getElement('parResponsableParcours').value = parcours.id_directeur || "";
  getElement('parResponsableMention').value = parcours.id_responsable_mention || "";
  getElement('titreFormulaireParcours').textContent = 'Modifier le parcours';
  getElement('btnEnregistrerParcours').textContent = 'Enregistrer les modifications';
  getElement('btnAnnulerModificationParcours').classList.remove('hidden');
  getElement('parNom').focus();
}

function afficherParcoursFiltres() {
  const corpsTableauParcours = getElement('corpsTableauParcours');
  if (!corpsTableauParcours) return;

  const texteRecherche = rechercheParcours.trim().toLowerCase();
  const parcoursFiltres = cacheParcours.filter((parcours) => [
    parcours.id_parcours,
    parcours.nom_parcours,
    parcours.niveau,
    parcours.mention
  ].filter(Boolean).join(' ').toLowerCase().includes(texteRecherche));

  corpsTableauParcours.innerHTML = parcoursFiltres.length > 0
    ? parcoursFiltres.map((p) => `
      <tr>
        <td class="px-3 py-2">${p.id_parcours}</td>
        <td class="px-3 py-2">${p.nom_parcours}</td>
        <td class="px-3 py-2">${p.niveau}</td>
        <td class="px-3 py-2">${p.mention}</td>
        <td class="px-3 py-2">
          <button type="button" class="text-blue-700 hover:text-blue-900 text-lg mr-3 btnModifierParcours" data-id="${p.id_parcours}" title="Modifier ce parcours" aria-label="Modifier ce parcours">&#9998;</button>
          <button class="text-red-600 hover:underline text-xs btnSupprimerParcours" data-id="${p.id_parcours}">Supprimer</button>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="5" class="px-3 py-6 text-center text-gray-400">Aucun parcours trouvé.</td></tr>';

  document.querySelectorAll('.btnSupprimerParcours').forEach((bouton) => {
    bouton.addEventListener('click', async () => {
      if (!confirm('Supprimer ce parcours ?')) return;
      try {
        await appelApi(`/admin/parcours/${bouton.dataset.id}`, 'DELETE');
        afficherMessage('messageSucces', 'Parcours supprimé.', 'succes');
        await Promise.all([chargerParcours(), remplirTousLesSelectsParcours()]);
      } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
    });
  });

  document.querySelectorAll('.btnModifierParcours').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const parcours = cacheParcours.find((element) => element.id_parcours === Number(bouton.dataset.id));
      if (parcours) entrerEnModeModificationParcours(parcours);
    });
  });
}

const rechercheParcoursInput = getElement('rechercheParcours');
if (rechercheParcoursInput) {
  rechercheParcoursInput.addEventListener('input', () => {
    rechercheParcours = rechercheParcoursInput.value;
    afficherParcoursFiltres();
  });
}

async function chargerParcours() {
  cacheParcours = await appelApi('/admin/parcours');
  afficherParcoursFiltres();
  remplirTousLesSelectsParcours();
  remplirSelectsResponsables();
}

function remplirSelectsResponsables() {
  const opts = '<option value="">Non renseigne</option>' + cacheEnseignants
    .filter((enseignant) => enseignant.actif)
    .map((enseignant) => '<option value="' + enseignant.id_enseignant + '">' + enseignant.prenom_enseignant + ' ' + enseignant.nom_enseignant + '</option>')
    .join('');
  ['parResponsableParcours', 'parResponsableMention'].forEach((id) => {
    const select = getElement(id);
    const valeur = select ? select.value : '';
    mettreAJourOptionsSelect(select, opts);
    if (select) select.value = valeur;
  });
}
function remplirTousLesSelectsParcours() {
  const options = cacheParcours.map((p) => `<option value="${p.id_parcours}">${p.nom_parcours} (${p.niveau})</option>`).join('');
  ['etuParcours', 'ueParcours', 'insParcours', 'insProgParcours'].forEach((idSelect) => {
    const el = getElement(idSelect);
    mettreAJourOptionsSelect(el, options);
    initialiserRechercheSelect(el, 'Rechercher un parcours...', 'parcours');
  });
  const elClot = getElement('clotParcoursSuivant');
  mettreAJourOptionsSelect(elClot, '<option value="">Parcours suivant (optionnel)</option>' + options);
  initialiserRechercheSelect(elClot, 'Rechercher un parcours...', 'parcours');
}

const formCreerParcours = getElement('formCreerParcours');
if (formCreerParcours) {
  formCreerParcours.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const donneesParcours = {
        nom_parcours: getElement('parNom')?.value || '',
        niveau: getElement('parNiveau')?.value || '',
        mention: getElement('parMention')?.value || '',
        id_directeur: getElement('parResponsableParcours')?.value || null,
        id_responsable_mention: getElement('parResponsableMention')?.value || null
      };
      if (parcoursEnModification) {
        await appelApi(`/admin/parcours/${parcoursEnModification}`, 'PUT', donneesParcours);
        afficherMessage('messageSucces', 'Parcours modifié.', 'succes');
      } else {
        await appelApi('/admin/parcours', 'POST', donneesParcours);
        afficherMessage('messageSucces', 'Parcours créé.', 'succes');
      }
      quitterModeModificationParcours();
      await chargerParcours();
    } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
  });
}

const btnAnnulerModificationParcours = getElement('btnAnnulerModificationParcours');
if (btnAnnulerModificationParcours) {
  btnAnnulerModificationParcours.addEventListener('click', quitterModeModificationParcours);
}

// --------------------------------------------------------------
// 3. UNITÉS D'ENSEIGNEMENT (UE) - catalogue, indépendant de l'année
// --------------------------------------------------------------
let rechercheUE = '';
let ueEnModification = null;

function quitterModeModificationUE() {
  ueEnModification = null;
  getElement('titreFormulaireUE').textContent = "Créer une unité d'enseignement";
  getElement('btnEnregistrerUE').textContent = 'Créer UE et rattacher au parcours';
  getElement('btnAnnulerModificationUE').classList.add('hidden');
  getElement('formCreerUE').reset();
}

function afficherUEFiltres() {
  const corps = getElement('corpsTableauUE');
  if (!corps) return;
  const texte = rechercheUE.trim().toLowerCase();
  const ues = cacheUE.filter((ue) => [ue.id_UE, ue.code_UE, ue.nom_UE, ue.niveau, ue.semestre]
    .filter(Boolean).join(' ').toLowerCase().includes(texte));
  corps.innerHTML = ues.length > 0 ? ues.map((ue) => `
    <tr>
      <td class="px-3 py-2">${ue.id_UE}</td><td class="px-3 py-2">${ue.code_UE || '-'}</td>
      <td class="px-3 py-2">${ue.nom_UE}</td><td class="px-3 py-2">${ue.niveau}</td>
      <td class="px-3 py-2">${ue.semestre}</td><td class="px-3 py-2">${ue.coefficient}</td>
      <td class="px-3 py-2 whitespace-nowrap">
        <button type="button" class="text-blue-700 hover:text-blue-900 text-lg mr-3 btnModifierUE" data-id="${ue.id_UE}" title="Modifier cette UE" aria-label="Modifier cette UE">&#9998;</button>
        <button type="button" class="text-red-600 hover:underline text-xs btnSupprimerUE" data-id="${ue.id_UE}">Supprimer</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="7" class="px-3 py-6 text-center text-gray-400">Aucune UE trouvée.</td></tr>';

  document.querySelectorAll('.btnModifierUE').forEach((bouton) => bouton.addEventListener('click', () => {
    const ue = cacheUE.find((element) => element.id_UE === Number(bouton.dataset.id));
    if (!ue) return;
    ueEnModification = ue.id_UE;
    getElement('ueCode').value = ue.code_UE || '';
    getElement('ueNom').value = ue.nom_UE;
    getElement('ueCoefficient').value = ue.coefficient;
    getElement('ueNiveau').value = ue.niveau;
    getElement('ueSemestre').value = ue.semestre;
    getElement('titreFormulaireUE').textContent = "Modifier l'unité d'enseignement";
    getElement('btnEnregistrerUE').textContent = 'Enregistrer les modifications';
    getElement('btnAnnulerModificationUE').classList.remove('hidden');
    getElement('ueNom').focus();
  }));
  document.querySelectorAll('.btnSupprimerUE').forEach((bouton) => bouton.addEventListener('click', async () => {
    if (!confirm('Supprimer cette UE ?')) return;
    try {
      await appelApi(`/admin/ue/${bouton.dataset.id}`, 'DELETE');
      afficherMessage('messageSucces', 'UE supprimée.', 'succes');
      await Promise.all([chargerUE(), chargerEC()]);
    } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
  }));
}

const rechercheUEInput = getElement('rechercheUE');
if (rechercheUEInput) rechercheUEInput.addEventListener('input', () => {
  rechercheUE = rechercheUEInput.value;
  afficherUEFiltres();
});

async function chargerUE() {
  cacheUE = await appelApi('/admin/ue');
  afficherUEFiltres();

  const ecUE = getElement('ecUE');
  if (ecUE) {
    mettreAJourOptionsSelect(ecUE, cacheUE
      .map((ue) => `<option value="${ue.id_UE}">${ue.nom_UE} (${ue.niveau} - ${ue.semestre})</option>`).join(''));
    initialiserRechercheSelect(ecUE, 'Rechercher une UE...', 'UE');
  }
}

const formCreerUE = getElement('formCreerUE');
if (formCreerUE) {
  formCreerUE.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const donneesUE = {
        code_UE: getElement('ueCode')?.value || null,
        nom_UE: getElement('ueNom')?.value || '',
        coefficient: parseFloat(getElement('ueCoefficient')?.value || '0'),
        niveau: getElement('ueNiveau')?.value || '',
        semestre: (getElement('ueSemestre')?.value || '').trim(),
        id_parcours: parseInt(getElement('ueParcours')?.value || '0', 10)
      };
      if (ueEnModification) {
        delete donneesUE.id_parcours;
        await appelApi(`/admin/ue/${ueEnModification}`, 'PUT', donneesUE);
        afficherMessage('messageSucces', 'UE modifiée.', 'succes');
      } else {
        await appelApi('/admin/ue', 'POST', donneesUE);
        afficherMessage('messageSucces', 'UE créée et rattachée au parcours.', 'succes');
      }
      quitterModeModificationUE();
      await chargerUE();
    } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
  });
}

const btnAnnulerModificationUE = getElement('btnAnnulerModificationUE');
if (btnAnnulerModificationUE) btnAnnulerModificationUE.addEventListener('click', quitterModeModificationUE);

// --------------------------------------------------------------
// 4. ÉLÉMENTS CONSTITUTIFS (EC) - catalogue, indépendant de l'année
// --------------------------------------------------------------
let rechercheEC = '';
let ecEnModification = null;

function quitterModeModificationEC() {
  ecEnModification = null;
  getElement('titreFormulaireEC').textContent = 'Créer un élément constitutif';
  getElement('btnEnregistrerEC').textContent = "Créer l'EC";
  getElement('btnAnnulerModificationEC').classList.add('hidden');
  getElement('formCreerEC').reset();
}

function afficherECFiltres() {
  const corps = getElement('corpsTableauEC');
  if (!corps) return;
  const texte = rechercheEC.trim().toLowerCase();
  const ecs = cacheEC.filter((ec) => [ec.id_EC, ec.nom_EC, ec.nom_UE, ec.niveau, ec.semestre]
    .filter(Boolean).join(' ').toLowerCase().includes(texte));
  corps.innerHTML = ecs.length > 0 ? ecs.map((ec) => `
    <tr>
      <td class="px-3 py-2">${ec.id_EC}</td><td class="px-3 py-2">${ec.nom_EC}</td>
      <td class="px-3 py-2">${ec.nom_UE}</td><td class="px-3 py-2">${ec.niveau}</td>
      <td class="px-3 py-2">${ec.semestre}</td><td class="px-3 py-2">${ec.credit}</td>
      <td class="px-3 py-2 whitespace-nowrap">
        <button type="button" class="text-blue-700 hover:text-blue-900 text-lg mr-3 btnModifierEC" data-id="${ec.id_EC}" title="Modifier cet EC" aria-label="Modifier cet EC">&#9998;</button>
        <button type="button" class="text-red-600 hover:underline text-xs btnSupprimerEC" data-id="${ec.id_EC}">Supprimer</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="7" class="px-3 py-6 text-center text-gray-400">Aucun EC trouvé.</td></tr>';

  document.querySelectorAll('.btnModifierEC').forEach((bouton) => bouton.addEventListener('click', () => {
    const ec = cacheEC.find((element) => element.id_EC === Number(bouton.dataset.id));
    if (!ec) return;
    ecEnModification = ec.id_EC;
    getElement('ecNom').value = ec.nom_EC;
    getElement('ecCredit').value = ec.credit;
    getElement('ecUE').value = ec.id_UE;
    getElement('titreFormulaireEC').textContent = "Modifier l'élément constitutif";
    getElement('btnEnregistrerEC').textContent = 'Enregistrer les modifications';
    getElement('btnAnnulerModificationEC').classList.remove('hidden');
    getElement('ecNom').focus();
  }));
  document.querySelectorAll('.btnSupprimerEC').forEach((bouton) => bouton.addEventListener('click', async () => {
    if (!confirm('Supprimer cet EC ?')) return;
    try {
      await appelApi(`/admin/ec/${bouton.dataset.id}`, 'DELETE');
      afficherMessage('messageSucces', 'EC supprimé.', 'succes');
      await Promise.all([chargerEC(), chargerAffectations()]);
    } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
  }));
}

const rechercheECInput = getElement('rechercheEC');
if (rechercheECInput) rechercheECInput.addEventListener('input', () => {
  rechercheEC = rechercheECInput.value;
  afficherECFiltres();
});

async function chargerEC() {
  cacheEC = await appelApi('/admin/ec');
  afficherECFiltres();

  const affEC = getElement('affEC');
  if (affEC) {
    mettreAJourOptionsSelect(affEC, cacheEC
      .map((ec) => `<option value="${ec.id_EC}">${ec.nom_EC} (${ec.niveau} - ${ec.semestre})</option>`).join(''));
    initialiserRechercheSelect(affEC, 'Rechercher un EC...', 'EC');
  }
}

const formCreerEC = getElement('formCreerEC');
if (formCreerEC) {
  formCreerEC.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const donneesEC = {
        nom_EC: getElement('ecNom')?.value || '',
        credit: parseFloat(getElement('ecCredit')?.value || '0'),
        id_UE: parseInt(getElement('ecUE')?.value || '0', 10)
      };
      if (ecEnModification) {
        await appelApi(`/admin/ec/${ecEnModification}`, 'PUT', donneesEC);
        afficherMessage('messageSucces', 'EC modifié.', 'succes');
      } else {
        await appelApi('/admin/ec', 'POST', donneesEC);
        afficherMessage('messageSucces', 'Élément constitutif créé.', 'succes');
      }
      quitterModeModificationEC();
      await chargerEC();
    } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
  });
}

const btnAnnulerModificationEC = getElement('btnAnnulerModificationEC');
if (btnAnnulerModificationEC) btnAnnulerModificationEC.addEventListener('click', quitterModeModificationEC);

// --------------------------------------------------------------
// 5. ENSEIGNANTS
// --------------------------------------------------------------
let filtreEnseignants = 'actifs';
let rechercheEnseignants = '';

function mettreAJourBoutonsFiltreEnseignants() {
  const btnActifs = getElement('btnEnseignantsActifs');
  const btnEnAttente = getElement('btnEnseignantsEnAttente');
  if (!btnActifs || !btnEnAttente) return;

  btnActifs.className = filtreEnseignants === 'actifs'
    ? 'bg-blue-900 text-white rounded-lg px-3 py-2 text-sm'
    : 'bg-white text-gray-700 border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm';
  btnEnAttente.className = filtreEnseignants === 'en-attente'
    ? 'bg-blue-900 text-white rounded-lg px-3 py-2 text-sm'
    : 'bg-white text-gray-700 border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm';
}

function afficherEnseignantsFiltres() {
  const corpsTableauEnseignants = getElement('corpsTableauEnseignants');
  if (!corpsTableauEnseignants) return;

  const texteRecherche = rechercheEnseignants.trim().toLowerCase();
  const enseignantsFiltres = cacheEnseignants.filter((enseignant) => {
    const correspondAuStatut = filtreEnseignants === 'actifs' ? Boolean(enseignant.actif) : !enseignant.actif;
    const texteEnseignant = [
      enseignant.id_enseignant,
      enseignant.nom_enseignant,
      enseignant.prenom_enseignant,
      enseignant.email_enseignant,
      enseignant.matricule_enseignant,
      enseignant.cin,
      enseignant.tel_enseignant
    ].filter(Boolean).join(' ').toLowerCase();
    return correspondAuStatut && (!texteRecherche || texteEnseignant.includes(texteRecherche));
  });

  corpsTableauEnseignants.innerHTML = enseignantsFiltres.length > 0
    ? enseignantsFiltres.map((enseignant) => `
      <tr>
        <td class="px-3 py-2">${enseignant.id_enseignant}</td>
        <td class="px-3 py-2">${enseignant.nom_enseignant} ${enseignant.prenom_enseignant}</td>
        <!--<td class="px-3 py-2 text-xs leading-5">Sexe : ${enseignant.sexe || '-'}<br>Date naissance : ${formaterDate(enseignant.date_naissance)}<br>CIN : ${enseignant.cin || '-'}<br>Tél. : ${enseignant.tel_enseignant || '-'}<br>Matricule : ${enseignant.matricule_enseignant || '-'}<br>Diplôme : ${enseignant.diplome || '-'}<br>Grade : ${enseignant.grade || '-'}<br>Spécialité : ${enseignant.specialite || '-'}<br>Établissement : ${enseignant.mention_etabisement_attache || '-'}<br>Responsabilite demandee : ${enseignant.role_responsabilite_demande || '-'}<br>Parcours concernes : ${enseignant.noms_parcours_responsabilite || '-'}</td>-->
        <td class="px-3 py-2">
         <button type="button" class="btnProfilDetails inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-900 hover:bg-blue-200" title="Voir le profil" aria-expanded="false">👤</button>
         <div class="profilDetails hidden mt-2 text-xs leading-5">Sexe : ${enseignant.sexe || '-'}<br>Date naissance : ${formaterDate(enseignant.date_naissance)}<br>CIN : ${enseignant.cin || '-'}<br>Tél. : ${enseignant.tel_enseignant || '-'}<br>Matricule : ${enseignant.matricule_enseignant || '-'}<br>Diplôme : ${enseignant.diplome || '-'}<br>Grade : ${enseignant.grade || '-'}<br>Spécialité : ${enseignant.specialite || '-'}<br>Établissement : ${enseignant.mention_etabisement_attache || '-'}<br>Responsabilite demandee : ${enseignant.role_responsabilite_demande || '-'}<br>Parcours concernes : ${enseignant.noms_parcours_responsabilite || '-'}</div>
        </td>
        <td class="px-3 py-2">${enseignant.email_enseignant}</td>
        <td class="px-3 py-2">${enseignant.actif ? '<span class="badge badge-valide">Actif</span>' : '<span class="badge badge-compensation">En attente</span>'}</td>
        <td class="px-3 py-2 space-x-2">
          ${enseignant.actif
            ? `<button class="text-red-600 hover:underline text-xs btnDesactiverEns" data-id="${enseignant.id_enseignant}">Désactiver</button>`
            : `<button class="text-green-700 hover:underline text-xs btnActiverEns" data-id="${enseignant.id_enseignant}">Activer</button>`}
          <button class="text-orange-600 hover:underline text-xs btnResetMdpEns" data-id="${enseignant.id_enseignant}">Réinit. mot de passe</button>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="6" class="px-3 py-6 text-center text-gray-400">Aucun enseignant trouvé.</td></tr>';

  document.querySelectorAll('.btnResetMdpEns').forEach((bouton) => {
    bouton.addEventListener('click', () => reinitialiserMotDePasse('enseignants', bouton.dataset.id));
  });
  document.querySelectorAll('.btnDesactiverEns').forEach((bouton) => {
    bouton.addEventListener('click', async () => {
      if (!confirm('Désactiver ce compte enseignant ?')) return;
      try {
        await appelApi(`/admin/enseignants/${bouton.dataset.id}/desactiver`, 'PUT');
        afficherMessage('messageSucces', 'Compte désactivé.', 'succes');
        await chargerEnseignants();
      } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
    });
  });
  document.querySelectorAll('.btnActiverEns').forEach((bouton) => {
    bouton.addEventListener('click', async () => {
      try {
        const reponse = await appelApi(`/admin/enseignants/${bouton.dataset.id}/activer`, 'PUT');
        afficherMessage('messageSucces', reponse.message, 'succes');
        await chargerEnseignants();
      } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
    });
  });
}

const rechercheEnseignantsInput = getElement('rechercheEnseignants');
if (rechercheEnseignantsInput) {
  rechercheEnseignantsInput.addEventListener('input', () => {
    rechercheEnseignants = rechercheEnseignantsInput.value;
    afficherEnseignantsFiltres();
  });
}

const btnEnseignantsActifs = getElement('btnEnseignantsActifs');
if (btnEnseignantsActifs) {
  btnEnseignantsActifs.addEventListener('click', () => {
    filtreEnseignants = 'actifs';
    mettreAJourBoutonsFiltreEnseignants();
    afficherEnseignantsFiltres();
  });
}

const btnEnseignantsEnAttente = getElement('btnEnseignantsEnAttente');
if (btnEnseignantsEnAttente) {
  btnEnseignantsEnAttente.addEventListener('click', () => {
    filtreEnseignants = 'en-attente';
    mettreAJourBoutonsFiltreEnseignants();
    afficherEnseignantsFiltres();
  });
}

async function chargerEnseignants() {
  cacheEnseignants = await appelApi('/admin/enseignants');
  remplirSelectsResponsables();
  mettreAJourBoutonsFiltreEnseignants();
  afficherEnseignantsFiltres();

  const affEnseignant = getElement('affEnseignant');
  if (affEnseignant) {
    mettreAJourOptionsSelect(affEnseignant, cacheEnseignants.map((e) => `<option value="${e.id_enseignant}">${e.nom_enseignant} ${e.prenom_enseignant}</option>`).join(''));
    initialiserRechercheSelect(affEnseignant, 'Rechercher un enseignant...', 'enseignant');
  }
  const ensParcoursDirige = getElement('ensParcoursDirige');
  if (ensParcoursDirige) {
    mettreAJourOptionsSelect(ensParcoursDirige, '<option value="">Directeur de parcours ? (optionnel)</option>' +
      cacheParcours.map((p) => `<option value="${p.id_parcours}">${p.nom_parcours}</option>`).join(''));
    initialiserRechercheSelect(ensParcoursDirige, 'Rechercher un parcours...', 'parcours');
  }
}

const formCreerEnseignant = getElement('formCreerEnseignant');
if (formCreerEnseignant) {
  formCreerEnseignant.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await appelApi('/admin/enseignants', 'POST', {
        nom: getElement('ensNom')?.value || '',
        prenom: getElement('ensPrenom')?.value || '',
        sexe: getElement('ensSexe')?.value || '',
        matricule: getElement('ensMatricule')?.value || '',
        date_naissance: getElement('ensDateNaissance')?.value || null,
        cin: getElement('ensCin')?.value || null,
        tel_enseignant: getElement('ensTel')?.value || null,
        diplome: getElement('ensDiplome')?.value || null,
        grade: getElement('ensGrade')?.value || null,
        specialite: getElement('ensSpecialite')?.value || null,
        mention_etabisement_attache: getElement('ensMentionEtablissement')?.value || null,
        email: getElement('ensEmail')?.value || '',
        mot_de_passe: getElement('ensMotDePasse')?.value || '',
        id_parcours: getElement('ensParcoursDirige')?.value || null
      });
      afficherMessage('messageSucces', 'Enseignant créé.', 'succes');
      e.target.reset();
      await chargerEnseignants();
    } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
  });
}

// --------------------------------------------------------------
// 6. ÉTUDIANTS
// --------------------------------------------------------------
let filtreEtudiants = 'actifs';
let rechercheEtudiants = '';

function mettreAJourBoutonsFiltreEtudiants() {
  const btnActifs = getElement('btnEtudiantsActifs');
  const btnEnAttente = getElement('btnEtudiantsEnAttente');
  if (!btnActifs || !btnEnAttente) return;

  btnActifs.className = filtreEtudiants === 'actifs'
    ? 'bg-blue-900 text-white rounded-lg px-3 py-2 text-sm'
    : 'bg-white text-gray-700 border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm';
  btnEnAttente.className = filtreEtudiants === 'en-attente'
    ? 'bg-blue-900 text-white rounded-lg px-3 py-2 text-sm'
    : 'bg-white text-gray-700 border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm';
}

function afficherEtudiantsFiltres() {
  const corpsTableauEtudiants = getElement('corpsTableauEtudiants');
  if (!corpsTableauEtudiants) return;

  const texteRecherche = rechercheEtudiants.trim().toLowerCase();
  const etudiantsFiltres = cacheEtudiants.filter((etudiant) => {
    const correspondAuStatut = filtreEtudiants === 'actifs' ? Boolean(etudiant.actif) : !etudiant.actif;
    const texteEtudiant = [
      etudiant.numero_etudiant,
      etudiant.nom_etudiant,
      etudiant.prenom_etudiant,
      etudiant.email_etudiant,
      etudiant.cin,
      etudiant.tel_etudiant
    ].filter(Boolean).join(' ').toLowerCase();
    return correspondAuStatut && (!texteRecherche || texteEtudiant.includes(texteRecherche));
  });

  corpsTableauEtudiants.innerHTML = etudiantsFiltres.length > 0
    ? etudiantsFiltres.map((etu) => {
      const parcours = cacheParcours.find((p) => p.id_parcours === etu.id_parcours);
      return `
        <tr>
          <td class="px-3 py-2">${etu.numero_etudiant}</td>
          <td class="px-3 py-2">${etu.nom_etudiant} ${etu.prenom_etudiant}</td>
          <!--<td class="px-3 py-2 text-xs leading-5">Sexe : ${etu.sexe || '-'}<br>Date naissance : ${formaterDate(etu.date_naissance)}<br>CIN : ${etu.cin || '-'}<br>Tél. : ${etu.tel_etudiant || '-'}</td>-->
          <td class="px-3 py-2">
            <button type="button" class="btnProfilDetails inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-900 hover:bg-blue-200" title="Voir le profil" aria-expanded="false">👤</button>
            <div class="profilDetails hidden mt-2 text-xs leading-5">Sexe : ${etu.sexe || '-'}<br>Date naissance : ${formaterDate(etu.date_naissance)}<br>CIN : ${etu.cin || '-'}<br>Tél. : ${etu.tel_etudiant || '-'}</div>
          </td>
          <td class="px-3 py-2">${etu.email_etudiant}</td>
          <td class="px-3 py-2">${parcours ? `${parcours.nom_parcours} (${parcours.niveau})` : '-'}</td>
          <td class="px-3 py-2">${etu.actif ? '<span class="badge badge-valide">Actif</span>' : '<span class="badge badge-compensation">En attente</span>'}</td>
          <td class="px-3 py-2 space-x-2">
            ${etu.actif
              ? `<button class="text-red-600 hover:underline text-xs btnDesactiverEtu" data-id="${etu.numero_etudiant}">Désactiver</button>`
              : `<button class="text-green-700 hover:underline text-xs btnActiverEtu" data-id="${etu.numero_etudiant}">Activer</button>`}
            <button class="text-orange-600 hover:underline text-xs btnResetMdpEtu" data-id="${etu.numero_etudiant}">Réinit. mot de passe</button>
          </td>
        </tr>
      `;
    }).join('')
    : '<tr><td colspan="7" class="px-3 py-6 text-center text-gray-400">Aucun étudiant trouvé.</td></tr>';

  document.querySelectorAll('.btnResetMdpEtu').forEach((bouton) => {
    bouton.addEventListener('click', () => reinitialiserMotDePasse('etudiants', bouton.dataset.id));
  });
  document.querySelectorAll('.btnDesactiverEtu').forEach((bouton) => {
    bouton.addEventListener('click', async () => {
      if (!confirm('Désactiver ce compte étudiant ?')) return;
      try {
        await appelApi(`/admin/etudiants/${bouton.dataset.id}/desactiver`, 'PUT');
        afficherMessage('messageSucces', 'Compte désactivé.', 'succes');
        await chargerEtudiants();
      } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
    });
  });
  document.querySelectorAll('.btnActiverEtu').forEach((bouton) => {
    bouton.addEventListener('click', async () => {
      try {
        const reponse = await appelApi(`/admin/etudiants/${bouton.dataset.id}/activer`, 'PUT');
        afficherMessage('messageSucces', reponse.message, 'succes');
        await chargerEtudiants();
      } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
    });
  });
}

const rechercheEtudiantsInput = getElement('rechercheEtudiants');
if (rechercheEtudiantsInput) {
  rechercheEtudiantsInput.addEventListener('input', () => {
    rechercheEtudiants = rechercheEtudiantsInput.value;
    afficherEtudiantsFiltres();
  });
}

const btnEtudiantsActifs = getElement('btnEtudiantsActifs');
if (btnEtudiantsActifs) {
  btnEtudiantsActifs.addEventListener('click', () => {
    filtreEtudiants = 'actifs';
    mettreAJourBoutonsFiltreEtudiants();
    afficherEtudiantsFiltres();
  });
}

const btnEtudiantsEnAttente = getElement('btnEtudiantsEnAttente');
if (btnEtudiantsEnAttente) {
  btnEtudiantsEnAttente.addEventListener('click', () => {
    filtreEtudiants = 'en-attente';
    mettreAJourBoutonsFiltreEtudiants();
    afficherEtudiantsFiltres();
  });
}

async function chargerEtudiants() {
  cacheEtudiants = await appelApi('/admin/etudiants');
  mettreAJourBoutonsFiltreEtudiants();
  afficherEtudiantsFiltres();

  const optionsEtudiants = cacheEtudiants.map((e) => `<option value="${e.numero_etudiant}">${e.nom_etudiant} ${e.prenom_etudiant} (n°${e.numero_etudiant})</option>`).join('');
  ['insEtudiant', 'insProgEtudiant', 'clotEtudiant'].forEach((idSelect) => {
    const el = getElement(idSelect);
    mettreAJourOptionsSelect(el, optionsEtudiants);
    initialiserRechercheSelect(el, 'Rechercher un étudiant...', 'étudiant');
  });

  // Historique : liste filtrable par mention / niveau / parcours
  if (!cacheParcours.length) cacheParcours = await appelApi('/admin/parcours');
  initialiserFiltresHistorique();
}

// --- Filtres Mention > Niveau > Parcours de la carte "Historique" ---
const ORDRE_NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2'];
const SEMESTRES_PAR_NIVEAU = { L1: ['S1', 'S2'], L2: ['S3', 'S4'], L3: ['S5', 'S6'], M1: ['S7', 'S8'], M2: ['S9', 'S10'] };
let histFiltresInitialises = false;

function optionsHtml(valeurs, libelleTous) {
  return `<option value="">${libelleTous}</option>` +
    valeurs.map((v) => `<option value="${v.valeur}">${v.libelle}</option>`).join('');
}

function rafraichirFiltresHistorique(source) {
  const elMention = getElement('histFiltreMention');
  const elNiveau = getElement('histFiltreNiveau');
  const elParcours = getElement('histFiltreParcours');
  const elEtudiant = getElement('histEtudiant');
  if (!elMention || !elNiveau || !elParcours || !elEtudiant) return;

  // 1) Mentions disponibles
  if (source === 'init') {
    const mentions = [...new Set(cacheParcours.map((p) => p.mention).filter(Boolean))].sort();
    elMention.innerHTML = optionsHtml(mentions.map((m) => ({ valeur: m, libelle: m })), 'Toutes les mentions');
  }
  const mention = elMention.value;

  // 2) Niveaux de la mention choisie
  if (source === 'init' || source === 'mention') {
    const niveaux = ORDRE_NIVEAUX.filter((n) => cacheParcours.some((p) => p.niveau === n && (!mention || p.mention === mention)));
    elNiveau.innerHTML = optionsHtml(niveaux.map((n) => ({ valeur: n, libelle: n })), 'Tous les niveaux');
  }
  const niveau = elNiveau.value;

  // 3) Parcours de la mention + niveau choisis
  if (source !== 'parcours') {
    const parcoursListe = cacheParcours.filter((p) => (!mention || p.mention === mention) && (!niveau || p.niveau === niveau));
    elParcours.innerHTML = optionsHtml(parcoursListe.map((p) => ({ valeur: p.id_parcours, libelle: `${p.nom_parcours} (${p.niveau})` })), 'Tous les parcours');
  }
  const idParcours = elParcours.value;

  // 4) Étudiants correspondant aux filtres
  const idsAutorises = new Set(cacheParcours
    .filter((p) => (!mention || p.mention === mention) && (!niveau || p.niveau === niveau) && (!idParcours || String(p.id_parcours) === idParcours))
    .map((p) => p.id_parcours));
  const filtres = cacheEtudiants.filter((e) => idsAutorises.has(e.id_parcours));
  const options = filtres.map((e) => `<option value="${e.numero_etudiant}">${e.nom_etudiant} ${e.prenom_etudiant} (n°${e.numero_etudiant})</option>`).join('');
  mettreAJourOptionsSelect(elEtudiant, options);
  if (!elEtudiant._rechercheSelect) initialiserRechercheSelect(elEtudiant, 'Rechercher un étudiant...', 'étudiant');
  else if (elEtudiant._rechercheSelect.synchroniserTexte) elEtudiant._rechercheSelect.synchroniserTexte();

  const compteur = getElement('histCompteur');
  if (compteur) compteur.textContent = `${filtres.length} étudiant(s) correspondent aux filtres.`;
  const resultat = getElement('resultatHistorique');
  if (resultat) resultat.innerHTML = '';
}

function initialiserFiltresHistorique() {
  rafraichirFiltresHistorique('init');
  if (histFiltresInitialises) return;
  histFiltresInitialises = true;
  getElement('histFiltreMention')?.addEventListener('change', () => rafraichirFiltresHistorique('mention'));
  getElement('histFiltreNiveau')?.addEventListener('change', () => rafraichirFiltresHistorique('niveau'));
  getElement('histFiltreParcours')?.addEventListener('change', () => rafraichirFiltresHistorique('parcours'));
}

const formCreerEtudiant = getElement('formCreerEtudiant');
if (formCreerEtudiant) {
  formCreerEtudiant.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await appelApi('/admin/etudiants', 'POST', {
        nom: getElement('etuNom')?.value || '',
        prenom: getElement('etuPrenom')?.value || '',
        date_naissance: getElement('etuDateNaissance')?.value || '',
        lieu_naissance: getElement('etuLieuNaissance')?.value?.trim() || null,
        sexe: getElement('etuSexe')?.value || '',
        cin: getElement('etuCin')?.value || null,
        tel_etudiant: getElement('etuTel')?.value || null,
        email: getElement('etuEmail')?.value || '',
        mot_de_passe: getElement('etuMotDePasse')?.value || '',
        id_parcours: parseInt(getElement('etuParcours')?.value || '0', 10),
        annee_universitaire: getElement('etuAnnee')?.value || undefined
      });
      afficherMessage('messageSucces', 'Étudiant créé et inscrit pour cette année.', 'succes');
      e.target.reset();
      await chargerEtudiants();
    } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
  });
}

async function reinitialiserMotDePasse(typeUtilisateur, id) {
  const nouveauMotDePasse = prompt('Nouveau mot de passe (6 caractères minimum) :');
  if (!nouveauMotDePasse) return;
  try {
    await appelApi(`/admin/${typeUtilisateur}/${id}/mot-de-passe`, 'PUT', { nouveau_mot_de_passe: nouveauMotDePasse });
    afficherMessage('messageSucces', 'Mot de passe réinitialisé.', 'succes');
  } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
}

// --------------------------------------------------------------
// 7. Affectations
// --------------------------------------------------------------
const formAffecterEnseignant = getElement('formAffecterEnseignant');
if (formAffecterEnseignant) {
  formAffecterEnseignant.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await appelApi('/admin/affectations/enseignant-ec', 'POST', {
        id_enseignant: parseInt(getElement('affEnseignant')?.value || '0', 10),
        id_EC: parseInt(getElement('affEC')?.value || '0', 10)
      });
      afficherMessage('messageSucces', 'Enseignant affecté avec succès.', 'succes');
      await chargerAffectations();
    } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
  });
}

let cacheAffectations = [];
let rechercheAffectations = '';

function afficherAffectationsFiltrees() {
  const corps = getElement('corpsTableauAffectations');
  if (!corps) return;

  const texteRecherche = rechercheAffectations.trim().toLowerCase();
  const affectationsFiltrees = cacheAffectations.filter((affectation) => [
    affectation.nom_enseignant,
    affectation.prenom_enseignant,
    affectation.nom_EC,
    affectation.nom_UE
  ].filter(Boolean).join(' ').toLowerCase().includes(texteRecherche));

  if (affectationsFiltrees.length === 0) {
    corps.innerHTML = '<tr><td colspan="4" class="px-3 py-4 text-gray-400 text-center">Aucune affectation trouvée.</td></tr>';
    return;
  }
  corps.innerHTML = affectationsFiltrees.map((affectation) => `
    <tr>
      <td class="px-3 py-2">${affectation.nom_enseignant} ${affectation.prenom_enseignant}</td>
      <td class="px-3 py-2">${affectation.nom_EC}</td>
      <td class="px-3 py-2">${affectation.nom_UE}</td>
      <td class="px-3 py-2">
        <button class="text-red-600 hover:underline text-xs btnAnnulerAffectation" data-enseignant="${affectation.id_enseignant}" data-ec="${affectation.id_EC}">Annuler</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.btnAnnulerAffectation').forEach((bouton) => {
    bouton.addEventListener('click', async () => {
      if (!confirm('Annuler cette affectation EC pour cet enseignant ?')) return;
      try {
        await appelApi(`/admin/affectations/enseignant-ec/${bouton.dataset.enseignant}/${bouton.dataset.ec}`, 'DELETE');
        afficherMessage('messageSucces', 'Affectation annulée.', 'succes');
        await chargerAffectations();
      } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
    });
  });
}

async function chargerAffectations() {
  cacheAffectations = await appelApi('/admin/affectations/enseignant-ec');
  afficherAffectationsFiltrees();
}

const rechercheAffectationsInput = getElement('rechercheAffectations');
if (rechercheAffectationsInput) {
  rechercheAffectationsInput.addEventListener('input', () => {
    rechercheAffectations = rechercheAffectationsInput.value;
    afficherAffectationsFiltrees();
  });
}

const btnRafraichirAffectations = getElement('btnRafraichirAffectations');
if (btnRafraichirAffectations) {
  btnRafraichirAffectations.addEventListener('click', chargerAffectations);
}

const formInscrireEtudiant = getElement('formInscrireEtudiant');
if (formInscrireEtudiant) {
  formInscrireEtudiant.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await appelApi('/admin/affectations/etudiant-parcours', 'POST', {
        numero_etudiant: parseInt(getElement('insEtudiant')?.value || '0', 10),
        id_parcours: parseInt(getElement('insParcours')?.value || '0', 10)
      });
      afficherMessage('messageSucces', 'Étudiant inscrit dans le parcours (parcours actuel mis à jour).', 'succes');
      await chargerEtudiants();
    } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
  });
}

// --------------------------------------------------------------
// 8. PROGRESSION / CLOTURE D'ANNEE (PROMOTION AUTOMATIQUE)
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

function initialiserSelectsAnneesAdmin() {
  const annees = genererAnneesUniversitaires();
  const options = annees.map((a) => `<option value="${a}">${a}</option>`).join('');

  const elGlob = getElement('clotGlobaleAnnee');
  mettreAJourOptionsSelect(elGlob, options);

  const elClot = getElement('clotAnnee');
  mettreAJourOptionsSelect(elClot, options);
}

// 8a. Créer/mettre à jour une inscription annuelle
const formCreerInscription = getElement('formCreerInscription');
if (formCreerInscription) {
  formCreerInscription.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await appelApi('/admin/inscriptions', 'POST', {
        numero_etudiant: parseInt(getElement('insProgEtudiant')?.value || '0', 10),
        id_parcours: parseInt(getElement('insProgParcours')?.value || '0', 10),
        annee_universitaire: (getElement('insProgAnnee')?.value || '').trim()
      });
      afficherMessage('messageSucces', 'Inscription annuelle enregistrée.', 'succes');
      e.target.reset();
      await chargerEtudiants();
    } catch (erreur) { afficherMessage('messageErreur', erreur.message); }
  });
}

// 8b. Clôture globale de l'année (Promotion & Redoublement automatiques de toute la promotion)
const formClotureGlobale = getElement('formClotureGlobale');
if (formClotureGlobale) {
  formClotureGlobale.addEventListener('submit', async (e) => {
    e.preventDefault();
    const annee = getElement('clotGlobaleAnnee')?.value || '';
    const btn = getElement('btnLancerClotureGlobale');
    const elResultat = getElement('resultatClotureGlobale');
    if (!btn || !elResultat) return;

    btn.disabled = true;
    btn.textContent = 'Vérification des notes...';

    try {
      const verification = await appelApi(`/admin/cloture-annee-globale/verifier?annee=${encodeURIComponent(annee)}`);
      const etudiantsSansNote = verification.etudiants_sans_note || [];

      if (etudiantsSansNote.length > 0) {
        const liste = etudiantsSansNote.map((etudiant) =>
          `- ${etudiant.numero_etudiant} : ${etudiant.nom_etudiant} ${etudiant.prenom_etudiant} (${etudiant.nom_parcours}, ${etudiant.niveau})`
        ).join('\n');
        elResultat.classList.remove('hidden');
        elResultat.innerHTML = `
          <div class="rounded border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
            <p class="font-semibold">Attention : ${etudiantsSansNote.length} étudiant(s) inscrit(s) n'ont aucune note pour ${annee}.</p>
            <p class="mt-1">Vérifiez leur situation avant de poursuivre la clôture :</p>
            <pre class="mt-2 whitespace-pre-wrap font-sans">${liste}</pre>
          </div>
        `;
        if (!confirm(`Attention : ${etudiantsSansNote.length} étudiant(s) n'ont aucune note pour ${annee}.\n\n${liste}\n\nVoulez-vous confirmer définitivement la clôture malgré ces notes manquantes ?`)) {
          return;
        }
      } else if (!confirm(`Aucun étudiant sans note n'a été trouvé pour ${annee}.\n\nConfirmer définitivement la clôture ?\nTous les étudiants ayant validé passeront automatiquement au niveau supérieur pour l'année suivante.`)) {
        return;
      }

      btn.textContent = 'Clôture en cours...';
      const reponse = await appelApi('/admin/cloture-annee-globale', 'POST', {
        annee_universitaire: annee,
        confirmer_sans_note: etudiantsSansNote.length > 0
      });
      elResultat.classList.remove('hidden');
      const r = reponse.rapport;
      elResultat.innerHTML = `
        <div class="space-y-2">
          <h4 class="font-bold text-blue-900 text-base">Résultats de la clôture ${annee} :</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
            <div class="bg-white p-2 rounded border"><span class="block text-gray-500">Total étudiants</span><strong>${r.total}</strong></div>
            <div class="bg-green-50 p-2 rounded border border-green-200 text-green-800"><span class="block text-green-600">Admis (Niveau +1)</span><strong>${r.admis}</strong></div>
            <div class="bg-yellow-50 p-2 rounded border border-yellow-200 text-yellow-800"><span class="block text-yellow-600">Admis avec dette</span><strong>${r.admis_avec_dette}</strong></div>
            <div class="bg-red-50 p-2 rounded border border-red-200 text-red-800"><span class="block text-red-600">Redoublants</span><strong>${r.redouble}</strong></div>
          </div>
          ${r.erreurs > 0 ? `<p class="text-xs text-red-600 font-semibold">${r.erreurs} étudiant(s) n'ont pas pu être traités (notes manquantes ou déjà clôturés).</p>` : ''}
        </div>
      `;
      afficherMessage('messageSucces', reponse.message, 'succes');
      await chargerEtudiants();
    } catch (erreur) {
      elResultat.classList.remove('hidden');
      elResultat.innerHTML = `<p class="text-red-600">${erreur.message}</p>`;
      afficherMessage('messageErreur', erreur.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '⚡ Clôturer l\'année & Promouvoir automatiquement';
    }
  });
}

// 8c. Clôturer individuellement un étudiant (Promotion automatique si non spécifié)
const formClotureAnnee = getElement('formClotureAnnee');
if (formClotureAnnee) {
  formClotureAnnee.addEventListener('submit', async (e) => {
    e.preventDefault();
    const elResultat = getElement('resultatCloture');
    if (!elResultat) return;
    try {
      const idParcoursSuivant = getElement('clotParcoursSuivant')?.value || '';
      const reponse = await appelApi('/admin/cloture-annee', 'POST', {
        numero_etudiant: parseInt(getElement('clotEtudiant')?.value || '0', 10),
        annee_universitaire: (getElement('clotAnnee')?.value || '').trim(),
        id_parcours_suivant: idParcoursSuivant ? parseInt(idParcoursSuivant, 10) : null
      });

      elResultat.classList.remove('hidden');
      const classeStatut = reponse.statut === 'Admis' ? 'text-green-700'
        : reponse.statut === 'Admis avec dette' ? 'text-yellow-700' : 'text-red-700';
      elResultat.innerHTML = `
        <p class="font-semibold ${classeStatut}">Résultat : ${reponse.statut}</p>
        ${reponse.dettes_ouvertes && reponse.dettes_ouvertes.length > 0
          ? `<p class="mt-2 text-gray-600">Dettes ouvertes sur : ${reponse.dettes_ouvertes.join(', ')}</p>`
          : '<p class="mt-2 text-gray-600">Aucune dette ouverte.</p>'}
      `;
      afficherMessage('messageSucces', reponse.message, 'succes');
      await chargerEtudiants();
    } catch (erreur) {
      elResultat.classList.remove('hidden');
      elResultat.innerHTML = `<p class="text-red-600">${erreur.message}</p>`;
      afficherMessage('messageErreur', erreur.message);
    }
  });
}

// 8d. Consulter l'historique complet d'un étudiant + relevés de notes officiels
const formVoirHistorique = getElement('formVoirHistorique');
if (formVoirHistorique) {
  formVoirHistorique.addEventListener('submit', async (e) => {
    e.preventDefault();
    const numero = getElement('histEtudiant')?.value || '';
    const elResultat = getElement('resultatHistorique');
    if (!elResultat) return;
    elResultat.innerHTML = '<p class="text-gray-400 text-sm">Chargement...</p>';
    try {
      const [inscriptions, dettes] = await Promise.all([
        appelApi(`/admin/etudiants/${numero}/inscriptions`),
        appelApi(`/admin/etudiants/${numero}/dettes`)
      ]);

      let html = '<div class="bg-gray-50 rounded-lg p-4"><h3 class="font-semibold text-sm text-gray-700 mb-2">Historique des inscriptions & Relevés</h3>';
      if (inscriptions.length === 0) {
        html += '<p class="text-sm text-gray-400">Aucune inscription enregistrée.</p>';
      } else {
        html += '<table class="w-full text-sm"><thead><tr class="text-left text-gray-500">' +
          '<th class="py-1">Année</th><th class="py-1">Parcours</th><th class="py-1">Niveau</th><th class="py-1">Statut</th><th class="py-1">Relevé officiel (PDF) par semestre</th></tr></thead><tbody>';
        for (const i of inscriptions) {
          html += `
            <tr class="border-t border-gray-100">
              <td class="py-1.5 font-medium">${i.annee_universitaire}</td>
              <td class="py-1.5">${i.nom_parcours}</td>
              <td class="py-1.5">${i.niveau}</td>
              <td class="py-1.5"><span class="badge ${i.statut === 'Admis' ? 'badge-valide' : i.statut === 'Admis avec dette' ? 'badge-compensation' : 'badge-non-valide'}">${i.statut}</span></td>
              <td class="py-1.5 space-x-2">
                ${(SEMESTRES_PAR_NIVEAU[i.niveau] || []).map((sem) => `
                <button class="text-blue-900 font-semibold hover:underline text-xs btnTelechargerReleveAdmin" data-numero="${numero}" data-annee="${i.annee_universitaire}" data-semestre="${sem}">
                  📄 ${sem}
                </button>`).join('')}
              </td>
            </tr>
          `;
        }
        html += '</tbody></table>';
      }
      html += '</div>';

      html += '<div class="bg-gray-50 rounded-lg p-4 mt-3"><h3 class="font-semibold text-sm text-gray-700 mb-2">Dettes</h3>';
      if (dettes.length === 0) {
        html += '<p class="text-sm text-gray-400">Aucune dette.</p>';
      } else {
        html += '<table class="w-full text-sm"><thead><tr class="text-left text-gray-500">' +
          '<th class="py-1">EC</th><th class="py-1">Origine</th><th class="py-1">Statut</th><th class="py-1">Soldée en</th></tr></thead><tbody>';
        for (const d of dettes) {
          html += `<tr><td class="py-1">${d.nom_EC}</td><td class="py-1">${d.annee_universitaire_origine}</td><td class="py-1">${d.statut}</td><td class="py-1">${d.annee_universitaire_soldee || '-'}</td></tr>`;
        }
        html += '</tbody></table>';
      }
      html += '</div>';

      elResultat.innerHTML = html;

      document.querySelectorAll('.btnTelechargerReleveAdmin').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const num = btn.dataset.numero;
          const annee = btn.dataset.annee;
          const sem = btn.dataset.semestre;
          try {
            const blob = await appelApi(`/admin/etudiants/${num}/releve/pdf?annee=${encodeURIComponent(annee)}&semestre=${sem}`, 'GET', null, { pdf: true });
            telechargerBlob(blob, `releve_${num}_${annee}_${sem}.pdf`);
          } catch (err) {
            afficherMessage('messageErreur', err.message);
          }
        });
      });

    } catch (erreur) {
      elResultat.innerHTML = `<p class="text-red-600 text-sm">${erreur.message}</p>`;
    }
  });
}

// --------------------------------------------------------------
// 9. DEMANDES DE RÉINITIALISATION DE MOT DE PASSE (MOT DE PASSE OUBLIÉ)
// --------------------------------------------------------------
async function chargerDemandesReinitialisation() {
  try {
    const demandes = await appelApi('/admin/demandes-reinitialisation');
    const corpsTableau = getElement('corpsTableauDemandes');
    const badge = getElement('badgeDemandesMdp');

    if (badge) {
      const enAttente = demandes.filter((d) => d.statut === 'En attente');
      if (enAttente.length > 0) {
        badge.textContent = enAttente.length;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    if (!corpsTableau) return;

    if (demandes.length === 0) {
      corpsTableau.innerHTML = '<tr><td colspan="7" class="px-3 py-4 text-gray-400 text-center">Aucune demande de réinitialisation.</td></tr>';
      return;
    }

    corpsTableau.innerHTML = demandes.map((d) => {
      const dateFormatee = new Date(d.date_demande).toLocaleString('fr-FR');

      return `
        <tr>
          <td class="px-3 py-2 font-mono text-xs">${d.id_demande}</td>
          <td class="px-3 py-2 font-medium">${d.email}</td>
          <td class="px-3 py-2 capitalize"><span class="badge ${d.role === 'admin' ? 'badge-non-valide' : d.role === 'enseignant' ? 'badge-compensation' : 'badge-valide'}">${d.role}</span></td>
          <td class="px-3 py-2 font-mono text-xs bg-gray-50 px-2 py-1 rounded">${d.mot_de_passe_souhaite}</td>
          <td class="px-3 py-2 text-xs text-gray-500">${dateFormatee}</td>
          <td class="px-3 py-2">
            <span class="badge ${d.statut === 'Traité' ? 'badge-valide' : d.statut === 'En attente' ? 'badge-compensation' : 'badge-non-valide'}">
              ${d.statut}
            </span>
          </td>
          <td class="px-3 py-2 space-x-2">
            ${d.statut === 'En attente' ? `
              <button data-id="${d.id_demande}" class="btnTraiterDemande bg-green-700 hover:bg-green-600 text-white px-2.5 py-1 rounded text-xs transition">
                ✓ Valider & Réinitialiser
              </button>
              <button data-id="${d.id_demande}" class="btnRejeterDemande text-red-600 hover:underline text-xs">
                ✕ Rejeter
              </button>
            ` : `
              <span class="text-green-700 text-xs font-medium">${d.statut === 'Traité' ? 'Email envoyé automatiquement' : 'Demande clôturée'}</span>
            `}
            <button data-id="${d.id_demande}" class="btnSupprimerDemande text-red-600 hover:underline text-xs">
              🗑 Supprimer
            </button>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.btnTraiterDemande').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const rep = await appelApi(`/admin/demandes-reinitialisation/${btn.dataset.id}/traiter`, 'POST');
          afficherMessage('messageSucces', rep.message, 'succes');
          await chargerDemandesReinitialisation();
        } catch (err) {
          afficherMessage('messageErreur', err.message);
        }
      });
    });

    document.querySelectorAll('.btnRejeterDemande').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Rejeter cette demande de réinitialisation ?')) return;
        try {
          await appelApi(`/admin/demandes-reinitialisation/${btn.dataset.id}/rejeter`, 'POST');
          afficherMessage('messageSucces', 'Demande rejetée.', 'succes');
          await chargerDemandesReinitialisation();
        } catch (err) {
          afficherMessage('messageErreur', err.message);
        }
      });
    });

    document.querySelectorAll('.btnSupprimerDemande').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer définitivement cette demande de réinitialisation ?')) return;
        try {
          await appelApi(`/admin/demandes-reinitialisation/${btn.dataset.id}`, 'DELETE');
          afficherMessage('messageSucces', 'Demande supprimée.', 'succes');
          await chargerDemandesReinitialisation();
        } catch (err) {
          afficherMessage('messageErreur', err.message);
        }
      });
    });

  } catch (erreur) {
    afficherMessage('messageErreur', erreur.message);
  }
}

const btnRafraichirDemandes = getElement('btnRafraichirDemandes');
if (btnRafraichirDemandes) {
  btnRafraichirDemandes.addEventListener('click', chargerDemandesReinitialisation);
}


// Icône « profil » : affiche / masque les informations détaillées dans la cellule
document.addEventListener('click', (event) => {
  const bouton = event.target.closest('.btnProfilDetails');
  if (!bouton) return;
  const details = bouton.parentElement.querySelector('.profilDetails');
  if (!details) return;
  const ouvert = !details.classList.contains('hidden');
  details.classList.toggle('hidden', ouvert);
  bouton.setAttribute('aria-expanded', String(!ouvert));
  bouton.title = ouvert ? 'Voir le profil' : 'Masquer le profil';
});

// --------------------------------------------------------------
// 10. Chargement initial
// --------------------------------------------------------------
async function initialiser() {
  try {
    initialiserSelectsAnneesAdmin();
    await chargerStatistiques();
    await chargerParcours();
    await Promise.all([chargerUE(), chargerEnseignants(), chargerEtudiants(), chargerDemandesReinitialisation(), chargerAffectations()]);
    await chargerEC();
  } catch (erreur) {
    afficherMessage('messageErreur', erreur.message);
  }
}

const btnRafraichirStatistiques = getElement('btnRafraichirStatistiques');
if (btnRafraichirStatistiques) {
  btnRafraichirStatistiques.addEventListener('click', chargerStatistiques);
}

initialiser();


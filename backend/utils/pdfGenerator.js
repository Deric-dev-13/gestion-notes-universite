// =====================================================================
// utils/pdfGenerator.js
// -----------------------------------------------------------------
// Générateur de relevé de notes officiel LMD au format PDFKit
// Conforme aux normes universitaires officielles LMD
// =====================================================================

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// ─── Textes affichés sur le PDF (la base de données reste inchangée) ───
// Format : 'Nom EXACT en base' : 'Texte à afficher sur le PDF'
const AFFICHAGE_MENTION = {
  'EADIMI': 'EDUCATION APPRENTISSAGE DIDACTIQUE ET INGENIERIE EN MATHEMATIQUE-INFORMATIQUE',
  'EADIM': 'EDUCATION APPRENTISSAGE DIDACTIQUE ET INGENIERIE EN MECANIQUE',
  'EADIGC-SM': 'EDUCATION APPRENTISSAGE DIDACTIQUE ET INGENIERIE EN GENIE CIVIL ET SUTRICTURE-METALIQUE',
  'EADIEE': 'EDUCATION APPRENTISSAGE DIDACTIQUE ET INGENIERIE EN ELECTRIQUE',
  'EADISS': 'EDUCATION APPRENTISSAGE DIDACTIQUE ET INGENIERIE EN SCIENCE SOCIALE',
  'MEF': 'MEF',
};

const AFFICHAGE_PARCOURS = {
  // ... ajoute une ligne par parcours
  'PEG- Informatique (IAD)': 'PROFESSORAT D\'ENSEIGNEMENT EN GENIE INFORMATIQUE',
  'PEG-Informatique': 'PROFESSORAT D\'ENSEIGNEMENT EN GENIE INFORMATIQUE',
  'PEG-Informatique (IAD)': 'PROFESSORAT D\'ENSEIGNEMENT EN GENIE INFORMATIQUE',
  'PEG-Informatique (MSI)': 'PROFESSORAT D\'ENSEIGNEMENT EN GENIE INFORMATIQUE',
  'PEG-Mathématiques': 'PROFESSORAT D\'ENSEIGNEMENT EN GENIE MATHEMATIQUE',
  'PEG-Mathématiques (MD)': 'PROFESSORAT D\'ENSEIGNEMENT EN GENIE MATHEMATIQUE',
  'PEG-Mathématiques (MS)': 'PROFESSORAT D\'ENSEIGNEMENT EN GENIE MATHEMATIQUE',
  'Tronc Commun': 'PROFESSORAT D\'ENSEIGNEMENT EN GENIE MATHEMATIQUE ET INFORMATIQUE',

  'PEG-Électrique': 'PROFESSORAT D\'ENSEIGNEMENT EN GENIE ELECTRIQUE',
};

const texteMention  = (m) => AFFICHAGE_MENTION[(m || '').trim()]  || m;
const texteParcours = (p) => AFFICHAGE_PARCOURS[(p || '').trim()] || p;

function genererMention(moyenne) {
  if (moyenne === null || isNaN(moyenne)) return 'N/A';
  if (moyenne >= 16) return 'Très Bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez Bien';
  if (moyenne >= 10) return 'Passable';
  return 'Ajourné';
}

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

// Statut d'une UE : Validée (>=10), ou Non validée (<10). Une note
// éliminatoire (< 3/20 sur un de ses EC) force "Non validée" même si la
// moyenne pondérée affichée atteint 10/20 (compensation interne bloquée).
// Le seuil de compensation entre UE se joue au niveau du semestre
// (voir calculerResultatSemestre côté modèle), pas ici : pas de palier
// intermédiaire à 8/20 pour une UE prise isolément.
function genererStatutUE(moyenne, elimine) {
  if (elimine) return { code: 'NV', label: 'NV' };
  if (moyenne === null || isNaN(moyenne)) return { code: '-', label: 'N/A' };
  if (moyenne >= 10) return { code: 'V', label: 'V' };
  return { code: 'NV', label: 'NV' };
}

function calculerDecisionSession(releve, session) {
  const semestres = Object.keys(releve.semestres || {}).sort();
  if (semestres.length !== 2) return null;

  const resultatKey = session === 'rattrapage' ? 'resultatRattrapage' : 'resultatNormale';
  const validations = semestres.map((nomSemestre) =>
    releve.semestres[nomSemestre][resultatKey] !== 'Non validé'
  );

  if (validations.every(Boolean)) return 'Admis';
  if (validations.some(Boolean)) return 'Admis avec dette';
  return 'Redouble';
}

// Recherche de logo sur disque
function chercherCheminLogo(nomsFichiers) {
  const dossiers = [
    path.join(__dirname, '../assets'),
    path.join(__dirname, '../../frontend/assets'),
    path.join(__dirname, '../../frontend/photos'),
    path.join(__dirname, '../../assets')
  ];

  for (const dossier of dossiers) {
    for (const nom of nomsFichiers) {
      const p = path.join(dossier, nom);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

// Dessine un emblème vectoriel institutionnel si l'image n'est pas encore sur le disque
function dessinerEmblemeEtablissement(doc, x, y, size) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2 - 2;

  doc.save();
  doc.circle(cx, cy, r).lineWidth(1.5).strokeColor('#1e3a8a').stroke();
  doc.circle(cx, cy, r - 3).lineWidth(0.8).strokeColor('#3b82f6').stroke();
  doc.circle(cx, cy, r - 4).fillColor('#f0f9ff').fill();

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e3a8a')
     .text('ENSET', cx - 20, cy - 8, { width: 40, align: 'center' });
  doc.font('Helvetica').fontSize(5.5).fillColor('#475569')
     .text('ÉTABLISSEMENT', cx - 22, cy + 4, { width: 44, align: 'center' });
  doc.restore();
}

function dessinerEmblemeUniversite(doc, x, y, size) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2 - 2;

  doc.save();
  doc.circle(cx, cy, r).lineWidth(1.5).strokeColor('#1e3a8a').stroke();
  doc.circle(cx, cy, r - 3).lineWidth(0.8).strokeColor('#eab308').stroke();
  doc.circle(cx, cy, r - 4).fillColor('#fefce8').fill();

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e3a8a')
     .text('UNIV', cx - 18, cy - 8, { width: 36, align: 'center' });
  doc.font('Helvetica').fontSize(5.5).fillColor('#854d0e')
     .text('ANTSIRANANA', cx - 22, cy + 4, { width: 44, align: 'center' });
  doc.restore();
}

function formaterDateNaissance(valeur) {
  if (!valeur) return '';
  const brut = typeof valeur === 'string' ? valeur.slice(0, 10) : `${valeur.getFullYear()}-${String(valeur.getMonth() + 1).padStart(2, '0')}-${String(valeur.getDate()).padStart(2, '0')}`;
  const [annee, mois, jour] = brut.split('-').map(Number);
  const moisNoms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return annee && moisNoms[mois - 1] ? `${String(jour).padStart(2, '0')} ${moisNoms[mois - 1]} ${annee}` : '';
}

// Si "semestre" est fourni (ex. 'S3') : le PDF ne contient QUE ce semestre,
// sur une seule page, et la session est choisie automatiquement :
//   - au moins une note de rattrapage dans le semestre -> résultat du rattrapage
//   - sinon -> résultat de la session normale
// Sans "semestre", l'ancien comportement (tous les semestres de l'année,
// session imposée par le paramètre "session") est conservé.
function genererPDFReleve({ res, infosEtudiant, annee, session, semestre, releve }) {
  const semestreDemande = semestre ? String(semestre).toUpperCase() : null;
  const donneesSemestreDemande = semestreDemande ? (releve.semestres || {})[semestreDemande] : null;
  const sessionNormalisee = semestreDemande
    ? (donneesSemestreDemande && donneesSemestreDemande.aRattrapage ? 'rattrapage' : 'normale')
    : (session === 'rattrapage' ? 'rattrapage' : 'normale');
  //const mentionEtudiant = releve.mention || infosEtudiant.mention || 'Mention non renseignée';
  const mentionBase = releve.mention || infosEtudiant.mention || '';
  const mentionEtudiant = texteMention(mentionBase) || 'Mention non renseignée';
  const departementTexte = `Département de ${mentionEtudiant}`;
 

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 22,
    autoFirstPage: true,
    info: {
      Title: `Relevé de notes officiel LMD - ${infosEtudiant.nom_etudiant} ${infosEtudiant.prenom_etudiant} - ${annee}`,
      Author: `Université d'Antsiranana - ENSET - ${departementTexte}`,
      Subject: 'Relevé de notes officiel LMD'
    }
  });

  res.setHeader('Content-Type', 'application/pdf');
  const filename = semestreDemande
    ? `releve_${infosEtudiant.numero_etudiant}_${annee}_${semestreDemande}.pdf`
    : `releve_${infosEtudiant.numero_etudiant}_${annee}_${sessionNormalisee}.pdf`;
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  doc.pipe(res);

  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 22;
  const contentWidth = pageWidth - margin * 2;
  const diplomePrepare = /^L/i.test(releve.niveau || '') ? 'LAPEN (Licence d’Aptitude au Professorat de l’École Normale)' : /^M/i.test(releve.niveau || '') ? 'MAPEN (Master d’Aptitude au Professorat de l’École Normale)' : 'Non renseigne';
  const dateNaissance = formaterDateNaissance(infosEtudiant.date_naissance);
  const dateEtLieuNaissance = [dateNaissance, infosEtudiant.lieu_naissance].filter(Boolean).join(' \u00e0 ') || 'Non renseigne';
  const dessinerBordureOrnementale = (y, bas = false) => {
    const pas = 38;
    const ligne = bas ? pageHeight - 10 : 10;
    const pointe = bas ? pageHeight - 2 : 2;
    doc.save().lineWidth(0.45).strokeColor('#9aa8bd');
    doc.moveTo(18, ligne).lineTo(pageWidth - 18, ligne).stroke();
    for (let cx = 18 + pas / 2; cx < pageWidth - 18; cx += pas) {
      doc.moveTo(cx - 18, ligne)
        .bezierCurveTo(cx - 15, pointe, cx - 6, pointe, cx, ligne)
        .bezierCurveTo(cx + 6, pointe, cx + 15, pointe, cx + 18, ligne).stroke();
      doc.moveTo(cx - 11, ligne)
        .bezierCurveTo(cx - 9, bas ? ligne - 4 : ligne + 4, cx - 3, bas ? ligne - 4 : ligne + 4, cx, ligne)
        .bezierCurveTo(cx + 3, bas ? ligne - 4 : ligne + 4, cx + 9, bas ? ligne - 4 : ligne + 4, cx + 11, ligne).stroke();
      doc.moveTo(cx, bas ? ligne - 4 : ligne + 4).lineTo(cx, bas ? ligne - 1 : ligne + 1).stroke();
    }
    doc.restore();
  };
  const dessinerCadrePage = () => {
    doc.save().lineWidth(0.7).strokeColor('#1e3a8a').rect(9, 9, pageWidth - 18, pageHeight - 18).stroke();
    doc.lineWidth(0.35).strokeColor('#93c5fd').rect(13, 13, pageWidth - 26, pageHeight - 26).stroke().restore();
    dessinerBordureOrnementale(2, false);
    dessinerBordureOrnementale(pageHeight - 12, true);
  };
  function dessinerTexteEnteteAcademique(y) {
    const centreX = margin + logoSize + 6;
    const centreW = contentWidth - (logoSize * 2) - 12;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a8a')
      .text("UNIVERSITE D'ANTSIRANANA", centreX, y + 3, { width: centreW, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a')
      .text("ECOLE NORMALE SUPERIEURE POUR L'ENSEIGNEMENT TECHNIQUE (ENSET)", centreX, y + 18, { width: centreW, align: 'center' });
    const x = margin + 72;
    const line = (label, value, yy) => {
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e3a8a').text(label, x, yy, { continued: true });
      doc.font('Helvetica').fontSize(7.5).fillColor('#0f172a').text(value || 'Non renseigne', { width: contentWidth - 100 });
    };
    line('Domaine : ', "SCIENCES DE L'EDUCATION", y + 47);
    line('Mention : ', mentionEtudiant, y + 58);
    line('Parcours : ', texteParcours(releve.nom_parcours) || 'Tronc Commun', y + 69);
                        //releve.nom_parcours || 'Tronc Commun'
    line('Cursus : ', 'ACADEMIQUE ET PROFESSIONNALISANT', y + 80);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e3a8a')
      .text('Annee universitaire : ', pageWidth - margin - 190, y + 91, { continued: true });
    doc.font('Helvetica').fontSize(7.5).fillColor('#0f172a').text(String(annee));
    return y + 103;
  }
  dessinerCadrePage();

  // =====================================================================
  // 1. EN-TÊTE OFFICIEL AVEC LOGOS (GAUCHE = ÉTABLISSEMENT, DROITE = UNIVERSITÉ)
  // =====================================================================
  const headerY = 16;
  const logoSize = 46;

  // Logo Établissement (À GAUCHE)
  const cheminLogoEtab = chercherCheminLogo([
    'logo_etablissement.png', 'logo_etablissement.jpg',
    'logo_enset.png', 'logo_enset.jpg',
    'enset.png', 'etablissement.png'
  ]);

  const cheminLogoUniv = chercherCheminLogo([
    'logo_universite.png', 'logo_universite.jpg',
    'logo_univ.png', 'logo_univ.jpg',
    'universite.png', 'univ.png'
  ]);

  const logoRightX = pageWidth - margin - logoSize;
  if (cheminLogoUniv) {
    try { doc.image(cheminLogoUniv, margin, headerY, { fit: [logoSize, logoSize], align: 'center', valign: 'center' }); }
    catch (e) { dessinerEmblemeUniversite(doc, margin, headerY, logoSize); }
  } else dessinerEmblemeUniversite(doc, margin, headerY, logoSize);
  if (cheminLogoEtab) {
    try { doc.image(cheminLogoEtab, logoRightX, headerY, { fit: [logoSize, logoSize], align: 'center', valign: 'center' }); }
    catch (e) { dessinerEmblemeEtablissement(doc, logoRightX, headerY, logoSize); }
  } else dessinerEmblemeEtablissement(doc, logoRightX, headerY, logoSize);

  const postHeaderY = dessinerTexteEnteteAcademique(headerY);
  doc.moveTo(margin, postHeaderY).lineTo(pageWidth - margin, postHeaderY).lineWidth(1.2).strokeColor('#1e3a8a').stroke();
  doc.moveTo(margin, postHeaderY + 1.5).lineTo(pageWidth - margin, postHeaderY + 1.5).lineWidth(0.4).strokeColor('#93c5fd').stroke();

  // =====================================================================
  // 2. TITRE OFFICIEL DU RELEVÉ DE NOTES LMD
  // =====================================================================
  const titreY = postHeaderY + 5;
  const titreHeight = 18;

  doc.rect(margin, titreY, contentWidth, titreHeight).fillColor('#1e3a8a').fill();
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
     .text('R E L E V \u00c9   D E S   N O T E S   E T   R \u00c9 S U L T A T S', margin, titreY + 4.5, {
       align: 'center',
       width: contentWidth,
       characterSpacing: 1.2
     });

  // =====================================================================
  // 3. CADRE INFORMATIONS ÉTUDIANT & SESSION (PARCOURS ET NIVEAU SÉPARÉS)
  // =====================================================================
  const cadreY = titreY + titreHeight + 4;
  const cadreHeight = 50;

  doc.rect(margin, cadreY, contentWidth, cadreHeight).lineWidth(0.7).strokeColor('#cbd5e1').fillAndStroke('#f8fafc', '#cbd5e1');

  //const sessionLabel = sessionNormalisee === 'rattrapage' ? 'Session Rattrapage' : 'Session Normale';
  const sessionLabel = sessionNormalisee === 'rattrapage' ? 'Deuxième session' : 'Première session';
  const matricule = genererMatricule(infosEtudiant.numero_etudiant, mentionBase, annee);
  //const matricule = genererMatricule(infosEtudiant.numero_etudiant, mentionEtudiant, annee);

  const col1X = margin + 10;
  const col2X = margin + 280;

  // Une information par ligne, dans l'ordre demandé.
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a')
     .text('Matricule : ', col1X, cadreY + 5, { continued: true })
     .font('Helvetica-Bold').fillColor('#0f172a').text(matricule, { continued: false });

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a')
     .text('Année Académique : ', col2X, cadreY + 5, { continued: true })
     .font('Helvetica').fillColor('#0f172a').text(annee, { continued: false });

  // Identité séparée : nom puis prénom.
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a')
      .text('Nom : ', col1X, cadreY + 17, { continued: true })
      .font('Helvetica-Bold').fillColor('#0f172a').text(infosEtudiant.nom_etudiant, { continued: false });

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a')
      .text('Prénom : ', col1X, cadreY + 29, { continued: true })
      .font('Helvetica-Bold').fillColor('#0f172a').text(infosEtudiant.prenom_etudiant, { continued: false });

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a')
      .text('Session : ', col2X, cadreY + 17, { continued: true })
     .font('Helvetica-Bold').fillColor(sessionNormalisee === 'rattrapage' ? '#b45309' : '#15803d').text(sessionLabel, { continued: false });

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a')
     .text('Date et lieu de naissance : ', col1X, cadreY + 41, { continued: true })
     .font('Helvetica').fillColor('#0f172a').text(dateEtLieuNaissance, { continued: false });
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a')
     .text('Diplome prepare : ', col2X, cadreY + 41, { continued: true })
     .font('Helvetica').fillColor('#0f172a').text(diplomePrepare, { continued: false });
  // Formation séparée : mention, niveau puis parcours.
 // doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a')
     // .text('Mention : ', col1X, cadreY + 41, { continued: true })
    // .font('Helvetica').fillColor('#0f172a').text(mentionEtudiant, { continued: false });

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a')
      .text('Niveau : ', col2X, cadreY + 29, { continued: true })
      .font('Helvetica-Bold').fillColor('#1e3a8a').text(releve.niveau, { continued: false });

     // doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a')
       // .text('Parcours : ', col2X, cadreY + 41, { continued: true })
      //.font('Helvetica').fillColor('#0f172a').text(texteParcours(releve.nom_parcours) || 'Tronc Commun', { continued: false });
                                                                   //releve.nom_parcours || 'Tronc Commun'
  // =====================================================================
  // 4. TABLEAU DES NOTES AVEC SEMESTRES REMARQUABLES
  // =====================================================================
  const cleMoyenne = sessionNormalisee === 'rattrapage' ? 'moyenneRattrapage' : 'moyenneNormale';
  const cleMoyenneGenerale = sessionNormalisee === 'rattrapage' ? 'moyenneGeneraleRattrapage' : 'moyenneGeneraleNormale';

  const colW = { semestre: 52, codeUE: 50, nomUE: 108, credUE: 40, ec: 205, credEC: 42, coef: 40, note: 62, moyUE: 65, stat: 133 };
  colW.stat = contentWidth - Object.values(colW).reduce((a, b) => a + b, 0) + colW.stat;
  const tableX = margin;

  // Calcul du nombre total d'EC pour ajuster la hauteur des lignes
  const semestresCles = Object.keys(releve.semestres)
    .filter((nom) => !semestreDemande || nom === semestreDemande)
    .sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')));
  const totalECs = semestresCles.reduce((acc, s) => acc + (releve.semestres[s].ues || []).reduce((a, u) => a + (u.ecs || []).length, 0), 0);
  let rowHeightEC = 12.5;

  function dessinerEnTeteColonnes(y) {
    const groupH = 12, labelH = 16, fullH = groupH + labelH;
    const xs = [tableX];
    ['semestre','codeUE','nomUE','credUE','ec','credEC','coef','note','moyUE','stat'].forEach((k) => xs.push(xs[xs.length - 1] + colW[k]));
    const cell = (x, yy, w, h, label, size = 6.5) => {
      doc.rect(x, yy, w, h).lineWidth(0.45).strokeColor('#334155').stroke();
      if (label) doc.font('Helvetica-Bold').fontSize(size).fillColor('#0f172a').text(label, x + 2, yy + (h - size) / 2, { width: w - 4, height: h, align: 'center', valign: 'center' });
    };
    cell(xs[0], y, colW.semestre, fullH, 'Semestre');
    cell(xs[1], y, colW.codeUE + colW.nomUE + colW.credUE, groupH, "Unites d'Enseignement (UE)");
    cell(xs[4], y, colW.ec + colW.credEC + colW.coef, groupH, 'Elements Constitutifs (EC)');
    cell(xs[7], y, colW.note + colW.moyUE + colW.stat, groupH, 'Resultats obtenus');
    const labels = ['Code', 'Intitule(s)', 'Credits requis', 'Intitule(s)', 'Credits requis', 'Coef.', 'Note', 'Moy. UE', 'Resultat'];
    for (let i = 1; i < xs.length - 1; i++) cell(xs[i], y + groupH, colW[Object.keys(colW)[i]], labelH, labels[i - 1], 6);
    return y + fullH;
  }

  let currentY = cadreY + cadreHeight + 5;
  let sommeMoyennesSemestres = 0;
  let countSemestres = 0;
  let totalCreditsAcquis = 0;
  let totalCreditsPossibles = 0;

  function dessinerEntetePageSupplementaire() {
    doc.addPage({ size: 'A4', layout: 'landscape', margin });
    dessinerCadrePage();

    const y = headerY;
    if (cheminLogoUniv) {
      try { doc.image(cheminLogoUniv, margin, y, { fit: [logoSize, logoSize], align: 'center', valign: 'center' }); }
      catch (e) { dessinerEmblemeUniversite(doc, margin, y, logoSize); }
    } else dessinerEmblemeUniversite(doc, margin, y, logoSize);
    if (cheminLogoEtab) {
      try { doc.image(cheminLogoEtab, logoRightX, y, { fit: [logoSize, logoSize], align: 'center', valign: 'center' }); }
      catch (e) { dessinerEmblemeEtablissement(doc, logoRightX, y, logoSize); }
    } else dessinerEmblemeEtablissement(doc, logoRightX, y, logoSize);

    const sepY = dessinerTexteEnteteAcademique(y);
    doc.moveTo(margin, sepY).lineTo(pageWidth - margin, sepY).lineWidth(1.2).strokeColor('#1e3a8a').stroke();
    doc.moveTo(margin, sepY + 1.5).lineTo(pageWidth - margin, sepY + 1.5).lineWidth(0.4).strokeColor('#93c5fd').stroke();

    const titleY = sepY + 5;
    const titleH = 18;
    doc.rect(margin, titleY, contentWidth, titleH).fillColor('#1e3a8a').fill();
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
      .text('R E L E V \u00c9   D E S   N O T E S   E T   R \u00c9 S U L T A T S', margin, titleY + 4.5, {
        align: 'center', width: contentWidth, characterSpacing: 1.2
      });

    const infoY = titleY + titleH + 4;
    const infoH = 88;
    doc.rect(margin, infoY, contentWidth, infoH).lineWidth(0.7).strokeColor('#cbd5e1').fillAndStroke('#f8fafc', '#cbd5e1');
    const leftX = margin + 10;
    const rightX = margin + 280;
    const label = (text, x, yy, value, color = '#0f172a') => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a').text(text, x, yy, { continued: true });
      doc.font('Helvetica').fontSize(8).fillColor(color).text(value == null ? '' : String(value));
    };
    label('Matricule : ', leftX, infoY + 5, matricule, '#0f172a');
    label('Annee Academique : ', rightX, infoY + 5, annee);
    label('Nom : ', leftX, infoY + 17, infosEtudiant.nom_etudiant);
    label('Session : ', rightX, infoY + 17, sessionLabel, sessionNormalisee === 'rattrapage' ? '#b45309' : '#15803d');
    label('Prenom : ', leftX, infoY + 29, infosEtudiant.prenom_etudiant);
    label('Niveau : ', rightX, infoY + 29, releve.niveau);
    label('Mention : ', leftX, infoY + 41, mentionEtudiant);
    label('Parcours : ', rightX, infoY + 41, texteParcours(releve.nom_parcours) || 'Tronc Commun');
                                              //releve.nom_parcours || 'Tronc Commun'
    label('Date et lieu de naissance : ', leftX, infoY + 53, dateEtLieuNaissance);
    label('Diplome prepare : ', rightX, infoY + 53, diplomePrepare);
    return infoY + infoH + 5;
  }

  for (let semesterIndex = 0; semesterIndex < semestresCles.length; semesterIndex++) {
    const nomSemestre = semestresCles[semesterIndex];
    if (semesterIndex > 0) currentY = dessinerEntetePageSupplementaire();
    const dataSem = releve.semestres[nomSemestre];
    const moySem = dataSem[cleMoyenneGenerale];
    const resultatSem = sessionNormalisee === 'rattrapage' ? dataSem.resultatRattrapage : dataSem.resultatNormale;

    if (moySem !== null) {
      sommeMoyennesSemestres += moySem;
      countSemestres++;
    }

    // --- BANNIÈRE DE SEMESTRE REMARQUABLE ---
    const banniereH = 15;
    doc.rect(tableX, currentY, contentWidth, banniereH).fillColor('#1e3a8a').fill();

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff')
       .text(`SEMESTRE ${nomSemestre}`, tableX + 6, currentY + 3.5);

    const moySemTxt = moySem !== null ? `${moySem.toFixed(2)} / 20` : 'N/A';
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#fde047')
       .text(`Moyenne : ${moySemTxt}   |   Statut : ${resultatSem}`, tableX, currentY + 3.5, {
         align: 'right',
         width: contentWidth - 8
       });

    currentY += banniereH;
    currentY = dessinerEnTeteColonnes(currentY);
    const nombreECsSemestre = dataSem.ues.reduce((total, ue) => total + (ue.ecs || []).length, 0);
    rowHeightEC = nombreECsSemestre ? Math.max(5.5, Math.min(12.5, (pageHeight - 125 - currentY) / nombreECsSemestre)) : 12.5;

    // --- Lignes des UE et EC du Semestre ---
    let creditsSemestre = 0;
    let creditsAcquisSemestre = 0;
    for (const ue of dataSem.ues) {
      const moyUE = ue[cleMoyenne];
      const elimineUE = ue[sessionNormalisee === 'rattrapage' ? 'elimineRattrapage' : 'elimineNormale'];
      const statutUE = genererStatutUE(moyUE, elimineUE);
      const nbEC = ue.ecs.length || 1;
      const totalCredUE = ue.ecs.reduce((s, e) => s + (e.credit || 0), 0);
      creditsSemestre += totalCredUE;
      totalCreditsPossibles += totalCredUE;
      // Crédits acquis uniquement si l'UE est réellement validée (>=10, sans
      // note éliminatoire) : plus de "compensation" à 8/20 hors du calcul
      // officiel du modèle, pour rester cohérent avec la règle du seuil 10.
      if (statutUE.code === 'V') {
        totalCreditsAcquis += totalCredUE;
        creditsAcquisSemestre += totalCredUE;
      }

      const ueBlockHeight = Math.max(nbEC * rowHeightEC, 15);
      const rowH = ueBlockHeight / nbEC;
      const xs = [tableX];
      ['semestre','codeUE','nomUE','credUE','ec','credEC','coef','note','moyUE','stat'].forEach((k) => xs.push(xs[xs.length - 1] + colW[k]));
      const cell = (x, y, w, h, text, opts = {}) => {
        doc.rect(x, y, w, h).lineWidth(0.4).strokeColor('#334155').stroke();
        if (text !== null && text !== undefined) doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 6.5).fillColor(opts.color || '#0f172a').text(String(text), x + 2, y + 2, { width: w - 4, height: h - 4, align: opts.align || 'left', valign: 'center', ellipsis: true });
      };
      const code = ue.code_UE || '';
      const titre = ue.nom_UE || '';
      const creditsUE = ue.ecs.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
      const libelleResultat = statutUE.code === 'V' ? 'Unite acquise' : (elimineUE ? 'Non validee (note < 3)' : 'Non validee');
      cell(xs[1], currentY, colW.codeUE, ueBlockHeight, code, { bold: true, align: 'center' });
      cell(xs[2], currentY, colW.nomUE, ueBlockHeight, titre, { bold: true });
      cell(xs[3], currentY, colW.credUE, ueBlockHeight, creditsUE, { align: 'center', bold: true });
      cell(xs[8], currentY, colW.moyUE, ueBlockHeight, moyUE !== null ? moyUE.toFixed(2) : '-', { align: 'center', bold: true });
      cell(xs[9], currentY, colW.stat, ueBlockHeight, libelleResultat, { align: 'center', bold: true, color: statutUE.code === 'V' ? '#15803d' : '#b91c1c' });
      cell(xs[0], currentY, colW.semestre, ueBlockHeight, nomSemestre, { align: 'center', bold: true });
      for (let i = 0; i < ue.ecs.length; i++) {
        const ec = ue.ecs[i], y = currentY + i * rowH, ecMean = ec[cleMoyenne];
        const ecElimine = ec[sessionNormalisee === 'rattrapage' ? 'eliminatoireRattrapage' : 'eliminatoireNormale'];
        cell(xs[4], y, colW.ec, rowH, ec.nom_EC || '');
        cell(xs[5], y, colW.credEC, rowH, Number(ec.credit) || 0, { align: 'center' });
        cell(xs[6], y, colW.coef, rowH, Number(ec.credit) || 0, { align: 'center' });
        const texteNote = ecMean !== null && ecMean !== undefined ? Number(ecMean).toFixed(2).replace('.', ',') + (ecElimine ? '*' : '') : '-';
        cell(xs[7], y, colW.note, rowH, texteNote, { align: 'center', bold: true, color: ecElimine ? '#dc2626' : undefined });
      }
      currentY += ueBlockHeight;
    }

    const resumeSemestreH = 16;
    const xMoy = tableX + colW.semestre + colW.codeUE + colW.nomUE + colW.credUE + colW.ec + colW.credEC + colW.coef + colW.note;
    const xStat = xMoy + colW.moyUE;
    doc.rect(tableX, currentY, contentWidth, resumeSemestreH).lineWidth(0.5).strokeColor('#334155').fillAndStroke('#e8eef8', '#334155');
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#1e3a8a')
       .text('Resultats du semestre - Credits : ' + creditsSemestre, tableX + 4, currentY + 4, { width: xMoy - tableX - 8, align: 'center' });
    doc.font('Helvetica-Bold').fillColor('#0f172a')
       .text(moySem !== null ? moySem.toFixed(2) : '-', xMoy, currentY + 4, { width: colW.moyUE, align: 'center' })
       .text(resultatSem || 'En attente', xStat, currentY + 4, { width: colW.stat, align: 'center' });
    currentY += resumeSemestreH;
    const mentionSemestre = genererMention(moySem);
    const syntheseY = currentY + 6;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a')
       .text('Moyenne du semestre : ' + (moySem !== null ? moySem.toFixed(2) : 'N/A'), margin, syntheseY)
       .text('Mention : ' + mentionSemestre, margin + 255, syntheseY)
       .text('Credits obtenus : ' + creditsAcquisSemestre, margin + 465, syntheseY);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a')
       .text('Decision du jury : ' + (resultatSem || 'En attente'), margin, syntheseY + 13);
    const dateStr = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#334155')
       .text('Antsiranana, le ' + dateStr, margin, syntheseY + 13, { width: contentWidth, align: 'right' });
    const sigY = Math.min(syntheseY + 31, pageHeight - margin - 48);
    const sigW = (contentWidth - 16) / 2;
    //doc.rect(margin, sigY, sigW, 34).lineWidth(0.6).strokeColor('#94a3b8').fillAndStroke('#fafafa', '#94a3b8');
    doc.rect(margin, sigY, sigW, 34).lineWidth(0.6).strokeColor('#fff').fillAndStroke('#fff', '#fff');
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#1e3a8a')
       .text('Responsable du parcours : ' + (releve.responsable_parcours || 'A renseigner'), margin + 4, sigY + 5, { width: sigW - 8, align: 'center' });
    doc.font('Helvetica-Oblique').fontSize(6).fillColor('#64748b')
       .text('Signature et cachet', margin + 4, sigY + 23, { width: sigW - 8, align: 'center' });
    const sig2X = margin + sigW + 16;
    doc.rect(sig2X, sigY, sigW, 34).lineWidth(0.6).strokeColor('#fff').fillAndStroke('#fff', '#fff');
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#1e3a8a')
       .text('Responsable de la mention : ' + (releve.responsable_mention || 'A renseigner'), sig2X + 4, sigY + 5, { width: sigW - 8, align: 'center' });
    doc.font('Helvetica-Oblique').fontSize(6).fillColor('#64748b')
       .text('Signature et cachet', sig2X + 4, sigY + 23, { width: sigW - 8, align: 'center' });
    const footerY = pageHeight - margin - 8;
    const refNum = 'REL-' + annee.replace('-', '') + '-' + matricule + '-' + (semestreDemande || (semesterIndex + 1));
   // doc.font('Helvetica-Oblique').fontSize(5.8).fillColor('#dc2626')
      // .text('* Note eliminatoire (< 3/20) : non compensable, rend l\'UE non acquise meme si la moyenne ponderee atteint 10/20.', margin, footerY - 9, { width: contentWidth, align: 'center' });
    doc.font('Helvetica').fontSize(6.5).fillColor('#94a3b8')
       .text('N. Ref. : ' + refNum, margin, footerY, { align: 'left' })
       .text('Document officiel - Page ' + (semesterIndex + 1) + '/' + semestresCles.length, margin, footerY, { align: 'right', width: contentWidth });
    currentY += 3;
  }

  // =====================================================================
  doc.end();
}

module.exports = { genererPDFReleve };

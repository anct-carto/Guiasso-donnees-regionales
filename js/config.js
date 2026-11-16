// Réglages de la carte (modifiables sans rebuild)
window.MAP_CONFIG = {
  year: 2026,               // nom attendu : <region>.<year>.xlsx
  filesDir: "data/xlsx/",   // dossier des fichiers Excel finaux (relatif à index.html)
  countColumn: "nom de la structure",   // colonne dont on compte les valeurs uniques (survol)
  // Menu de gauche : un lien par région (clé = nom de fichier sans l'année). Vide = région affichée sans lien.
  links: {
    auvergnerhonealpes: "https://guidassoaura.gogocarto.fr/map#/carte/@45.49,3.87,8z?cat=all",
    bourgognefranchecomte: "https://guidasso-reseaubfc.gogocarto.fr/map#/carte/@47.29,5.01,7z?cat=all",
    bretagne: "https://accompagnementvieassociativebretagne.gogocarto.fr/annuaire?iframe=1#/carte/@48.11,-6.33,8z?cat=all",
    centrevaldeloire: "https://guid-asso-cvl.gogocarto.fr/map#/carte/@47.74,-0.13,8z?cat=all",
    corse: "https://guid-asso-corse.gogocarto.fr/map#/carte/@42.18,7.60,8z?cat=all",
    grandest: "https://guidasso-grand-est.gogocarto.fr/map#/carte/@48.74,5.81,7z?cat=all",
    guadeloupe: "https://guid-asso-guadeloupe.gogocarto.fr/map#/carte/@16.18,-61.41,9z?cat=all",
    guyane: "",                // lien à renseigner
    hautsdefrance: "https://cdonline.articque.com/share/display/guidasso-hdf",
    iledefrance: "https://guidasso-iledefrance.gogocarto.fr/map#/carte/@48.69,2.61,8z?cat=all",
    lareunion: "https://guidassorun.gogocarto.fr/map#/carte/@-21.131,55.414,11z?cat=all",
    martinique: "",            // lien à renseigner (le lien du Word pointait vers La Réunion)
    mayotte: "https://www.cress-mayotte.org/le-reseau-guidasso/",
    normandie: "https://guid-asso-normandie.gogocarto.fr/map#/carte/@49.13,-0.09,7z?cat=all",
    nouvelleaquitaine: "https://guidasso-nouvelleaquitaine.fr/cartographie/",
    occitanie: "https://guidasso-occitanie.gogocarto.fr/map#/carte/@43.69,2.19,8z?cat=all",
    paysdelaloire: "https://guidasso-pdll.gogocarto.fr/map#/carte/@47.42,-2.37,7z?cat=all",
    provencealpescotedazur: "https://guidasso-paca.gogocarto.fr/"
  },
  fallbackGenerate: true    // si le fichier est absent : génère un .xlsx provisoire (départements) ; false = message d'erreur
};

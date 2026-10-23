// Réglages de la carte (modifiables sans rebuild)
window.MAP_CONFIG = {
  year: 2026,               // nom attendu : <region>.<year>.xlsx
  filesDir: "data/xlsx/",   // dossier des fichiers Excel finaux (relatif à index.html)
  countColumn: "Nom de la structure",   // colonne dont on compte les valeurs uniques (survol)
  fallbackGenerate: true    // si le fichier est absent : génère un .xlsx provisoire (départements) ; false = message d'erreur
};

# Carte interactive des régions françaises

Page statique (HTML/CSS/JS, aucune dépendance, aucun appel externe). Survol = la région change de couleur, clic = téléchargement de `nomregion.2026.xlsx`. Outre-mer rapprochés et entourés d'un cercle pointillé.

## Structure
```
index.html            page à publier
css/style.css         styles (thème clair/sombre automatique)
js/config.js          année, dossier des fichier Excel, comportement si fichier Excel absent
js/map.js             affichage de la carte + téléchargement
data/regions.js       contours générés (ne pas éditer à la main)
data/xlsx/             <- déposez ici vos fichiers Excel finaux (liste dans FICHIERS_ATTENDUS.txt)
source/               GeoJSON d'origine (Lambert-93) + départements/chefs-lieux (regions_meta.json)
scripts/build_data.py régénère data/regions.js depuis source/
```

## Ajouter les fichiers Excel finaux
Copiez vos 18 fichiers .xlsx dans `data/xlsx/`, nommés exactement comme dans `data/xlsx/FICHIERS_ATTENDUS.txt` (ex. `bretagne.2026.xlsx`, `provencealpescotedazur.2026.xlsx`). Le clic télécharge alors ce fichier tel quel. Tant qu'un fichier manque, un fichier provisoire (liste des départements) est généré par le navigateur ; mettez `fallbackGenerate:false` dans `js/config.js` pour afficher une erreur à la place.

Changer d'année : modifiez `year` dans `js/config.js` (et `YEAR` dans `scripts/build_data.py` pour régénérer la liste des noms attendus).

## Publier sur un serveur interne
Copiez tout le dossier derrière n'importe quel serveur web statique (nginx, Apache, IIS, S3…). Les chemins sont relatifs : il peut être servi depuis un sous-dossier. Test local : `python3 -m http.server 8080` puis http://localhost:8080.
Ouvert directement en `file://`, la carte fonctionne mais le navigateur ne peut pas lire `data/xlsx/` : seul le fichier Excel provisoire est proposé. Publiez sur un serveur HTTP pour servir les vrais fichiers.

## Modifier les contours
Remplacez les fichiers de `source/` puis lancez `python3 scripts/build_data.py` (Python 3, bibliothèque standard).
- Précision : `EPS_KM` (0,12 km par défaut ; plus petit = plus fin mais plus lourd).
- Cercles : si un territoire dépasse de son cercle, le script recalcule le cercle (plus petit cercle englobant + 3 km de marge) et l'indique. C'était le cas de la Guyane (cercle fourni trop petit de ~9 km et décentré).

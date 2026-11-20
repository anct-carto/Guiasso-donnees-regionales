(function () {
  const cfg = window.MAP_CONFIG;
  const NS = "http://www.w3.org/2000/svg";

  const svg = document.getElementById("map");
  const tip = document.getElementById("tip");
  const msg = document.getElementById("msg");

  svg.setAttribute("viewBox", window.VIEWBOX);

  // --------------------------------------------------
  // MENU DES RÉGIONS
  // --------------------------------------------------

  const menu = document.getElementById("links");

  const OM = new Set([
    "guadeloupe",
    "martinique",
    "guyane",
    "lareunion",
    "mayotte"
  ]);

  const byName = (a, b) => a.n.localeCompare(b.n, "fr");

  if (menu) {
    [
      ["France hexagonale", r => !OM.has(r.slug)],
      ["Outre-mer", r => OM.has(r.slug)]
    ].forEach(([title, keep]) => {

      const h = document.createElement("h2");
      const ul = document.createElement("ul");

      h.textContent = title;

      menu.appendChild(h);
      menu.appendChild(ul);

      window.REGIONS
        .filter(keep)
        .sort(byName)
        .forEach(r => {

          const url = (cfg.links || {})[r.slug];
          const li = document.createElement("li");

          let el;

          if (url) {
            el = document.createElement("a");
            el.href = url;
            el.target = "_blank";
            el.rel = "noopener noreferrer";
          } else {
            el = document.createElement("span");
            el.className = "off";
            el.title = "Pas de lien pour le moment";
          }

          el.textContent = r.n;

          li.appendChild(el);
          ul.appendChild(li);
        });
    });
  }

  // --------------------------------------------------
  // POP-UP INFORMATIONS
  // --------------------------------------------------

  const ib = document.getElementById("info-btn");
  const ip = document.getElementById("info-pop");

  if (ib && ip) {

    const setPop = open => {
      ip.hidden = !open;
      ib.setAttribute("aria-expanded", open);
    };

    ib.addEventListener("click", e => {
      e.stopPropagation();
      setPop(ip.hidden);
    });

    document.addEventListener("click", e => {
      if (!ip.contains(e.target)) {
        setPop(false);
      }
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        setPop(false);
      }
    });
  }

  // --------------------------------------------------
  // CERCLES SUR LA CARTE
  // --------------------------------------------------

  window.CIRCLES.forEach(([x, y, r]) => {

    const c = document.createElementNS(NS, "circle");

    c.setAttribute("cx", x);
    c.setAttribute("cy", y);
    c.setAttribute("r", r);

    svg.appendChild(c);
  });

  // --------------------------------------------------
  // NOM DES FICHIERS EXCEL
  // Exemple :
  // data/xlsx/centrevaldeloire_GuidAsso-2026.xlsx
  // --------------------------------------------------

  const fileName = r =>
    `${r.slug}${cfg.fileSuffix || "_GuidAsso-"}${cfg.year}.xlsx`;

  const fileUrl = r =>
    `${cfg.filesDir}${fileName(r)}`;

  const XLSX_MIME =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  // --------------------------------------------------
  // RÉCUPÉRATION ET VÉRIFICATION DU FICHIER EXCEL
  // --------------------------------------------------

  async function fetchWorkbook(r) {

    const url = fileUrl(r);

    const res = await fetch(url, {
      cache: "no-cache"
    });

    if (!res.ok) {
      throw new Error(
        `Fichier introuvable (${res.status}) : ${url}`
      );
    }

    const buffer = await res.arrayBuffer();

    if (buffer.byteLength < 4) {
      throw new Error(`Fichier vide ou invalide : ${url}`);
    }

    // Vérification de la signature ZIP du fichier XLSX
    const signature = new Uint8Array(buffer, 0, 2);

    if (
      signature[0] !== 0x50 ||
      signature[1] !== 0x4B
    ) {
      throw new Error(
        `Le fichier reçu n'est pas un fichier Excel valide : ${url}`
      );
    }

    return new Blob([buffer], {
      type: XLSX_MIME
    });
  }

  // --------------------------------------------------
  // COMPTAGE DU NOMBRE DE LIGNES PAR RÉGION
  // --------------------------------------------------

  async function countRows(r) {

    if (!window.XLSX) {
      throw new Error(
        "La bibliothèque SheetJS n'a pas été chargée."
      );
    }

    const blob = await fetchWorkbook(r);
    const buffer = await blob.arrayBuffer();

    const workbook = XLSX.read(buffer, {
      type: "array"
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error("Aucun onglet dans le fichier Excel.");
    }

    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false
    });

    // On retire la première ligne qui contient les en-têtes.
    // On ne compte pas les lignes entièrement vides.
    const dataRows = rows.slice(1).filter(row => {

      return row.some(value =>
        String(value ?? "").trim() !== ""
      );

    });

    return dataRows.length;
  }

  // --------------------------------------------------
  // CHARGEMENT DES COMPTAGES
  // --------------------------------------------------

  // undefined = chargement en cours
  // null = fichier absent ou illisible
  // nombre = nombre de lignes de données

  const counts = {};

  window.REGIONS.forEach(r => {

    countRows(r).then(

      n => {
        counts[r.slug] = n;
      },

      err => {
        counts[r.slug] = null;

        console.warn(
          `Comptage ${r.n} :`,
          err.message
        );
      }

    );

  });

  // --------------------------------------------------
  // INFOBULLE AU SURVOL DES RÉGIONS
  // --------------------------------------------------

  const tipName = document.createElement("span");
  const tipInfo = document.createElement("span");

  tipName.className = "n";
  tipInfo.className = "c";

  tip.append(tipName, tipInfo);

  function showTip(r, e) {

    const n = counts[r.slug];

    tipName.textContent = r.n;

    tipInfo.textContent =
      "Nombre de lignes : " +
      (
        n === undefined
          ? "…"
          : n === null
            ? "indisponible"
            : n
      );

    tip.style.opacity = 1;

    tip.style.left = e.clientX + 14 + "px";
    tip.style.top = e.clientY + 14 + "px";
  }

  // --------------------------------------------------
  // TÉLÉCHARGEMENT DU FICHIER EXCEL
  // --------------------------------------------------

  async function download(r) {

    const name = fileName(r);

    msg.textContent = `Téléchargement de ${name}…`;

    try {

      const blob = await fetchWorkbook(r);

      const a = document.createElement("a");

      const objectUrl = URL.createObjectURL(blob);

      a.href = objectUrl;
      a.download = name;

      document.body.appendChild(a);

      a.click();

      a.remove();

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);

      msg.textContent = `${name} téléchargé.`;

    } catch (err) {

      console.error(
        `Téléchargement ${r.n} :`,
        err
      );

      msg.textContent =
        `Téléchargement impossible : ${name}. ` +
        `Vérifie que le fichier existe dans ${cfg.filesDir}.`;
    }
  }

  // --------------------------------------------------
  // AFFICHAGE DES RÉGIONS ET INTERACTIONS
  // --------------------------------------------------

  window.REGIONS.forEach(r => {

    const el = document.createElementNS(NS, "path");

    el.setAttribute("d", r.p);
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", r.n);

    // Survol
    el.addEventListener("mousemove", e => {
      showTip(r, e);
    });

    // Fin du survol
    el.addEventListener("mouseleave", () => {
      tip.style.opacity = 0;
    });

    // Clic : téléchargement Excel
    el.addEventListener("click", () => {
      download(r);
    });

    // Accessibilité clavier
    el.addEventListener("keydown", e => {

      if (e.key === "Enter" || e.key === " ") {

        e.preventDefault();

        download(r);
      }
    });

    svg.appendChild(el);
  });

})();
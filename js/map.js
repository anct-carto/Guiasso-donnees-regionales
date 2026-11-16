(function () {
  const cfg = window.MAP_CONFIG, NS = "http://www.w3.org/2000/svg";
  const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const svg = document.getElementById("map"), tip = document.getElementById("tip"), msg = document.getElementById("msg");
  svg.setAttribute("viewBox", window.VIEWBOX);

  // Menu texte à gauche : deux groupes, régions classées par ordre alphabétique (liens dans config.js)
  const menu = document.getElementById("links");
  const OM = new Set(["guadeloupe", "martinique", "guyane", "lareunion", "mayotte"]);
  const byName = (a, b) => a.n.localeCompare(b.n, "fr");
  if (menu) [["France hexagonale", r => !OM.has(r.slug)], ["Outre-mer", r => OM.has(r.slug)]].forEach(([title, keep]) => {
    const h = document.createElement("h2"), ul = document.createElement("ul");
    h.textContent = title; menu.appendChild(h); menu.appendChild(ul);
    window.REGIONS.filter(keep).sort(byName).forEach(r => {
      const url = (cfg.links || {})[r.slug], li = document.createElement("li");
      let el;
      if (url) { el = document.createElement("a"); el.href = url; el.target = "_blank"; el.rel = "noopener noreferrer"; }
      else { el = document.createElement("span"); el.className = "off"; el.title = "Pas de lien pour le moment"; }
      el.textContent = r.n; li.appendChild(el); ul.appendChild(li);
    });
  });

  window.CIRCLES.forEach(([x, y, r]) => {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("r", r);
    svg.appendChild(c);
  });

  /* ---------- Mini générateur .xlsx (sans dépendance) ---------- */
  const enc = new TextEncoder();
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const le = (n, bytes) => Array.from({ length: bytes }, (_, i) => (n >>> (8 * i)) & 255);

  function zip(files) { // files : [[nom, texte]] -> zip "stocké" (sans compression)
    const out = [], central = []; let offset = 0;
    files.forEach(([name, text]) => {
      const nm = enc.encode(name), data = enc.encode(text), crc = crc32(data);
      const local = [...le(0x04034b50, 4), ...le(20, 2), ...le(0x0800, 2), ...le(0, 2), ...le(0, 2), ...le(33, 2),
        ...le(crc, 4), ...le(data.length, 4), ...le(data.length, 4), ...le(nm.length, 2), ...le(0, 2)];
      out.push(new Uint8Array(local), nm, data);
      central.push(new Uint8Array([...le(0x02014b50, 4), ...le(20, 2), ...le(20, 2), ...le(0x0800, 2), ...le(0, 2), ...le(0, 2), ...le(33, 2),
        ...le(crc, 4), ...le(data.length, 4), ...le(data.length, 4), ...le(nm.length, 2), ...le(0, 2), ...le(0, 2),
        ...le(0, 2), ...le(0, 2), ...le(0, 4), ...le(offset, 4)]), nm);
      offset += local.length + nm.length + data.length;
    });
    const cSize = central.reduce((s, a) => s + a.length, 0);
    const end = new Uint8Array([...le(0x06054b50, 4), ...le(0, 2), ...le(0, 2), ...le(files.length, 2), ...le(files.length, 2),
      ...le(cSize, 4), ...le(offset, 4), ...le(0, 2)]);
    return new Blob([...out, ...central, end], { type: XLSX_MIME });
  }

  const esc = s => String(s).replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));

  function xlsx(rows, sheetName) { // rows : tableau de tableaux (texte ou nombre)
    const sheet = rows.map((row, i) => `<row r="${i + 1}">` + row.map((v, j) => {
      const ref = "ABCDEFGHIJ"[j] + (i + 1);
      return typeof v === "number" ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
    }).join("") + "</row>").join("");
    const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    return zip([
      ["[Content_Types].xml", X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
      ["_rels/.rels", X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ["xl/workbook.xml", X + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName.slice(0, 31).replace(/[\\\/?*\[\]:]/g, " "))}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
      ["xl/_rels/workbook.xml.rels", X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
      ["xl/worksheets/sheet1.xml", X + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`]
    ]);
  }
  /* -------------------------------------------------------------- */

  function placeholderXlsx(r) {
    const rows = [["code_departement", "departement", "region", "chef_lieu_region", "annee"]];
    r.d.forEach(d => { const i = d.indexOf(" "); rows.push([d.slice(0, i), d.slice(i + 1), r.n, r.c, cfg.year]); });
    return xlsx(rows, r.n);
  }

  /* ---------- Nombre de structures uniques d'un .xlsx (lecture du zip, sans dépendance) ---------- */
  const u16 = (v, o) => v.getUint16(o, true), u32 = (v, o) => v.getUint32(o, true);
  const dec = new TextDecoder();
  const inflate = bytes => new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();

  function zipEntries(buf) { // { nom: {method, csize, off} }
    const v = new DataView(buf);
    let e = buf.byteLength - 22;
    while (e >= 0 && u32(v, e) !== 0x06054b50) e--;
    if (e < 0) throw new Error("zip invalide");
    const n = u16(v, e + 10), entries = {}; let p = u32(v, e + 16);
    for (let i = 0; i < n; i++) {
      const nl = u16(v, p + 28), xl = u16(v, p + 30), cl = u16(v, p + 32);
      entries[dec.decode(new Uint8Array(buf, p + 46, nl))] = { method: u16(v, p + 10), csize: u32(v, p + 20), off: u32(v, p + 42) };
      p += 46 + nl + xl + cl;
    }
    return entries;
  }
  async function entryText(buf, en) {
    const v = new DataView(buf), start = en.off + 30 + u16(v, en.off + 26) + u16(v, en.off + 28);
    const data = new Uint8Array(buf, start, en.csize);
    return en.method === 0 ? dec.decode(data) : inflate(data);
  }

  const unxml = s => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, g) => {
    g = g.toLowerCase();
    if (g[0] === "#") return String.fromCodePoint(g[1] === "x" ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10));
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[g];
  });
  const textOf = xml => [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(m => unxml(m[1])).join("");
  // comparaison tolérante : sans accents, sans majuscules, espaces/underscores normalisés
  const norm = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[_\s]+/g, " ").trim();

  // Nombre de valeurs uniques (non vides) de la colonne cfg.countColumn
  async function countStructures(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error("absent");
    const buf = await res.arrayBuffer(), en = zipEntries(buf);
    const sheet = en["xl/worksheets/sheet1.xml"] || Object.entries(en).find(([k]) => /^xl\/worksheets\/[^/]+\.xml$/.test(k))?.[1];
    if (!sheet) throw new Error("feuille introuvable");
    const sst = en["xl/sharedStrings.xml"]
      ? (await entryText(buf, en["xl/sharedStrings.xml"])).split(/<si\b[^>]*>/).slice(1).map(textOf) : [];
    const xml = await entryText(buf, sheet);

    // lignes -> { colonne: texte }
    const rows = xml.split(/<row\b[^>]*>/).slice(1).map(rowXml => {
      const o = {};
      for (const m of rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const col = /\br="([A-Z]+)\d+"/.exec(m[1])?.[1], body = m[2];
        if (!col || !body) continue;
        const t = /\bt="(\w+)"/.exec(m[1])?.[1], v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        o[col] = t === "inlineStr" ? textOf(body) : t === "s" ? (sst[+v] ?? "") : v === undefined ? "" : unxml(v);
      }
      return o;
    });

    // ligne d'en-tête = première ligne qui contient le nom de colonne
    const target = norm(cfg.countColumn);
    let col = null, h = -1;
    for (let i = 0; i < rows.length && col === null; i++)
      for (const [k, val] of Object.entries(rows[i])) if (norm(val) === target) { col = k; h = i; break; }
    if (col === null) throw new Error(`colonne « ${cfg.countColumn} » introuvable`);

    const uniq = new Set();
    rows.slice(h + 1).forEach(r => { const val = norm(r[col] ?? ""); if (val) uniq.add(val); });
    return uniq.size;
  }

  // undefined = en cours de chargement, null = indisponible
  const counts = {};
  window.REGIONS.forEach(r => {
    countStructures(`${cfg.filesDir}${r.slug}.${cfg.year}.xlsx`).then(
      n => counts[r.slug] = n,
      err => { counts[r.slug] = null; if (err.message !== "absent") console.warn(r.slug, err.message); });
  });

  const tipName = document.createElement("span"), tipInfo = document.createElement("span");
  tipName.className = "n"; tipInfo.className = "c"; tip.append(tipName, tipInfo);
  function showTip(r, e) {
    const n = counts[r.slug];
    tipName.textContent = r.n;
    tipInfo.textContent = "Nombre de structure : " + (n === undefined ? "…" : n === null ? "—" : n);
    tip.style.opacity = 1; tip.style.left = e.clientX + 14 + "px"; tip.style.top = e.clientY + 14 + "px";
  }
  /* ------------------------------------------------------------------------------ */

  async function download(r) {
    const name = `${r.slug}.${cfg.year}.xlsx`;
    let blob = null, generated = false;
    try {
      const res = await fetch(cfg.filesDir + name, { cache: "no-cache" });
      if (res.ok) { blob = await res.blob(); if (/html/i.test(blob.type)) blob = null; } // ignore les pages d'erreur servies en 200
    } catch (e) { /* fichier absent ou page ouverte en file:// */ }
    if (!blob) {
      if (!cfg.fallbackGenerate) { msg.textContent = `Fichier introuvable : ${cfg.filesDir}${name}`; return; }
      blob = placeholderXlsx(r); generated = true;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    msg.textContent = generated ? `${name} : fichier Excel provisoire généré (aucun fichier final dans ${cfg.filesDir}).` : `${name} téléchargé.`;
  }

  window.REGIONS.forEach(r => {
    const el = document.createElementNS(NS, "path");
    el.setAttribute("d", r.p); el.setAttribute("tabindex", "0"); el.setAttribute("aria-label", r.n);
    el.addEventListener("mousemove", e => showTip(r, e));
    el.addEventListener("mouseleave", () => tip.style.opacity = 0);
    el.addEventListener("click", () => download(r));
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); download(r); } });
    svg.appendChild(el);
  });
})();

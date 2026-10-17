/**
 * Zenith Browser - Piles d'onglets (inspiré des "Tab Islands" d'Opera)
 *
 * - Un lien ouvert depuis un onglet (target=_blank, "Ouvrir dans un nouvel onglet")
 *   crée automatiquement une pile regroupant l'onglet d'origine et le nouvel onglet.
 * - Chaque pile a une couleur, un nom, un logo (logo Zenith par défaut, ou image importée),
 *   et peut être réduite / développée en cliquant sur son onglet de tête.
 * - Quand on choisit une couleur, l'onglet de tête de la pile est entièrement coloré,
 *   le logo étant détouré dans une découpe.
 * - Une pile peut être enregistrée en dossier de signets, et un dossier de signets
 *   peut être rouvert en pile.
 * - Glisser un onglet entre deux onglets d'une pile l'y ajoute ; le sortir l'en retire.
 *
 * Chargé après renderer.js et bookmarks.js (réutilise bmShowContextMenu, bmDialog...).
 */

const PILE_COLORS = [
  { name: 'Bleu', value: '#5b8def' },
  { name: 'Vert', value: '#30a46c' },
  { name: 'Orange', value: '#f5a524' },
  { name: 'Violet', value: '#8e4ec6' },
  { name: 'Rouge', value: '#e5484d' },
  { name: 'Turquoise', value: '#12a594' },
  { name: 'Rose', value: '#e93d82' },
  { name: 'Gris', value: '#8b8d98' }
];

const PILE_DEFAULT_LOGO = 'home/assets/img/logo.png';

const PILE_ICONS = {
  pile: '<svg class="icon" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="12" rx="3"/><path d="M6 7V5h12v2"/></svg>',
  out: '<svg class="icon" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  collapse: '<svg class="icon" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>',
  expand: '<svg class="icon" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
  image: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  noImage: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="3" x2="21" y2="21"/></svg>',
  save: '<svg class="icon" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="9" y1="10" x2="15" y2="10"/></svg>'
};

const piles = new Map();
let pileCounter = 0;
let pilesAuto = (localStorage.getItem('pilesAuto') ?? localStorage.getItem('islandsAuto')) !== 'false';

function initializePiles() {
  const container = document.getElementById('tabs-container');

  // Clic droit sur un onglet ou sur l'onglet de tête d'une pile
  container.addEventListener('contextmenu', (e) => {
    const handle = e.target.closest('.pile-handle');
    if (handle) {
      e.preventDefault();
      showPileMenu(handle.dataset.pile, e.clientX, e.clientY);
      return;
    }
    const tabEl = e.target.closest('.tab');
    if (tabEl) {
      e.preventDefault();
      showTabMenu(tabEl.id, e.clientX, e.clientY);
    }
  });

  const toggle = document.getElementById('toggle-piles');
  if (toggle) {
    toggle.classList.toggle('active', pilesAuto);
    toggle.addEventListener('click', () => {
      pilesAuto = !pilesAuto;
      localStorage.setItem('pilesAuto', String(pilesAuto));
      toggle.classList.toggle('active', pilesAuto);
    });
  }
}

// ========== MODÈLE ==========
function nextPileColor() {
  const used = new Set([...piles.values()].map(p => p.color));
  const free = PILE_COLORS.find(c => !used.has(c.value));
  return (free || PILE_COLORS[pileCounter % PILE_COLORS.length]).value;
}

function createPile(tabIds, name = '') {
  const id = `pile-${++pileCounter}`;
  // colorChosen : la couleur a été choisie par l'utilisateur -> onglet de tête plein
  piles.set(id, { id, name, color: nextPileColor(), colorChosen: false, logo: null, collapsed: false });
  tabIds.forEach(tid => {
    const t = tabs.find(x => x.id === tid);
    if (t) t.pileId = id;
  });
  renderPiles();
  return id;
}

function pileTabs(pileId) {
  return tabs.filter(t => t.pileId === pileId);
}

/** Déplace un onglet (DOM + tableau tabs) juste après un autre. */
function moveTabAfter(tabId, afterTabId) {
  const tab = tabs.find(t => t.id === tabId);
  const after = tabs.find(t => t.id === afterTabId);
  if (!tab || !after || tab === after) return;
  tabs.splice(tabs.indexOf(tab), 1);
  tabs.splice(tabs.indexOf(after) + 1, 0, tab);
  const el = document.getElementById(tabId);
  const afterEl = document.getElementById(afterTabId);
  if (el && afterEl) afterEl.after(el);
}

/**
 * Appelé quand un onglet est ouvert depuis un autre (lien).
 * opts.inPile : true = dans la pile de l'onglet d'origine (créée si besoin),
 *               false = nouvel onglet hors pile, juste après la pile.
 *               Par défaut : réglage « Piles d'onglets automatiques ».
 */
function pilesOnTabOpened(newTabId, openerId, opts = {}) {
  const opener = tabs.find(t => t.id === openerId);
  const newTab = tabs.find(t => t.id === newTabId);
  if (!opener || !newTab || opener === newTab) return;
  const inPile = typeof opts.inPile === 'boolean' ? opts.inPile : pilesAuto;

  if (!inPile) {
    // Hors pile : à droite de la pile de l'onglet d'origine (ou de l'onglet lui-même)
    const group = opener.pileId && piles.has(opener.pileId) ? pileTabs(opener.pileId) : [opener];
    moveTabAfter(newTabId, group[group.length - 1].id);
    newTab.pileId = null;
    renderPiles();
    return;
  }

  if (!opener.pileId || !piles.has(opener.pileId)) createPile([opener.id]);
  newTab.pileId = opener.pileId;
  const members = pileTabs(opener.pileId).filter(t => t.id !== newTabId);
  moveTabAfter(newTabId, members[members.length - 1].id);
  const pile = piles.get(opener.pileId);
  if (pile) pile.collapsed = false;
  renderPiles();
}

/** Appelé à chaque changement d'onglet actif : développe la pile si besoin. */
function pilesOnSwitch(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  const pile = tab?.pileId && piles.get(tab.pileId);
  if (pile && pile.collapsed) pile.collapsed = false;
  renderPiles();
}

/** Après un glisser-déposer : rejoindre / quitter une pile selon les voisins. */
function pilesAfterDrag(tabId) {
  const i = tabs.findIndex(t => t.id === tabId);
  if (i < 0) return;
  const tab = tabs[i];
  const prev = tabs[i - 1];
  const next = tabs[i + 1];
  if (prev && next && prev.pileId && prev.pileId === next.pileId) {
    tab.pileId = prev.pileId;               // déposé au milieu d'une pile
  } else if (tab.pileId && prev?.pileId !== tab.pileId && next?.pileId !== tab.pileId) {
    tab.pileId = null;                      // sorti de sa pile
  }
  renderPiles();
}

// ========== RENDU ==========
/** Couleur de texte lisible sur un fond donné. */
function pileTextColor(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  if (!m) return '#fff';
  const [r, g, b] = m.slice(1).map(x => parseInt(x, 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.4 ? '#141414' : '#ffffff';
}

function renderPiles() {
  const container = document.getElementById('tabs-container');
  if (!container) return;
  container.querySelectorAll('.pile-handle').forEach(h => h.remove());

  // Nettoyage : piles sans onglet
  const counts = {};
  tabs.forEach(t => {
    if (!t.pileId) return;
    if (!piles.has(t.pileId)) { t.pileId = null; return; }
    counts[t.pileId] = (counts[t.pileId] || 0) + 1;
  });
  for (const id of [...piles.keys()]) if (!counts[id]) piles.delete(id);

  tabs.forEach((t, i) => {
    const el = document.getElementById(t.id);
    if (!el) return;
    el.classList.remove('in-pile', 'pile-first', 'pile-last', 'pile-hidden');
    const pile = t.pileId && piles.get(t.pileId);
    if (!pile) { el.style.removeProperty('--pile-color'); return; }

    el.classList.add('in-pile');
    el.style.setProperty('--pile-color', pile.color);
    const prev = tabs[i - 1];
    const next = tabs[i + 1];
    if (!prev || prev.pileId !== t.pileId) {
      el.classList.add('pile-first');
      container.insertBefore(createPileHandle(pile, counts[pile.id]), el);
    }
    if (!next || next.pileId !== t.pileId) el.classList.add('pile-last');
    if (pile.collapsed && t.id !== activeTabId) el.classList.add('pile-hidden');
  });
}

/** Onglet de tête de la pile : logo détouré + nom. */
function createPileHandle(pile, count) {
  const h = document.createElement('div');
  h.className = 'pile-handle'
    + (pile.collapsed ? ' collapsed' : '')
    + (pile.name ? ' named' : '')
    + ' solid';
  h.dataset.pile = pile.id;
  h.style.setProperty('--pile-color', pile.color);
  h.style.setProperty('--pile-text', pileTextColor(pile.color));
  h.title = (pile.name ? `${pile.name} — ` : '') + `${count} onglet${count > 1 ? 's' : ''}\nClic : ${pile.collapsed ? 'développer' : 'réduire'} · Clic droit : options`;

  const logoWrap = document.createElement('span');
  logoWrap.className = 'pile-logo' + (pile.logo ? ' custom' : '');
  const img = new Image();
  img.alt = '';
  img.draggable = false;
  img.src = pile.logo || PILE_DEFAULT_LOGO;
  img.addEventListener('error', () => { img.remove(); });
  logoWrap.appendChild(img);
  h.appendChild(logoWrap);

  const text = pile.collapsed
    ? (pile.name ? `${pile.name} · ${count}` : `${count}`)
    : pile.name;
  if (text) {
    const span = document.createElement('span');
    span.className = 'pile-label';
    span.textContent = text;
    h.appendChild(span);
  }

  setupPileHandleDrag(h, pile.id);
  return h;
}

/**
 * L'onglet de tête se saisit comme un onglet classique : glisser = déplacer toute la pile,
 * simple clic = réduire / développer.
 */
function setupPileHandleDrag(handle, pileId) {
  handle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    if (e.button === 1) { e.preventDefault(); return; }
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    let dragging = false;
    let els = [];

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      if (!dragging && Math.abs(dx) > 5) {
        dragging = true;
        els = [handle, ...pileTabs(pileId).map(t => document.getElementById(t.id)).filter(Boolean)];
        els.forEach(el => { el.style.transition = 'none'; el.style.zIndex = '100'; el.classList.add('pile-dragging'); });
      }
      if (dragging) els.forEach(el => { el.style.transform = `translateX(${dx}px)`; });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!dragging) { togglePileCollapsed(pileId); return; }
      // Centre visuel du groupe déplacé
      const rects = els.map(el => el.getBoundingClientRect()).filter(r => r.width > 0);
      const left = Math.min(...rects.map(r => r.left));
      const right = Math.max(...rects.map(r => r.right));
      els.forEach(el => { el.style.transform = ''; el.style.zIndex = ''; el.classList.remove('pile-dragging'); });
      void handle.offsetWidth;
      els.forEach(el => { el.style.transition = ''; });
      movePileTo(pileId, (left + right) / 2);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

/** Replace la pile à la position horizontale donnée, sans couper une autre pile. */
function movePileTo(pileId, centerX) {
  const memberIds = new Set(pileTabs(pileId).map(t => t.id));
  const members = tabs.filter(t => memberIds.has(t.id));
  const others = tabs.filter(t => !memberIds.has(t.id));

  let insertAt = others.length;
  for (let i = 0; i < others.length; i++) {
    const t = others[i];
    const el = document.getElementById(t.id);
    let r = el && el.offsetParent !== null ? el.getBoundingClientRect() : null;
    if (!r && t.pileId) r = document.querySelector(`.pile-handle[data-pile="${t.pileId}"]`)?.getBoundingClientRect();
    if (!r) continue;
    if (centerX < r.left + r.width / 2) { insertAt = i; break; }
  }
  // Ne pas s'insérer au milieu d'une autre pile : se placer après elle
  const prev = others[insertAt - 1];
  if (prev?.pileId && others[insertAt]?.pileId === prev.pileId) {
    while (insertAt < others.length && others[insertAt].pileId === prev.pileId) insertAt++;
  }

  const order = [...others.slice(0, insertAt), ...members, ...others.slice(insertAt)];
  tabs.splice(0, tabs.length, ...order);
  const container = document.getElementById('tabs-container');
  const btn = document.getElementById('new-tab-btn');
  tabs.forEach(t => { const el = document.getElementById(t.id); if (el) container.insertBefore(el, btn); });
  renderPiles();
}

// ========== ACTIONS ==========
function togglePileCollapsed(pileId, force) {
  const pile = piles.get(pileId);
  if (!pile) return;
  const collapse = typeof force === 'boolean' ? force : !pile.collapsed;
  if (collapse) {
    // Si l'onglet actif est dans la pile, basculer vers l'onglet le plus proche hors de la pile
    const active = tabs.find(t => t.id === activeTabId);
    if (active?.pileId === pileId) {
      const members = pileTabs(pileId);
      const first = tabs.indexOf(members[0]);
      const last = tabs.indexOf(members[members.length - 1]);
      const target = tabs[last + 1] || tabs[first - 1];
      if (!target) return; // Rien d'autre à afficher : on ne réduit pas
      pile.collapsed = true;
      switchToTab(target.id);
      return;
    }
  }
  pile.collapsed = collapse;
  renderPiles();
}

function renamePile(pileId) {
  const pile = piles.get(pileId);
  if (!pile) return;
  bmDialog({
    heading: 'Nommer la pile',
    title: pile.name || '',
    showUrl: false,
    showFolder: false,
    confirmLabel: 'Enregistrer'
  }).then(res => {
    if (!res) return;
    pile.name = res.title;
    renderPiles();
  });
}

function setPileColor(pileId, color) {
  const pile = piles.get(pileId);
  if (!pile) return;
  pile.color = color;
  pile.colorChosen = true;
  renderPiles();
}

/** Importer une image comme logo (redimensionnée en 64×64, recadrée au centre). */
function choosePileLogo(pileId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon,image/bmp';
  input.style.display = 'none';
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    input.remove();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const w = img.naturalWidth || size;
        const hgt = img.naturalHeight || size;
        const side = Math.min(w, hgt);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, (w - side) / 2, (hgt - side) / 2, side, side, 0, 0, size, size);
        const pile = piles.get(pileId);
        if (!pile) return;
        pile.logo = canvas.toDataURL('image/png');
        renderPiles();
      };
      img.onerror = () => showNotification("Impossible de lire cette image");
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  document.body.appendChild(input);
  input.click();
}

function removePileLogo(pileId) {
  const pile = piles.get(pileId);
  if (!pile) return;
  pile.logo = null;
  renderPiles();
}

/** Enregistre tous les onglets de la pile dans un nouveau dossier de signets. */
async function savePileToBookmarks(pileId) {
  const pile = piles.get(pileId);
  if (!pile) return;
  const pages = pileTabs(pileId).filter(t => t.webview && bmIsBookmarkableUrl(t.url));
  if (!pages.length) {
    showNotification('Aucune page à enregistrer dans cette pile');
    return;
  }
  const res = await bmDialog({
    heading: 'Enregistrer la pile dans les signets',
    title: pile.name || `Pile du ${new Date().toLocaleDateString('fr-FR')}`,
    showUrl: false,
    parentId: 'bar',
    confirmLabel: `Enregistrer (${pages.length} page${pages.length > 1 ? 's' : ''})`
  });
  if (!res) return;
  const folder = bmNewFolder(res.title);
  folder.children = pages.map(t => bmNewUrl(t.title || t.url, t.url, t.faviconUrl));
  bmAdd(res.parentId, folder);
  if (!pile.name) { pile.name = res.title; renderPiles(); }
  showNotification(`Pile enregistrée dans les signets (${pages.length} page${pages.length > 1 ? 's' : ''})`);
}

/** Ouvre une liste d'URL dans une nouvelle pile (utilisé par « Tout ouvrir » des signets). */
function openUrlsAsPile(urls, name = '') {
  if (!urls.length) return;
  const ids = [];
  urls.forEach(u => {
    createNewTab(u);
    ids.push(tabs[tabs.length - 1].id);
  });
  if (ids.length > 1) createPile(ids, name);
  switchToTab(ids[0]);
}

function ungroupPile(pileId) {
  pileTabs(pileId).forEach(t => { t.pileId = null; });
  piles.delete(pileId);
  renderPiles();
}

function closePile(pileId) {
  const members = pileTabs(pileId);
  if (members.length > 3 && !confirm(`Fermer les ${members.length} onglets de cette pile ?`)) return;
  // Fermer en dernier l'onglet actif pour éviter les bascules inutiles
  members.sort((a, b) => (a.id === activeTabId) - (b.id === activeTabId)).forEach(t => closeTab(t.id));
}

function newTabInPile(pileId) {
  const members = pileTabs(pileId);
  if (!members.length) return;
  createNewTab();
  const newTab = tabs[tabs.length - 1];
  newTab.pileId = pileId;
  moveTabAfter(newTab.id, members[members.length - 1].id);
  renderPiles();
}

function removeTabFromPile(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab?.pileId) return;
  const members = pileTabs(tab.pileId);
  tab.pileId = null;
  // Le sortir à droite de la pile pour la garder contiguë
  const remaining = members.filter(t => t.id !== tabId);
  if (remaining.length) moveTabAfter(tabId, remaining[remaining.length - 1].id);
  renderPiles();
}

// ========== MENUS ==========
function addColorSwatches(pileId) {
  const menu = bmFloating[bmFloating.length - 1];
  const pile = piles.get(pileId);
  if (!menu || !pile) return;
  const row = document.createElement('div');
  row.className = 'pile-swatches';
  PILE_COLORS.forEach(c => {
    const s = document.createElement('button');
    s.className = 'pile-swatch' + (pile.color === c.value ? ' active' : '');
    s.style.background = c.value;
    s.title = c.name;
    s.addEventListener('click', () => {
      bmCloseAll();
      setPileColor(pileId, c.value);
    });
    row.appendChild(s);
  });
  menu.insertBefore(row, menu.firstChild);
  const sep = document.createElement('div');
  sep.className = 'context-menu-separator';
  row.after(sep);
  const r = menu.getBoundingClientRect();
  bmPlace(menu, r.left, r.top);
}

function showPileMenu(pileId, x, y) {
  const pile = piles.get(pileId);
  if (!pile) return;
  const count = pileTabs(pileId).length;
  bmShowContextMenu([
    { label: pile.name ? 'Renommer la pile' : 'Nommer la pile', icon: BM_ICONS.edit, action: () => renamePile(pileId) },
    { label: pile.logo ? 'Changer le logo' : 'Choisir un logo', icon: PILE_ICONS.image, action: () => choosePileLogo(pileId) },
    pile.logo ? { label: 'Remettre le logo Zenith', icon: PILE_ICONS.noImage, action: () => removePileLogo(pileId) } : null,
    { separator: true },
    { label: 'Enregistrer la pile dans les signets', icon: PILE_ICONS.save, action: () => savePileToBookmarks(pileId) },
    { label: pile.collapsed ? 'Développer la pile' : 'Réduire la pile', icon: pile.collapsed ? PILE_ICONS.expand : PILE_ICONS.collapse, action: () => togglePileCollapsed(pileId) },
    { label: 'Nouvel onglet dans la pile', icon: BM_ICONS.plus, action: () => newTabInPile(pileId) },
    { separator: true },
    { label: 'Dégrouper les onglets', icon: PILE_ICONS.out, action: () => ungroupPile(pileId) },
    { label: `Fermer la pile (${count} onglet${count > 1 ? 's' : ''})`, icon: BM_ICONS.close, danger: true, action: () => closePile(pileId) }
  ], x, y);
  addColorSwatches(pileId);
}

function showTabMenu(tabId, x, y) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  const pile = tab.pileId && piles.get(tab.pileId);
  const items = [
    { label: 'Nouvel onglet', icon: BM_ICONS.plus, action: () => createNewTab(), shortcut: 'Ctrl+T' }
  ];
  if (tab.webview) {
    items.push({ label: 'Actualiser', icon: '<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>', action: () => tab.webview.reload() });
    items.push({ label: 'Dupliquer', icon: BM_ICONS.tabs, action: () => { createNewTab(tab.url); const n = tabs[tabs.length - 1]; n.pileId = tab.pileId || null; moveTabAfter(n.id, tab.id); renderPiles(); } });
  }
  items.push({ separator: true });
  if (pile) {
    items.push({ label: 'Nouvel onglet dans la pile', icon: BM_ICONS.plus, action: () => newTabInPile(pile.id) });
    items.push({ label: 'Enregistrer la pile dans les signets', icon: PILE_ICONS.save, action: () => savePileToBookmarks(pile.id) });
    items.push({ label: 'Retirer de la pile', icon: PILE_ICONS.out, action: () => removeTabFromPile(tabId) });
    items.push({ label: pile.collapsed ? 'Développer la pile' : 'Réduire la pile', icon: PILE_ICONS.collapse, action: () => togglePileCollapsed(pile.id) });
  } else {
    items.push({ label: 'Créer une pile avec cet onglet', icon: PILE_ICONS.pile, action: () => createPile([tabId]) });
    // Rejoindre une pile voisine
    const i = tabs.indexOf(tab);
    const neighbour = [tabs[i - 1], tabs[i + 1]].find(t => t?.pileId && piles.has(t.pileId));
    if (neighbour) {
      const n = piles.get(neighbour.pileId);
      items.push({ label: `Ajouter à la pile voisine${n.name ? ` « ${n.name} »` : ''}`, icon: PILE_ICONS.pile, action: () => { tab.pileId = n.id; renderPiles(); } });
    }
  }
  items.push({ separator: true });
  items.push({ label: "Fermer l'onglet", icon: BM_ICONS.close, action: () => closeTab(tabId), shortcut: 'Ctrl+W' });
  if (tabs.length > 1) {
    items.push({ label: 'Fermer les autres onglets', icon: BM_ICONS.close, action: () => tabs.filter(t => t.id !== tabId).forEach(t => closeTab(t.id)) });
  }
  items.push({ label: 'Rouvrir le dernier onglet fermé', icon: BM_ICONS.restore, action: () => reopenLastClosedTab(), shortcut: 'Ctrl+Shift+T', disabled: !closedTabs.length });
  bmShowContextMenu(items, x, y);
}

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
// Clic sur la tête de pile : ouvrir la page de la pile (sinon : réduire / développer)
let pileHeadOpensPage = localStorage.getItem('pileHeadPage') !== 'false';

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

  const pageToggle = document.getElementById('toggle-pile-page');
  if (pageToggle) {
    pageToggle.classList.toggle('active', pileHeadOpensPage);
    pageToggle.addEventListener('click', () => {
      pileHeadOpensPage = !pileHeadOpensPage;
      localStorage.setItem('pileHeadPage', String(pileHeadOpensPage));
      pageToggle.classList.toggle('active', pileHeadOpensPage);
      if (!pileHeadOpensPage && activePileView) closePilePage(true);
      renderPiles();
    });
  }

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

/**
 * Appelé à chaque changement d'onglet actif. Une pile réduite reste réduite :
 * seuls sa tête et l'onglet actif (s'il en fait partie) restent visibles.
 */
function pilesOnSwitch(tabId) {
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
  for (const id of [...piles.keys()]) {
    if (!counts[id]) {
      piles.delete(id);
      document.getElementById(`pileview-${id}`)?.remove();
    }
  }

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
    if (pile.collapsed && (t.id !== activeTabId || activePileView === pile.id)) el.classList.add('pile-hidden');
  });

  if (activePileView) schedulePilePageRender();
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
  if (pile.id === activePileView) h.classList.add('active');
  h.title = (pile.name ? `${pile.name} — ` : '') + `${count} onglet${count > 1 ? 's' : ''}\nClic : ${pileHeadOpensPage ? 'page de la pile' : (pile.collapsed ? 'développer' : 'réduire')} · Clic droit : options`;

  const logoWrap = document.createElement('span');
  logoWrap.className = 'pile-logo' + (pile.logo ? ' custom' : '');
  const img = new Image();
  img.alt = '';
  img.draggable = false;
  img.src = pile.logo || PILE_DEFAULT_LOGO;
  img.addEventListener('error', () => { img.remove(); });
  logoWrap.appendChild(img);
  h.appendChild(logoWrap);

  if (pile.name) {
    const span = document.createElement('span');
    span.className = 'pile-label';
    span.textContent = pile.name;
    h.appendChild(span);
  }
  // Nombre d'onglets : visible au survol uniquement
  const countEl = document.createElement('span');
  countEl.className = 'pile-count';
  countEl.textContent = String(count);
  h.appendChild(countEl);

  // Petit bouton pour réduire / développer la pile
  const toggle = document.createElement('button');
  toggle.className = 'pile-collapse-btn';
  toggle.title = pile.collapsed ? 'Développer la pile' : 'Réduire la pile';
  toggle.innerHTML = pile.collapsed ? PILE_ICONS.expand : PILE_ICONS.collapse;
  toggle.addEventListener('mousedown', (e) => e.stopPropagation());
  toggle.addEventListener('click', (e) => { e.stopPropagation(); togglePileCollapsed(pile.id); });
  h.appendChild(toggle);

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
      if (!dragging) {
        if (pileHeadOpensPage) openPilePage(pileId);
        else togglePileCollapsed(pileId);
        return;
      }
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
  // Réduite : seuls la tête et l'onglet actif (s'il est dans la pile) restent affichés
  pile.collapsed = typeof force === 'boolean' ? force : !pile.collapsed;
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


// ========== PAGE DE LA PILE ==========
// La tête de pile est une page à part entière : elle affiche les pages que la pile contient.
let activePileView = null;
let pilePageRenderQueued = false;
let pilePageRenderPending = false;

function escapePileHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Capture un aperçu de l'onglet (uniquement quand il est visible). */
function capturePileThumb(tab) {
  const wv = tab?.webview;
  if (!wv || !tab.pileId || typeof wv.capturePage !== 'function') return;
  if (!bmIsBookmarkableUrl(tab.url)) return;
  try {
    wv.capturePage().then(img => {
      if (!img || (typeof img.isEmpty === 'function' && img.isEmpty())) return;
      const size = img.getSize ? img.getSize() : { width: 0 };
      const small = size.width > 520 ? img.resize({ width: 520, quality: 'good' }) : img;
      tab.thumb = small.toDataURL();
      if (activePileView && tab.pileId === activePileView) schedulePilePageRender();
    }).catch(() => {});
  } catch { /* webview pas encore prête */ }
}

function openPilePage(pileId) {
  const pile = piles.get(pileId);
  if (!pile) return;
  if (activePileView === pileId) return;
  if (activePileView) closePilePage();

  // Masquer l'onglet actuel (en capturant son aperçu)
  const current = tabs.find(t => t.id === activeTabId);
  if (current) capturePileThumb(current);
  if (activeTabId) {
    document.getElementById(activeTabId)?.classList.remove('active');
    document.getElementById(`webview-${activeTabId}`)?.classList.remove('active');
  }

  let page = document.getElementById(`pileview-${pileId}`);
  if (!page) {
    page = document.createElement('div');
    page.id = `pileview-${pileId}`;
    page.className = 'browser-view pile-page';
    document.getElementById('webviews-container').appendChild(page);
  }
  page.classList.add('active');
  activePileView = pileId;

  const urlBar = document.getElementById('url-bar');
  urlBar.value = '';
  urlBar.placeholder = `Ouvrir une page dans la pile « ${pile.name || 'Pile'} »`;
  document.getElementById('bookmark-star')?.classList.add('hidden');

  renderPiles();
  renderPilePage();
}

/** Ferme la page de pile. restore = revenir sur l'onglet actif. */
function closePilePage(restore = false) {
  if (!activePileView) return;
  activePileView = null;
  document.querySelectorAll('.pile-page.active').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.pile-handle.active').forEach(h => h.classList.remove('active'));
  if (typeof updateSearchEnginePlaceholder === 'function') updateSearchEnginePlaceholder();
  if (restore) {
    const t = tabs.find(x => x.id === activeTabId) || tabs[0];
    if (t) switchToTab(t.id);
  }
}

function schedulePilePageRender() {
  if (pilePageRenderQueued) return;
  pilePageRenderQueued = true;
  requestAnimationFrame(() => {
    pilePageRenderQueued = false;
    if (!activePileView) return;
    if (!piles.has(activePileView)) { closePilePage(true); return; }
    // Pas de re-rendu pendant que l'utilisateur modifie le nom
    if (document.activeElement?.classList.contains('pp-title')) { pilePageRenderPending = true; return; }
    renderPilePage();
  });
}

/** Ouvre une URL dans un nouvel onglet de la pile (barre d'adresse sur la page de pile). */
function pileOpenUrl(pileId, url) {
  const members = pileTabs(pileId);
  createNewTab(url);
  const t = tabs[tabs.length - 1];
  t.pileId = pileId;
  if (members.length) moveTabAfter(t.id, members[members.length - 1].id);
  renderPiles();
}

function moveTabBefore(tabId, beforeTabId) {
  const tab = tabs.find(t => t.id === tabId);
  const before = tabs.find(t => t.id === beforeTabId);
  if (!tab || !before || tab === before) return;
  tabs.splice(tabs.indexOf(tab), 1);
  tabs.splice(tabs.indexOf(before), 0, tab);
  const el = document.getElementById(tabId);
  const beforeEl = document.getElementById(beforeTabId);
  if (el && beforeEl) beforeEl.before(el);
}

function pileTabFavicon(t) {
  const img = document.getElementById(t.id)?.querySelector('.tab-favicon img');
  if (img?.src) return img.src;
  try { return `https://www.google.com/s2/favicons?domain=${new URL(t.url).hostname}&sz=64`; } catch { return ''; }
}

function renderPilePage() {
  const pile = piles.get(activePileView);
  const page = pile && document.getElementById(`pileview-${pile.id}`);
  if (!page) return;
  const members = pileTabs(pile.id);
  const scroll = page.scrollTop;
  const textColor = pileTextColor(pile.color);

  page.style.setProperty('--pile-color', pile.color);
  page.style.setProperty('--pile-text', textColor);
  page.innerHTML = `
    <div class="pp-container">
      <header class="pp-header">
        <button class="pp-logo${pile.logo ? ' custom' : ''}" title="Changer le logo">
          <img src="${escapePileHtml(pile.logo || PILE_DEFAULT_LOGO)}" alt="">
          <span class="pp-logo-edit">${BM_ICONS.edit}</span>
        </button>
        <div class="pp-title-block">
          <h1 class="pp-title" contenteditable="plaintext-only" spellcheck="false" data-placeholder="Nommer la pile" title="Cliquer pour renommer">${escapePileHtml(pile.name || '')}</h1>
          <div class="pp-subtitle">${members.length} page${members.length > 1 ? 's' : ''} dans cette pile</div>
          <div class="pp-swatches">
            ${PILE_COLORS.map(c => `<button class="pp-swatch${c.value === pile.color ? ' active' : ''}" data-color="${c.value}" title="${c.name}" style="background:${c.value}"></button>`).join('')}
          </div>
        </div>
        <div class="pp-actions">
          <button class="pp-btn primary" data-a="new">${BM_ICONS.plus}Nouvel onglet</button>
          <button class="pp-btn" data-a="bookmark">${PILE_ICONS.save}Enregistrer en signets</button>
          <button class="pp-btn" data-a="collapse">${pile.collapsed ? PILE_ICONS.expand : PILE_ICONS.collapse}${pile.collapsed ? 'Développer' : 'Réduire'}</button>
          <button class="pp-btn" data-a="ungroup">${PILE_ICONS.out}Dégrouper</button>
          <button class="pp-btn danger" data-a="close">${BM_ICONS.close}Fermer la pile</button>
        </div>
      </header>
      <div class="pp-grid"></div>
    </div>`;

  const grid = page.querySelector('.pp-grid');
  members.forEach(t => {
    const card = document.createElement('div');
    card.className = 'pp-card' + (t.id === activeTabId ? ' last-active' : '');
    card.draggable = true;
    card.dataset.id = t.id;
    let host = '';
    try { host = new URL(t.url).hostname.replace(/^www\./, ''); } catch { host = t.url || ''; }
    const favicon = pileTabFavicon(t);
    card.innerHTML = `
      <div class="pp-thumb">
        ${t.thumb
          ? `<img class="pp-shot" src="${t.thumb}" alt="">`
          : `<div class="pp-noshot">${favicon ? `<img src="${escapePileHtml(favicon)}" alt="">` : BM_ICONS.globe}</div>`}
        ${t.id === activeTabId ? '<span class="pp-badge">Dernier onglet ouvert</span>' : ''}
        <button class="pp-card-close" title="Fermer l'onglet">${BM_ICONS.close}</button>
      </div>
      <div class="pp-card-info">
        ${favicon ? `<img class="pp-favicon" src="${escapePileHtml(favicon)}" alt="">` : `<span class="pp-favicon">${BM_ICONS.globe}</span>`}
        <div class="pp-card-text">
          <div class="pp-card-title">${escapePileHtml(t.title || 'Nouvel onglet')}</div>
          <div class="pp-card-url">${escapePileHtml(host || 'Page d\'accueil')}</div>
        </div>
      </div>`;
    card.querySelectorAll('img').forEach(img => img.addEventListener('error', () => { img.style.visibility = 'hidden'; }));

    card.addEventListener('click', (e) => {
      if (e.target.closest('.pp-card-close')) return;
      switchToTab(t.id);
    });
    card.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); closeTabFromPilePage(t.id, pile.id); } });
    card.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
    card.querySelector('.pp-card-close').addEventListener('click', (e) => { e.stopPropagation(); closeTabFromPilePage(t.id, pile.id); });
    card.addEventListener('contextmenu', (e) => { e.preventDefault(); showTabMenu(t.id, e.clientX, e.clientY); });

    // Réorganiser par glisser-déposer
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/x-zenith-tab', t.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      grid.querySelectorAll('.drop-before, .drop-after').forEach(c => c.classList.remove('drop-before', 'drop-after'));
    });
    card.addEventListener('dragover', (e) => {
      if (!e.dataTransfer.types.includes('text/x-zenith-tab')) return;
      e.preventDefault();
      const r = card.getBoundingClientRect();
      const after = e.clientX > r.left + r.width / 2;
      grid.querySelectorAll('.drop-before, .drop-after').forEach(c => c.classList.remove('drop-before', 'drop-after'));
      card.classList.add(after ? 'drop-after' : 'drop-before');
    });
    card.addEventListener('drop', (e) => {
      const id = e.dataTransfer.getData('text/x-zenith-tab');
      if (!id || id === t.id) return;
      e.preventDefault();
      const r = card.getBoundingClientRect();
      if (e.clientX > r.left + r.width / 2) moveTabAfter(id, t.id);
      else moveTabBefore(id, t.id);
      renderPiles();
    });
    grid.appendChild(card);
  });

  // Carte « nouvel onglet »
  const add = document.createElement('button');
  add.className = 'pp-card pp-add';
  add.innerHTML = `<div class="pp-add-inner">${BM_ICONS.plus}<span>Nouvel onglet dans la pile</span></div>`;
  add.addEventListener('click', () => newTabInPile(pile.id));
  grid.appendChild(add);

  // En-tête
  page.querySelector('.pp-logo').addEventListener('click', () => choosePileLogo(pile.id));
  // Nom modifiable directement : Entrée ou clic ailleurs pour valider, Échap pour annuler
  const titleEl = page.querySelector('.pp-title');
  const commitTitle = () => {
    const name = titleEl.textContent.replace(/\s+/g, ' ').trim().slice(0, 60);
    if (name !== (pile.name || '')) {
      pile.name = name;
      renderPiles();
    }
    if (pilePageRenderPending) { pilePageRenderPending = false; schedulePilePageRender(); }
  };
  titleEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); titleEl.textContent = pile.name || ''; titleEl.blur(); }
  });
  titleEl.addEventListener('blur', commitTitle);
  titleEl.addEventListener('paste', (e) => {
    e.preventDefault();
    document.execCommand('insertText', false, (e.clipboardData?.getData('text/plain') || '').replace(/\s+/g, ' '));
  });
  page.querySelectorAll('.pp-swatch').forEach(b => b.addEventListener('click', () => setPileColor(pile.id, b.dataset.color)));
  page.querySelector('[data-a="new"]').addEventListener('click', () => newTabInPile(pile.id));
  page.querySelector('[data-a="bookmark"]').addEventListener('click', () => savePileToBookmarks(pile.id));
  page.querySelector('[data-a="collapse"]').addEventListener('click', () => togglePileCollapsed(pile.id));
  page.querySelector('[data-a="ungroup"]').addEventListener('click', () => { ungroupPile(pile.id); closePilePage(true); });
  page.querySelector('[data-a="close"]').addEventListener('click', () => closePile(pile.id));

  page.scrollTop = scroll;
}

/** Fermer un onglet depuis la page de pile sans quitter la page. */
function closeTabFromPilePage(tabId, pileId) {
  closeTab(tabId);
  if (piles.has(pileId) && pileTabs(pileId).length) {
    if (activePileView !== pileId) openPilePage(pileId);
    else schedulePilePageRender();
  }
}

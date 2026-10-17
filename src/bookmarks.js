/**
 * Zenith Browser - Système de signets (inspiré des signets d'Opera)
 *
 * - Bouton signet dans la barre d'URL (Ctrl+D) avec popup d'édition
 * - Barre de signets sous la barre de navigation (Ctrl+Shift+B), dossiers en menus déroulants
 * - Gestionnaire de signets zenith://bookmarks (Ctrl+Shift+O) : arborescence, vues
 *   grandes vignettes / petites vignettes / liste, recherche, glisser-déposer, corbeille,
 *   import / export au format HTML (compatible Opera, Chrome, Firefox, Edge)
 *
 * Ce fichier est chargé après renderer.js et utilise ses globales
 * (tabs, activeTabId, createNewTab, switchToTab, isHomePage, showNotification...).
 */

// ========== ICÔNES ==========
const BM_ICONS = {
  bookmark: '<svg class="icon" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  folder: '<svg class="icon" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  folderPlus: '<svg class="icon" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>',
  globe: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  trash: '<svg class="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  caret: '<svg class="icon" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
  chevronDown: '<svg class="icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>',
  chevrons: '<svg class="icon" viewBox="0 0 24 24"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>',
  gridLarge: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  gridSmall: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="4" height="4" rx=".5"/><rect x="10" y="3" width="4" height="4" rx=".5"/><rect x="17" y="3" width="4" height="4" rx=".5"/><rect x="3" y="10" width="4" height="4" rx=".5"/><rect x="10" y="10" width="4" height="4" rx=".5"/><rect x="17" y="10" width="4" height="4" rx=".5"/><rect x="3" y="17" width="4" height="4" rx=".5"/><rect x="10" y="17" width="4" height="4" rx=".5"/><rect x="17" y="17" width="4" height="4" rx=".5"/></svg>',
  list: '<svg class="icon" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>',
  search: '<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  edit: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  open: '<svg class="icon" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  copy: '<svg class="icon" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  restore: '<svg class="icon" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
  close: '<svg class="icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  plus: '<svg class="icon" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  importIcon: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  exportIcon: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  eye: '<svg class="icon" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  tabs: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2"/></svg>'
};

const BM_ROOT_TITLES = { bar: 'Barre de signets', other: 'Autres signets' };
const BM_DRAG_TYPE = 'application/x-zenith-bookmarks';

let bookmarksData = null;
let bmSaveTimer = null;
let bmDragIds = null;          // ids en cours de glisser-déposer
let bmManager = null;          // état de la page gestionnaire (une seule instance)
let bmMenuStack = [];          // menus déroulants ouverts (barre de signets)
let bmFloating = [];           // éléments flottants (popup, menu contextuel)
let bmDialogResolve = null;

// ========== UTILITAIRES ==========
function bmUid() {
  return 'bm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function bmEl(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined && text !== null) e.textContent = text;
  return e;
}

function bmHost(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

function bmNormalizeUrl(url) {
  return (url || '').trim().replace(/#$/, '').replace(/\/$/, '');
}

function bmFixUrl(input) {
  let url = (input || '').trim();
  if (!url) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return 'https://' + url;
}

function bmIsBookmarkableUrl(url) {
  if (!url) return false;
  if (typeof isHomePage === 'function' && isHomePage(url)) return false;
  return /^(https?|file|ftp):/i.test(url);
}

function bmDisplayUrl(url) {
  return (url || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function bmFolderTitle(node) {
  return BM_ROOT_TITLES[node.id] || node.title || 'Sans nom';
}

function bmNewFolder(title) {
  return { id: bmUid(), type: 'folder', title, children: [], dateAdded: Date.now() };
}

function bmNewUrl(title, url, favicon) {
  return { id: bmUid(), type: 'url', title: title || url, url, favicon: favicon || '', dateAdded: Date.now() };
}

function bmDefaultData() {
  return {
    version: 1,
    roots: {
      bar: { id: 'bar', type: 'folder', title: BM_ROOT_TITLES.bar, children: [], dateAdded: Date.now() },
      other: { id: 'other', type: 'folder', title: BM_ROOT_TITLES.other, children: [], dateAdded: Date.now() }
    },
    trash: [],
    settings: { showBar: true }
  };
}

function bmSanitizeNode(n) {
  if (!n || typeof n !== 'object') return null;
  if (n.type === 'folder') {
    return {
      id: n.id || bmUid(), type: 'folder', title: String(n.title || 'Sans nom'),
      dateAdded: n.dateAdded || Date.now(),
      children: Array.isArray(n.children) ? n.children.map(bmSanitizeNode).filter(Boolean) : []
    };
  }
  if (!n.url) return null;
  return {
    id: n.id || bmUid(), type: 'url', title: String(n.title || n.url), url: String(n.url),
    favicon: n.favicon || '', dateAdded: n.dateAdded || Date.now()
  };
}

function bmNormalizeData(raw) {
  const data = bmDefaultData();
  if (!raw || typeof raw !== 'object' || !raw.roots) return data;
  for (const key of ['bar', 'other']) {
    const r = raw.roots[key];
    if (r && Array.isArray(r.children)) {
      data.roots[key].children = r.children.map(bmSanitizeNode).filter(Boolean);
    }
  }
  if (Array.isArray(raw.trash)) {
    data.trash = raw.trash
      .map(t => t && t.node ? { ...t, node: bmSanitizeNode(t.node) } : null)
      .filter(t => t && t.node);
  }
  if (raw.settings) data.settings = { ...data.settings, ...raw.settings };
  return data;
}

// ========== MODÈLE (ARBRE) ==========
function bmRoots() { return [bookmarksData.roots.bar, bookmarksData.roots.other]; }

function bmWalk(fn) {
  const visit = (node, parent, path) => {
    if (fn(node, parent, path) === false) return false;
    if (node.type === 'folder') {
      for (const c of node.children) {
        if (visit(c, node, [...path, node]) === false) return false;
      }
    }
    return true;
  };
  for (const r of bmRoots()) if (visit(r, null, []) === false) return;
}

function bmFind(id) {
  let found = null;
  bmWalk((node, parent, path) => {
    if (node.id === id) {
      found = { node, parent, path, index: parent ? parent.children.indexOf(node) : -1 };
      return false;
    }
  });
  return found;
}

function bmFindByUrl(url) {
  const target = bmNormalizeUrl(url);
  if (!target) return null;
  let found = null;
  bmWalk(node => {
    if (node.type === 'url' && bmNormalizeUrl(node.url) === target) { found = node; return false; }
  });
  return found;
}

function bmIsRoot(id) { return id === 'bar' || id === 'other'; }

function bmIsAncestor(ancestorId, id) {
  const info = bmFind(id);
  if (!info) return false;
  return info.path.some(p => p.id === ancestorId);
}

function bmCountUrls(folder) {
  let n = 0;
  const visit = f => f.children.forEach(c => c.type === 'folder' ? visit(c) : n++);
  visit(folder);
  return n;
}

function bmCollectUrls(folder) {
  const out = [];
  const visit = f => f.children.forEach(c => c.type === 'folder' ? visit(c) : out.push(c.url));
  visit(folder);
  return out;
}

function bmAdd(parentId, node, beforeId = null) {
  const parent = (bmFind(parentId) || bmFind('other')).node;
  const idx = beforeId ? parent.children.findIndex(c => c.id === beforeId) : -1;
  if (idx >= 0) parent.children.splice(idx, 0, node);
  else parent.children.push(node);
  bmCommit();
  return node;
}

/** Déplace des nœuds vers parentId, avant beforeId (null = à la fin). */
function bmMove(ids, parentId, beforeId = null) {
  const target = bmFind(parentId);
  if (!target || target.node.type !== 'folder') return false;
  const movable = ids
    .map(id => bmFind(id))
    .filter(info => info && !bmIsRoot(info.node.id))
    .filter(info => !(info.node.type === 'folder' && (info.node.id === parentId || bmIsAncestor(info.node.id, parentId))));
  if (!movable.length) return false;
  const movedIds = new Set(movable.map(m => m.node.id));
  if (beforeId && movedIds.has(beforeId)) {
    // Ancre sur le prochain élément non déplacé
    const siblings = target.node.children;
    let i = siblings.findIndex(c => c.id === beforeId);
    while (i >= 0 && i < siblings.length && movedIds.has(siblings[i].id)) i++;
    beforeId = (i >= 0 && i < siblings.length) ? siblings[i].id : null;
  }
  const nodes = movable.map(m => m.node);
  movable.forEach(m => {
    const arr = m.parent.children;
    arr.splice(arr.indexOf(m.node), 1);
  });
  const arr = target.node.children;
  const idx = beforeId ? arr.findIndex(c => c.id === beforeId) : -1;
  if (idx >= 0) arr.splice(idx, 0, ...nodes);
  else arr.push(...nodes);
  bmCommit();
  return true;
}

function bmUpdate(id, changes) {
  const info = bmFind(id);
  if (!info) return;
  if (changes.title !== undefined && !bmIsRoot(id)) info.node.title = changes.title;
  if (changes.url !== undefined && info.node.type === 'url') info.node.url = changes.url;
  if (changes.parentId && changes.parentId !== info.parent?.id) {
    bmMove([id], changes.parentId);
    return;
  }
  bmCommit();
}

function bmTrash(ids) {
  let count = 0;
  ids.forEach(id => {
    if (bmIsRoot(id)) return;
    const info = bmFind(id);
    if (!info) return;
    info.parent.children.splice(info.index, 1);
    bookmarksData.trash.unshift({ node: info.node, parentId: info.parent.id, index: info.index, deletedAt: Date.now() });
    count++;
  });
  if (bookmarksData.trash.length > 500) bookmarksData.trash.length = 500;
  if (count) bmCommit();
  return count;
}

function bmRestore(trashIndexes) {
  const sorted = [...trashIndexes].sort((a, b) => b - a);
  const entries = sorted.map(i => bookmarksData.trash[i]).filter(Boolean);
  sorted.forEach(i => bookmarksData.trash.splice(i, 1));
  entries.reverse().forEach(entry => {
    const parentInfo = bmFind(entry.parentId);
    const parent = parentInfo ? parentInfo.node : bookmarksData.roots.other;
    const idx = Math.min(entry.index ?? parent.children.length, parent.children.length);
    parent.children.splice(idx, 0, entry.node);
  });
  bmCommit();
}

function bmDeleteForever(trashIndexes) {
  [...trashIndexes].sort((a, b) => b - a).forEach(i => bookmarksData.trash.splice(i, 1));
  bmCommit();
}

// ========== PERSISTANCE ==========
function bmCommit() {
  clearTimeout(bmSaveTimer);
  bmSaveTimer = setTimeout(bmFlush, 120);
  bmRefreshAll();
}

function bmFlush() {
  clearTimeout(bmSaveTimer);
  bmSaveTimer = null;
  if (bookmarksData) window.zenithAPI.saveBookmarks(bookmarksData);
}

function bmRefreshAll() {
  renderBookmarksBar();
  updateBookmarkStar();
  if (bmManager && document.body.contains(bmManager.element)) renderBookmarksManager();
}

// ========== INITIALISATION ==========
async function initializeBookmarks() {
  try {
    bookmarksData = bmNormalizeData(await window.zenithAPI.getBookmarks());
  } catch (e) {
    console.error('Erreur de chargement des signets:', e);
    bookmarksData = bmDefaultData();
  }

  document.getElementById('bookmark-star')?.addEventListener('click', () => bookmarkCurrentPage());
  document.getElementById('bookmarks-btn')?.addEventListener('click', () => openBookmarksPage());
  document.getElementById('open-bookmarks')?.addEventListener('click', () => { closeSettingsMenu(); openBookmarksPage(); });
  document.getElementById('toggle-bookmarks-bar')?.addEventListener('click', () => toggleBookmarksBar());

  setupBookmarksBar();
  applyBookmarksBarVisibility();
  updateBookmarkStar();

  window.addEventListener('resize', debounce(() => renderBookmarksBar(), 80));
  window.addEventListener('beforeunload', () => { if (bmSaveTimer) bmFlush(); });

  // Raccourcis clavier internes au gestionnaire (Suppr, Entrée, F2)
  document.addEventListener('keydown', bmHandleManagerKeydown);
}

// ========== OUVERTURE D'URL ==========
function bmOpenUrl(url, inNewTab = false) {
  if (!url) return;
  const tab = tabs.find(t => t.id === activeTabId);
  if (inNewTab || !tab?.webview) {
    createNewTab(url);
    return;
  }
  tab.isNewTab = false;
  tab.webview.src = url;
  tab.url = url;
  document.getElementById('url-bar').value = url;
  updateBookmarkStar();
}

function bmOpenAll(folder) {
  const urls = bmCollectUrls(folder);
  if (!urls.length) return;
  if (urls.length > 15 && !confirm(`Ouvrir ${urls.length} onglets ?`)) return;
  // Ouvrir le dossier comme une pile d'onglets portant son nom
  if (typeof openUrlsAsPile === 'function') openUrlsAsPile(urls, bmIsRoot(folder.id) ? '' : folder.title);
  else urls.forEach(u => createNewTab(u));
}

// ========== BOUTON SIGNET (BARRE D'URL) ==========
function updateBookmarkStar() {
  const star = document.getElementById('bookmark-star');
  if (!star || !bookmarksData) return;
  if (typeof activePileView !== 'undefined' && activePileView) { star.classList.add('hidden'); return; }
  const tab = tabs.find(t => t.id === activeTabId);
  const url = tab?.webview ? tab.url : null;
  const can = bmIsBookmarkableUrl(url);
  const existing = can ? bmFindByUrl(url) : null;
  star.classList.toggle('hidden', !can);
  star.classList.toggle('bookmarked', !!existing);
  star.title = existing ? 'Modifier le signet (Ctrl+D)' : 'Ajouter aux signets (Ctrl+D)';
}

function bookmarkCurrentPage() {
  const tab = tabs.find(t => t.id === activeTabId);
  const url = tab?.webview ? tab.url : null;
  if (!bmIsBookmarkableUrl(url)) {
    showNotification('Cette page ne peut pas être ajoutée aux signets');
    return;
  }
  let node = bmFindByUrl(url);
  let isNew = false;
  if (!node) {
    const lastFolder = localStorage.getItem('bmLastFolder');
    const parentId = lastFolder && bmFind(lastFolder) ? lastFolder : 'bar';
    node = bmAdd(parentId, bmNewUrl(tab.title || url, url, tab.faviconUrl));
    isNew = true;
  }
  showBookmarkPopup(node.id, isNew);
}

function bookmarkLink(url, title) {
  if (!url) return;
  const node = bmAdd('bar', bmNewUrl(title || url, url));
  showNotification('Lien ajouté aux signets');
  return node;
}

function showBookmarkPopup(id, isNew) {
  bmCloseAll();
  const info = bmFind(id);
  if (!info) return;
  const node = info.node;
  const star = document.getElementById('bookmark-star');
  const rect = star.getBoundingClientRect();

  const overlay = bmCreateOverlay(() => commit());
  const popup = bmEl('div', 'bm-popup');
  popup.innerHTML = `
    <div class="bm-popup-header">
      <span class="bm-popup-icon">${BM_ICONS.bookmark}</span>
      <span class="bm-popup-title">${isNew ? 'Signet ajouté' : 'Modifier le signet'}</span>
    </div>
    <label class="bm-field"><span>Nom</span><input type="text" class="bm-input" data-k="title" spellcheck="false"></label>
    <label class="bm-field"><span>Dossier</span><select class="bm-input" data-k="parent"></select></label>
    <div class="bm-popup-actions">
      <button class="bm-btn danger" data-a="remove">${BM_ICONS.trash}Supprimer</button>
      <button class="bm-btn" data-a="manage">Gérer…</button>
      <button class="bm-btn primary" data-a="done">Terminé</button>
    </div>`;
  const titleInput = popup.querySelector('[data-k="title"]');
  const folderSelect = popup.querySelector('[data-k="parent"]');
  titleInput.value = node.title;
  bmFillFolderSelect(folderSelect, info.parent.id);

  let closed = false;
  function commit() {
    if (closed) return;
    closed = true;
    const title = titleInput.value.trim() || node.url;
    const parentId = folderSelect.value;
    localStorage.setItem('bmLastFolder', parentId);
    bmUpdate(node.id, { title, parentId });
    bmCloseAll();
  }

  popup.querySelector('[data-a="done"]').addEventListener('click', commit);
  popup.querySelector('[data-a="remove"]').addEventListener('click', () => {
    closed = true;
    bmTrash([node.id]);
    bmCloseAll();
    showNotification('Signet supprimé');
  });
  popup.querySelector('[data-a="manage"]').addEventListener('click', () => {
    commit();
    openBookmarksPage(info.parent.id);
  });
  titleInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); commit(); }
  });

  document.body.appendChild(popup);
  bmFloating.push(popup);
  bmFloating.overlayCommit = commit;
  const w = popup.offsetWidth;
  popup.style.top = (rect.bottom + 8) + 'px';
  popup.style.left = Math.max(8, Math.min(rect.right - w, window.innerWidth - w - 8)) + 'px';
  requestAnimationFrame(() => popup.classList.add('visible'));
  setTimeout(() => { titleInput.focus(); titleInput.select(); }, 30);
}

function bmFillFolderSelect(select, selectedId, excludeId = null) {
  select.innerHTML = '';
  const add = (folder, depth) => {
    if (excludeId && folder.id === excludeId) return;
    const opt = document.createElement('option');
    opt.value = folder.id;
    opt.textContent = '   '.repeat(depth) + bmFolderTitle(folder);
    if (folder.id === selectedId) opt.selected = true;
    select.appendChild(opt);
    folder.children.filter(c => c.type === 'folder').forEach(c => add(c, depth + 1));
  };
  bmRoots().forEach(r => add(r, 0));
}

// ========== ÉLÉMENTS FLOTTANTS (overlay, menus, dialogues) ==========
function bmCreateOverlay(onClose) {
  let overlay = document.getElementById('bm-overlay');
  if (!overlay) {
    overlay = bmEl('div');
    overlay.id = 'bm-overlay';
    document.body.appendChild(overlay);
  }
  overlay.onmousedown = (e) => {
    if (e.target !== overlay) return;
    e.preventDefault();
    if (onClose) onClose();
    else bmCloseAll();
  };
  overlay.oncontextmenu = (e) => { e.preventDefault(); bmCloseAll(); };
  overlay.classList.add('visible');
  return overlay;
}

/** Ferme tous les éléments flottants des signets (appelé aussi par Échap). */
function bmCloseAll() {
  bmFloating.forEach(el => el.remove());
  bmFloating = [];
  bmMenuStack.forEach(m => m.el.remove());
  bmMenuStack = [];
  document.querySelectorAll('.bmb-item.open').forEach(b => b.classList.remove('open'));
  document.body.classList.remove('bm-menu-open');
  document.getElementById('bm-overlay')?.classList.remove('visible');
  if (bmDialogResolve) { const r = bmDialogResolve; bmDialogResolve = null; r(null); }
}

/** Fermeture via Échap : valide le popup du signet s'il est ouvert. */
function bmHandleEscape() {
  if (bmFloating.overlayCommit && bmFloating.some(e => e.classList.contains('bm-popup'))) {
    const c = bmFloating.overlayCommit;
    bmFloating.overlayCommit = null;
    c();
    return;
  }
  bmCloseAll();
}

function bmPlace(el, x, y) {
  const r = el.getBoundingClientRect();
  if (x + r.width > window.innerWidth - 8) x = Math.max(8, window.innerWidth - r.width - 8);
  if (y + r.height > window.innerHeight - 8) y = Math.max(8, window.innerHeight - r.height - 8);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
}

function bmShowContextMenu(items, x, y) {
  // Ferme un éventuel menu contextuel précédent sans fermer les menus déroulants
  bmFloating.filter(f => f.classList.contains('context-menu')).forEach(f => f.remove());
  bmFloating = bmFloating.filter(f => !f.classList.contains('context-menu'));
  bmCreateOverlay();

  const menu = bmEl('div', 'context-menu bm-context-menu');
  items.forEach(item => {
    if (!item) return;
    if (item.separator) { menu.appendChild(bmEl('div', 'context-menu-separator')); return; }
    const row = bmEl('div', 'context-menu-item' + (item.disabled ? ' disabled' : '') + (item.danger ? ' danger' : ''));
    const icon = bmEl('span', 'context-menu-icon');
    icon.innerHTML = item.icon || '';
    row.append(icon, bmEl('span', 'context-menu-label', item.label));
    if (item.shortcut) row.appendChild(bmEl('span', 'context-menu-shortcut', item.shortcut));
    if (!item.disabled) {
      row.addEventListener('click', () => { bmCloseAll(); item.action(); });
    }
    menu.appendChild(row);
  });
  document.body.appendChild(menu);
  bmFloating.push(menu);
  bmPlace(menu, x, y);
}

/**
 * Boîte de dialogue d'édition (Electron ne supporte pas window.prompt).
 * Retourne une Promise -> { title, url, parentId } ou null.
 */
function bmDialog({ heading, title = '', url = '', showUrl = true, parentId = 'bar', showFolder = true, excludeFolderId = null, confirmLabel = 'Enregistrer' }) {
  bmCloseAll();
  return new Promise(resolve => {
    const overlay = bmCreateOverlay();
    overlay.classList.add('dim');
    const dlg = bmEl('div', 'bm-dialog');
    dlg.innerHTML = `
      <div class="bm-dialog-title"></div>
      <label class="bm-field"><span>Nom</span><input type="text" class="bm-input" data-k="title" spellcheck="false"></label>
      ${showUrl ? '<label class="bm-field"><span>Adresse</span><input type="text" class="bm-input" data-k="url" spellcheck="false" placeholder="https://"></label>' : ''}
      ${showFolder ? '<label class="bm-field"><span>Dossier</span><select class="bm-input" data-k="parent"></select></label>' : ''}
      <div class="bm-dialog-actions">
        <button class="bm-btn" data-a="cancel">Annuler</button>
        <button class="bm-btn primary" data-a="ok"></button>
      </div>`;
    dlg.querySelector('.bm-dialog-title').textContent = heading;
    dlg.querySelector('[data-a="ok"]').textContent = confirmLabel;
    const tIn = dlg.querySelector('[data-k="title"]');
    const uIn = dlg.querySelector('[data-k="url"]');
    const fSel = dlg.querySelector('[data-k="parent"]');
    tIn.value = title;
    if (uIn) uIn.value = url;
    if (fSel) bmFillFolderSelect(fSel, parentId, excludeFolderId);

    const finish = (value) => {
      bmDialogResolve = null;
      bmCloseAll();
      overlay.classList.remove('dim');
      resolve(value);
    };
    const submit = () => {
      const t = tIn.value.trim();
      const u = uIn ? bmFixUrl(uIn.value) : undefined;
      if (uIn && !u) { uIn.classList.add('error'); uIn.focus(); return; }
      if (!uIn && !t) { tIn.classList.add('error'); tIn.focus(); return; }
      finish({ title: t || u, url: u, parentId: fSel ? fSel.value : parentId });
    };
    dlg.querySelector('[data-a="cancel"]').addEventListener('click', () => finish(null));
    dlg.querySelector('[data-a="ok"]').addEventListener('click', submit);
    dlg.querySelectorAll('input').forEach(i => {
      i.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); submit(); }
      });
      i.addEventListener('input', () => i.classList.remove('error'));
    });

    document.body.appendChild(dlg);
    bmFloating.push(dlg);
    bmDialogResolve = (v) => { overlay.classList.remove('dim'); resolve(v); };
    setTimeout(() => { tIn.focus(); tIn.select(); }, 30);
  });
}

// ========== ACTIONS COMMUNES ==========
async function bmEditNode(id) {
  const info = bmFind(id);
  if (!info || bmIsRoot(id)) return;
  const n = info.node;
  const res = await bmDialog({
    heading: n.type === 'folder' ? 'Renommer le dossier' : 'Modifier le signet',
    title: n.title,
    url: n.url || '',
    showUrl: n.type === 'url',
    parentId: info.parent.id,
    excludeFolderId: n.type === 'folder' ? n.id : null
  });
  if (!res) return;
  const changes = { title: res.title };
  if (n.type === 'url') changes.url = res.url;
  bmUpdate(id, changes);
  if (res.parentId !== info.parent.id) bmMove([id], res.parentId);
}

async function bmPromptNewFolder(parentId, beforeId = null) {
  const res = await bmDialog({ heading: 'Nouveau dossier', title: 'Nouveau dossier', showUrl: false, parentId, confirmLabel: 'Créer' });
  if (!res) return null;
  return bmAdd(res.parentId, bmNewFolder(res.title), res.parentId === parentId ? beforeId : null);
}

async function bmPromptNewBookmark(parentId) {
  const tab = tabs.find(t => t.id === activeTabId);
  const useTab = tab?.webview && bmIsBookmarkableUrl(tab.url);
  const res = await bmDialog({
    heading: 'Nouveau signet',
    title: useTab ? tab.title : '',
    url: useTab ? tab.url : '',
    parentId,
    confirmLabel: 'Ajouter'
  });
  if (!res) return null;
  return bmAdd(res.parentId, bmNewUrl(res.title, res.url));
}

function bmDeleteWithToast(ids) {
  const n = bmTrash(ids);
  if (n) showNotification(n > 1 ? `${n} éléments déplacés dans la corbeille` : 'Déplacé dans la corbeille');
}

function bmNodeContextItems(node, { inManager = false } = {}) {
  const items = [];
  if (node.type === 'url') {
    items.push({ label: 'Ouvrir', icon: BM_ICONS.open, action: () => bmOpenUrl(node.url) });
    items.push({ label: 'Ouvrir dans un nouvel onglet', icon: BM_ICONS.tabs, action: () => bmOpenUrl(node.url, true) });
    items.push({ separator: true });
    items.push({ label: 'Modifier…', icon: BM_ICONS.edit, action: () => bmEditNode(node.id), shortcut: inManager ? 'F2' : '' });
    items.push({ label: "Copier l'adresse", icon: BM_ICONS.copy, action: () => navigator.clipboard.writeText(node.url) });
  } else {
    const count = bmCountUrls(node);
    if (inManager) items.push({ label: 'Ouvrir le dossier', icon: BM_ICONS.folder, action: () => bmManagerGo(node.id) });
    items.push({ label: `Tout ouvrir dans de nouveaux onglets (${count})`, icon: BM_ICONS.tabs, action: () => bmOpenAll(node), disabled: !count });
    items.push({ separator: true });
    items.push({ label: 'Ajouter la page actuelle ici', icon: BM_ICONS.bookmark, action: () => bmAddCurrentTo(node.id) });
    items.push({ label: 'Nouveau dossier…', icon: BM_ICONS.folderPlus, action: () => bmPromptNewFolder(node.id) });
    if (!bmIsRoot(node.id)) items.push({ label: 'Renommer…', icon: BM_ICONS.edit, action: () => bmEditNode(node.id), shortcut: inManager ? 'F2' : '' });
  }
  if (!bmIsRoot(node.id)) {
    items.push({ separator: true });
    items.push({ label: 'Supprimer', icon: BM_ICONS.trash, danger: true, action: () => bmDeleteWithToast([node.id]), shortcut: inManager ? 'Suppr' : '' });
  }
  return items;
}

function bmAddCurrentTo(folderId) {
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab?.webview || !bmIsBookmarkableUrl(tab.url)) {
    bmPromptNewBookmark(folderId);
    return;
  }
  bmAdd(folderId, bmNewUrl(tab.title, tab.url, tab.faviconUrl));
  showNotification('Page ajoutée aux signets');
}

// ========== FAVICONS ==========
function bmFaviconEl(node, large = false) {
  const wrap = bmEl('span', 'bm-favicon');
  if (node.type === 'folder') {
    wrap.classList.add('is-folder');
    wrap.innerHTML = BM_ICONS.folder;
    return wrap;
  }
  const sources = [];
  if (node.favicon && /^(https?:|data:image)/.test(node.favicon)) sources.push(node.favicon);
  const host = bmHost(node.url);
  if (host) sources.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${large ? 64 : 32}`);
  if (!sources.length) { wrap.innerHTML = BM_ICONS.globe; return wrap; }
  const img = new Image();
  img.alt = '';
  img.draggable = false;
  let i = 0;
  img.addEventListener('error', () => {
    i++;
    if (i < sources.length) img.src = sources[i];
    else { img.remove(); wrap.innerHTML = BM_ICONS.globe; }
  });
  img.src = sources[0];
  wrap.appendChild(img);
  return wrap;
}

// ========== BARRE DE SIGNETS ==========
function setupBookmarksBar() {
  const bar = document.getElementById('bookmarks-bar');
  if (!bar) return;
  bar.innerHTML = `
    <div class="bmb-items"></div>
    <button class="bmb-item bmb-overflow" title="Plus de signets">${BM_ICONS.chevrons}</button>
    <div class="bmb-sep"></div>
    <button class="bmb-item bmb-other"><span class="bm-favicon is-folder">${BM_ICONS.folder}</span><span class="bmb-label">Autres signets</span></button>`;

  const items = bar.querySelector('.bmb-items');
  const overflowBtn = bar.querySelector('.bmb-overflow');
  const otherBtn = bar.querySelector('.bmb-other');

  overflowBtn.addEventListener('click', () => {
    bmToggleBarMenu(overflowBtn, overflowBtn._nodes || []);
  });
  otherBtn.addEventListener('click', () => {
    bmToggleBarMenu(otherBtn, bookmarksData.roots.other.children);
  });
  otherBtn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    bmShowContextMenu(bmNodeContextItems(bookmarksData.roots.other), e.clientX, e.clientY);
  });
  bmSetupDropTarget(otherBtn, () => ({ parentId: 'other', beforeId: null, into: true }));

  // Clic dans une zone vide de la barre quand un menu est ouvert : fermeture
  bar.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.bmb-item') && bmMenuStack.length) bmCloseAll();
  });

  // Clic droit sur une zone vide de la barre
  bar.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.bmb-item')) return;
    e.preventDefault();
    bmShowContextMenu([
      { label: 'Ajouter la page actuelle', icon: BM_ICONS.bookmark, action: () => bmAddCurrentTo('bar') },
      { label: 'Ajouter un signet…', icon: BM_ICONS.plus, action: () => bmPromptNewBookmark('bar') },
      { label: 'Nouveau dossier…', icon: BM_ICONS.folderPlus, action: () => bmPromptNewFolder('bar') },
      { separator: true },
      { label: 'Gérer les signets', icon: BM_ICONS.bookmark, action: () => openBookmarksPage(), shortcut: 'Ctrl+Shift+O' },
      { label: 'Masquer la barre de signets', icon: BM_ICONS.eye, action: () => toggleBookmarksBar(false), shortcut: 'Ctrl+Shift+B' }
    ], e.clientX, e.clientY);
  });

  // Dépôt dans la zone vide = à la fin de la barre
  bmSetupDropTarget(items, (e) => {
    if (e.target !== items) return null;
    return { parentId: 'bar', beforeId: null };
  });

  renderBookmarksBar();
}

function bmCreateBarItem(node) {
  const btn = bmEl('button', 'bmb-item');
  btn.dataset.id = node.id;
  btn.title = node.type === 'url' ? `${node.title}\n${node.url}` : node.title;
  btn.draggable = true;
  btn.appendChild(bmFaviconEl(node));
  if (node.title) btn.appendChild(bmEl('span', 'bmb-label', node.title));
  else btn.classList.add('icon-only');
  if (node.type === 'folder') btn.classList.add('is-folder');

  btn.addEventListener('click', (e) => {
    if (node.type === 'folder') bmToggleBarMenu(btn, node.children, node);
    else bmOpenUrl(node.url, e.ctrlKey || e.metaKey);
  });
  btn.addEventListener('auxclick', (e) => {
    if (e.button !== 1) return;
    e.preventDefault();
    if (node.type === 'url') bmOpenUrl(node.url, true);
    else bmOpenAll(node);
  });
  btn.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
  btn.addEventListener('mouseenter', () => {
    // Comme Opera/Chrome : survoler un autre dossier quand un menu est ouvert le bascule
    if (bmMenuStack.length && bmMenuStack[0].anchor !== btn && bmMenuStack[0].anchor?.closest('#bookmarks-bar')) {
      if (node.type === 'folder') bmOpenBarMenu(btn, node.children, node);
    }
  });
  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    bmShowContextMenu(bmNodeContextItems(node), e.clientX, e.clientY);
  });

  bmSetupDragSource(btn, () => [node.id], node);
  bmSetupDropTarget(btn, (e) => bmDropPosition(e, btn, node, 'bar', 'horizontal'));
  return btn;
}

function renderBookmarksBar() {
  const bar = document.getElementById('bookmarks-bar');
  if (!bar || !bookmarksData) return;
  const items = bar.querySelector('.bmb-items');
  const overflowBtn = bar.querySelector('.bmb-overflow');
  const otherBtn = bar.querySelector('.bmb-other');
  const sep = bar.querySelector('.bmb-sep');
  if (!items) return;

  items.innerHTML = '';
  const children = bookmarksData.roots.bar.children;
  if (!children.length) {
    const hint = bmEl('span', 'bmb-empty', 'Pour accéder rapidement à vos pages, ajoutez-les ici avec le bouton signet ou Ctrl+D.');
    items.appendChild(hint);
  }
  children.forEach(n => items.appendChild(bmCreateBarItem(n)));

  const hasOther = bookmarksData.roots.other.children.length > 0;
  otherBtn.style.display = hasOther ? '' : 'none';
  sep.style.display = hasOther ? '' : 'none';

  if (!bookmarksData.settings.showBar) return;

  // Débordement : les éléments qui ne tiennent pas vont dans le menu »
  overflowBtn.style.display = '';
  const max = items.clientWidth;
  const hidden = [];
  [...items.children].forEach((c, i) => {
    if (!c.dataset.id) return;
    if (c.offsetLeft + c.offsetWidth > max + 1) {
      c.classList.add('bmb-hidden');
      hidden.push(children[i]);
    }
  });
  overflowBtn._nodes = hidden;
  if (!hidden.length) overflowBtn.style.display = 'none';
}

function applyBookmarksBarVisibility() {
  const show = !!bookmarksData?.settings.showBar;
  document.body.classList.toggle('bookmarks-bar-visible', show);
  const toggleBtn = document.getElementById('toggle-bookmarks-bar');
  if (toggleBtn) toggleBtn.classList.toggle('active', show);
  if (bmManager) {
    const cb = bmManager.element.querySelector('#bm-show-bar');
    if (cb) cb.checked = show;
  }
  requestAnimationFrame(() => {
    renderBookmarksBar();
    if (typeof devToolsOpen !== 'undefined' && devToolsOpen) {
      window.zenithAPI.resizeDevToolsPanel(getDevToolsBounds());
    }
  });
}

function toggleBookmarksBar(force) {
  bookmarksData.settings.showBar = typeof force === 'boolean' ? force : !bookmarksData.settings.showBar;
  applyBookmarksBarVisibility();
  bmCommit();
}

// ---- Menus déroulants des dossiers ----
function bmToggleBarMenu(anchor, nodes, folder = null) {
  if (bmMenuStack.length && bmMenuStack[0].anchor === anchor) {
    bmCloseAll();
    return;
  }
  bmOpenBarMenu(anchor, nodes, folder);
}

function bmOpenBarMenu(anchor, nodes, folder) {
  bmCloseAll();
  bmCreateOverlay();
  // La barre passe au-dessus de l'overlay : survol pour basculer entre dossiers
  if (anchor.closest('#bookmarks-bar')) document.body.classList.add('bm-menu-open');
  anchor.classList.add('open');
  const r = anchor.getBoundingClientRect();
  bmOpenMenuLevel(0, nodes, folder, r.left, r.bottom + 4, anchor);
}

function bmOpenMenuLevel(level, nodes, folder, x, y, anchor) {
  // Ferme les niveaux plus profonds
  while (bmMenuStack.length > level) bmMenuStack.pop().el.remove();

  const menu = bmEl('div', 'bm-menu');
  if (!nodes.length) {
    menu.appendChild(bmEl('div', 'bm-menu-empty', '(vide)'));
  }
  nodes.forEach(node => {
    const row = bmEl('div', 'bm-menu-item' + (node.type === 'folder' ? ' is-folder' : ''));
    row.dataset.id = node.id;
    row.draggable = true;
    row.appendChild(bmFaviconEl(node));
    row.appendChild(bmEl('span', 'bm-menu-label', node.title || node.url));
    if (node.type === 'folder') {
      const c = bmEl('span', 'bm-menu-caret');
      c.innerHTML = BM_ICONS.caret;
      row.appendChild(c);
    } else {
      row.title = node.url;
    }

    let hoverTimer;
    const openSub = () => {
      const rr = row.getBoundingClientRect();
      menu.querySelectorAll('.bm-menu-item.open').forEach(o => o.classList.remove('open'));
      row.classList.add('open');
      bmOpenMenuLevel(level + 1, node.children, node, rr.right - 2, rr.top - 5, row);
    };
    row.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimer);
      if (node.type === 'folder') hoverTimer = setTimeout(openSub, 180);
      else hoverTimer = setTimeout(() => {
        while (bmMenuStack.length > level + 1) bmMenuStack.pop().el.remove();
        menu.querySelectorAll('.bm-menu-item.open').forEach(o => o.classList.remove('open'));
      }, 180);
    });
    row.addEventListener('mouseleave', () => clearTimeout(hoverTimer));
    row.addEventListener('click', (e) => {
      if (node.type === 'folder') { clearTimeout(hoverTimer); openSub(); return; }
      bmCloseAll();
      bmOpenUrl(node.url, e.ctrlKey || e.metaKey);
    });
    row.addEventListener('auxclick', (e) => {
      if (e.button !== 1) return;
      e.preventDefault();
      if (node.type === 'url') { bmOpenUrl(node.url, true); }
      else { bmCloseAll(); bmOpenAll(node); }
    });
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      bmShowContextMenu(bmNodeContextItems(node), e.clientX, e.clientY);
    });
    bmSetupDragSource(row, () => [node.id], node);
    bmSetupDropTarget(row, (e) => bmDropPosition(e, row, node, folder ? folder.id : null, 'vertical'));
    menu.appendChild(row);
  });

  if (folder && nodes.length > 1) {
    menu.appendChild(bmEl('div', 'context-menu-separator'));
    const all = bmEl('div', 'bm-menu-item bm-menu-action');
    const ic = bmEl('span', 'bm-favicon');
    ic.innerHTML = BM_ICONS.tabs;
    all.append(ic, bmEl('span', 'bm-menu-label', `Tout ouvrir (${bmCountUrls(folder)})`));
    all.addEventListener('click', () => { bmCloseAll(); bmOpenAll(folder); });
    menu.appendChild(all);
  }

  document.body.appendChild(menu);
  bmMenuStack.push({ el: menu, anchor, folderId: folder?.id });
  bmPlace(menu, x, y);
  if (level > 0) {
    // Si le sous-menu déborde à droite, l'ouvrir à gauche du parent
    const parentRect = bmMenuStack[level - 1].el.getBoundingClientRect();
    const mr = menu.getBoundingClientRect();
    if (mr.left < parentRect.right - 10) menu.style.left = Math.max(8, parentRect.left - mr.width + 2) + 'px';
  }
}

// ========== GLISSER-DÉPOSER ==========
function bmSetupDragSource(el, getIds, node) {
  el.addEventListener('dragstart', (e) => {
    bmDragIds = getIds();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(BM_DRAG_TYPE, JSON.stringify(bmDragIds));
    if (node?.type === 'url') {
      e.dataTransfer.setData('text/uri-list', node.url);
      e.dataTransfer.setData('text/plain', node.url);
    }
    el.classList.add('bm-dragging');
    document.body.classList.add('bm-drag-active');
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('bm-dragging');
    bmDragIds = null;
    document.body.classList.remove('bm-drag-active');
    bmClearDropMarks();
  });
}

function bmClearDropMarks() {
  document.querySelectorAll('.bm-drop-before, .bm-drop-after, .bm-drop-into').forEach(x => {
    x.classList.remove('bm-drop-before', 'bm-drop-after', 'bm-drop-into');
  });
}

/**
 * Calcule où déposer par rapport à un élément : avant / après / dans (dossier).
 * orientation : 'horizontal' (barre, grilles) ou 'vertical' (listes, menus)
 */
function bmDropPosition(e, el, node, parentId, orientation) {
  if (!parentId) {
    const info = bmFind(node.id);
    parentId = info?.parent?.id;
  }
  if (!parentId) return null;
  const r = el.getBoundingClientRect();
  const ratio = orientation === 'horizontal' ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height;
  if (node.type === 'folder' && ratio > 0.25 && ratio < 0.75) {
    return { parentId: node.id, beforeId: null, into: true, el };
  }
  if (ratio <= 0.5) return { parentId, beforeId: node.id, mark: 'before', el };
  const info = bmFind(node.id);
  const siblings = info ? info.parent.children : [];
  const next = siblings[siblings.indexOf(node) + 1];
  return { parentId, beforeId: next ? next.id : null, mark: 'after', el };
}

function bmSetupDropTarget(el, compute) {
  el.addEventListener('dragover', (e) => {
    if (!bmDragIds) return;
    const pos = compute(e);
    if (!pos) return;
    // Impossible de déposer un dossier dans lui-même
    if (bmDragIds.some(id => id === pos.parentId || bmIsAncestor(id, pos.parentId))) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    bmClearDropMarks();
    const target = pos.el || el;
    if (pos.into) target.classList.add('bm-drop-into');
    else if (pos.mark) target.classList.add(pos.mark === 'before' ? 'bm-drop-before' : 'bm-drop-after');
  });
  el.addEventListener('dragleave', (e) => {
    if (!el.contains(e.relatedTarget)) el.classList.remove('bm-drop-before', 'bm-drop-after', 'bm-drop-into');
  });
  el.addEventListener('drop', (e) => {
    if (!bmDragIds) return;
    const pos = compute(e);
    if (!pos) return;
    e.preventDefault();
    e.stopPropagation();
    const ids = bmDragIds;
    bmDragIds = null;
    bmClearDropMarks();
    bmMove(ids, pos.parentId, pos.beforeId);
  });
}

// ========== GESTIONNAIRE DE SIGNETS (zenith://bookmarks) ==========
function openBookmarksPage(folderId = null) {
  // Une seule page gestionnaire : on la réutilise si elle existe
  const existing = tabs.find(t => t.isBookmarksPage);
  if (existing) {
    switchToTab(existing.id);
    if (folderId) bmManagerGo(folderId);
    return;
  }

  const tabId = `tab-${++tabCounter}`;
  const tabElement = document.createElement('div');
  tabElement.className = 'tab';
  tabElement.id = tabId;
  tabElement.innerHTML = `
    <div class="tab-favicon">${BM_ICONS.bookmark}</div>
    <span class="tab-title">Signets</span>
    <button class="tab-close" title="Fermer">
      <svg class="icon" viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
    </button>`;
  tabElement.addEventListener('click', (e) => { if (!e.target.closest('.tab-close')) switchToTab(tabId); });
  tabElement.querySelector('.tab-close').addEventListener('click', (e) => { e.stopPropagation(); closeTab(tabId); });
  tabElement.addEventListener('mousedown', (e) => { if (e.button === 1) { e.preventDefault(); closeTab(tabId); } });
  if (typeof setupTabDragAndDrop === 'function') setupTabDragAndDrop(tabElement, tabId);
  document.getElementById('tabs-container').insertBefore(tabElement, document.getElementById('new-tab-btn'));

  const page = bmEl('div', 'browser-view bookmarks-page');
  page.id = `webview-${tabId}`;
  page.tabIndex = -1;
  document.getElementById('webviews-container').appendChild(page);

  bmManager = {
    element: page,
    tabId,
    folderId: folderId && bmFind(folderId) ? folderId : 'bar',
    view: localStorage.getItem('bmView') || 'list',
    search: '',
    selected: new Set(),
    lastClicked: null,
    expanded: new Set(JSON.parse(localStorage.getItem('bmExpanded') || '["bar","other"]'))
  };
  bmBuildManagerShell(page);

  tabs.push({ id: tabId, url: 'zenith://bookmarks', title: 'Signets', isBookmarksPage: true, element: page });
  switchToTab(tabId);
  renderBookmarksManager();
}

function bmBuildManagerShell(page) {
  page.innerHTML = `
    <aside class="bm-sidebar">
      <div class="bm-sidebar-title">${BM_ICONS.bookmark}<span>Signets</span></div>
      <nav class="bm-tree"></nav>
      <div class="bm-tree-trash"></div>
      <div class="bm-sidebar-footer">
        <button class="bm-btn bm-io-btn">Importer / Exporter${BM_ICONS.chevronDown}</button>
      </div>
    </aside>
    <section class="bm-main">
      <div class="bm-toolbar">
        <div class="bm-view-switch">
          <button data-view="large" title="Grandes vignettes">${BM_ICONS.gridLarge}</button>
          <button data-view="small" title="Petites vignettes">${BM_ICONS.gridSmall}</button>
          <button data-view="list" title="Liste">${BM_ICONS.list}</button>
        </div>
        <button class="bm-tool-btn" data-a="new-folder" title="Nouveau dossier">${BM_ICONS.folderPlus}</button>
        <button class="bm-tool-btn" data-a="new-bookmark" title="Nouveau signet">${BM_ICONS.plus}</button>
        <div class="bm-search">${BM_ICONS.search}<input type="text" id="bm-search-input" placeholder="Rechercher dans les signets" spellcheck="false" autocomplete="off"><button class="bm-search-clear" title="Effacer">${BM_ICONS.close}</button></div>
        <label class="bm-check"><input type="checkbox" id="bm-show-bar"><span>Afficher la barre de signets</span></label>
      </div>
      <div class="bm-heading"></div>
      <div class="bm-content"></div>
    </section>`;

  page.querySelectorAll('.bm-view-switch button').forEach(b => {
    b.addEventListener('click', () => {
      bmManager.view = b.dataset.view;
      localStorage.setItem('bmView', bmManager.view);
      renderBookmarksManager();
    });
  });
  page.querySelector('[data-a="new-folder"]').addEventListener('click', async () => {
    const node = await bmPromptNewFolder(bmManagerTargetFolder());
    if (node) bmManagerSelect([node.id]);
  });
  page.querySelector('[data-a="new-bookmark"]').addEventListener('click', async () => {
    const node = await bmPromptNewBookmark(bmManagerTargetFolder());
    if (node) bmManagerSelect([node.id]);
  });

  const search = page.querySelector('#bm-search-input');
  search.addEventListener('input', debounce(() => {
    bmManager.search = search.value.trim();
    bmManager.selected.clear();
    renderBookmarksManager();
  }, 150));
  page.querySelector('.bm-search-clear').addEventListener('click', () => {
    search.value = '';
    bmManager.search = '';
    renderBookmarksManager();
    search.focus();
  });

  const cb = page.querySelector('#bm-show-bar');
  cb.checked = !!bookmarksData.settings.showBar;
  cb.addEventListener('change', () => toggleBookmarksBar(cb.checked));

  const ioBtn = page.querySelector('.bm-io-btn');
  ioBtn.addEventListener('click', () => {
    const r = ioBtn.getBoundingClientRect();
    bmShowContextMenu([
      { label: 'Importer des signets (fichier HTML)…', icon: BM_ICONS.importIcon, action: bmImport },
      { label: 'Exporter les signets (fichier HTML)…', icon: BM_ICONS.exportIcon, action: bmExport }
    ], r.left, r.top - 90);
  });

  // Clic droit / clic dans une zone vide du contenu
  const content = page.querySelector('.bm-content');
  content.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.bm-entry')) return;
    e.preventDefault();
    if (bmManager.folderId === 'trash') {
      bmShowContextMenu([
        { label: 'Vider la corbeille', icon: BM_ICONS.trash, danger: true, action: bmEmptyTrash, disabled: !bookmarksData.trash.length }
      ], e.clientX, e.clientY);
      return;
    }
    const target = bmManagerTargetFolder();
    bmShowContextMenu([
      { label: 'Nouveau signet…', icon: BM_ICONS.plus, action: () => bmPromptNewBookmark(target) },
      { label: 'Nouveau dossier…', icon: BM_ICONS.folderPlus, action: () => bmPromptNewFolder(target) },
      { label: 'Ajouter la page actuelle ici', icon: BM_ICONS.bookmark, action: () => bmAddCurrentTo(target) }
    ], e.clientX, e.clientY);
  });
  content.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !e.target.closest('.bm-entry')) {
      bmManager.selected.clear();
      bmManagerApplySelection();
    }
  });
  // Dépôt dans la zone vide = à la fin du dossier courant
  bmSetupDropTarget(content, (e) => {
    if (e.target.closest('.bm-entry') || bmManager.search || bmManager.folderId === 'trash') return null;
    return { parentId: bmManager.folderId, beforeId: null };
  });
}

function bmManagerTargetFolder() {
  if (!bmManager || bmManager.folderId === 'trash' || bmManager.search) return 'bar';
  return bmManager.folderId;
}

function bmManagerGo(folderId) {
  if (!bmManager) return;
  bmManager.folderId = folderId;
  bmManager.selected.clear();
  bmManager.lastClicked = null;
  if (bmManager.search) {
    bmManager.search = '';
    const s = bmManager.element.querySelector('#bm-search-input');
    if (s) s.value = '';
  }
  // Déplier l'arborescence jusqu'au dossier
  const info = bmFind(folderId);
  if (info) info.path.forEach(p => bmManager.expanded.add(p.id));
  bmSaveExpanded();
  renderBookmarksManager();
}

function bmSaveExpanded() {
  localStorage.setItem('bmExpanded', JSON.stringify([...bmManager.expanded]));
}

function bmManagerSelect(ids) {
  if (!bmManager) return;
  bmManager.selected = new Set(ids);
  bmManagerApplySelection();
  const el = bmManager.element.querySelector(`.bm-entry[data-id="${CSS.escape(ids[0] || '')}"]`);
  el?.scrollIntoView({ block: 'nearest' });
}

function bmManagerApplySelection() {
  bmManager.element.querySelectorAll('.bm-entry').forEach(el => {
    el.classList.toggle('selected', bmManager.selected.has(el.dataset.id));
  });
}

function renderBookmarksManager() {
  if (!bmManager) return;
  const page = bmManager.element;
  if (bmManager.folderId !== 'trash' && !bmFind(bmManager.folderId)) bmManager.folderId = 'bar';

  // Vue active
  page.querySelectorAll('.bm-view-switch button').forEach(b => b.classList.toggle('active', b.dataset.view === bmManager.view));
  const isTrash = bmManager.folderId === 'trash';
  page.querySelector('.bm-view-switch').classList.toggle('disabled', isTrash);
  page.querySelectorAll('[data-a="new-folder"], [data-a="new-bookmark"]').forEach(b => b.disabled = isTrash);

  bmRenderTree(page.querySelector('.bm-tree'));
  bmRenderTrashLink(page.querySelector('.bm-tree-trash'));
  bmRenderHeading(page.querySelector('.bm-heading'));

  const content = page.querySelector('.bm-content');
  const scroll = content.scrollTop;
  content.innerHTML = '';
  content.className = 'bm-content view-' + (isTrash ? 'list' : bmManager.view);

  if (isTrash) bmRenderTrash(content);
  else if (bmManager.search) bmRenderSearch(content);
  else bmRenderFolder(content, bmFind(bmManager.folderId).node);

  content.scrollTop = scroll;
  // Purge de la sélection des éléments disparus
  const present = new Set([...content.querySelectorAll('.bm-entry')].map(e => e.dataset.id));
  bmManager.selected.forEach(id => { if (!present.has(id)) bmManager.selected.delete(id); });
  bmManagerApplySelection();
}

function bmRenderTree(nav) {
  nav.innerHTML = '';
  const build = (folder, depth) => {
    const subfolders = folder.children.filter(c => c.type === 'folder');
    const row = bmEl('div', 'bm-tree-row');
    row.style.paddingLeft = (8 + depth * 14) + 'px';
    row.dataset.id = folder.id;
    if (bmManager.folderId === folder.id && !bmManager.search) row.classList.add('active');
    if (bmIsRoot(folder.id)) row.classList.add('root');

    const caret = bmEl('span', 'bm-tree-caret');
    if (subfolders.length) {
      caret.innerHTML = BM_ICONS.caret;
      if (bmManager.expanded.has(folder.id)) caret.classList.add('expanded');
      caret.addEventListener('click', (e) => {
        e.stopPropagation();
        if (bmManager.expanded.has(folder.id)) bmManager.expanded.delete(folder.id);
        else bmManager.expanded.add(folder.id);
        bmSaveExpanded();
        bmRenderTree(nav);
      });
    }
    row.appendChild(caret);
    if (!bmIsRoot(folder.id)) {
      const ic = bmEl('span', 'bm-tree-icon');
      ic.innerHTML = BM_ICONS.folder;
      row.appendChild(ic);
    }
    row.appendChild(bmEl('span', 'bm-tree-label', bmFolderTitle(folder)));
    row.addEventListener('click', () => bmManagerGo(folder.id));
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      bmShowContextMenu(bmNodeContextItems(folder, { inManager: true }), e.clientX, e.clientY);
    });
    if (!bmIsRoot(folder.id)) {
      row.draggable = true;
      bmSetupDragSource(row, () => [folder.id], folder);
    }
    bmSetupDropTarget(row, () => ({ parentId: folder.id, beforeId: null, into: true }));
    nav.appendChild(row);

    if (subfolders.length && bmManager.expanded.has(folder.id)) {
      subfolders.forEach(sf => build(sf, depth + 1));
    }
  };
  bmRoots().forEach(r => build(r, 0));
}

function bmRenderTrashLink(container) {
  container.innerHTML = '';
  const row = bmEl('div', 'bm-tree-row trash');
  if (bmManager.folderId === 'trash') row.classList.add('active');
  const ic = bmEl('span', 'bm-tree-icon');
  ic.innerHTML = BM_ICONS.trash;
  row.append(ic, bmEl('span', 'bm-tree-label', 'Corbeille'));
  if (bookmarksData.trash.length) row.appendChild(bmEl('span', 'bm-tree-count', String(bookmarksData.trash.length)));
  row.addEventListener('click', () => bmManagerGo('trash'));
  // Glisser vers la corbeille = supprimer
  row.addEventListener('dragover', (e) => {
    if (!bmDragIds) return;
    e.preventDefault();
    row.classList.add('bm-drop-into');
  });
  row.addEventListener('dragleave', () => row.classList.remove('bm-drop-into'));
  row.addEventListener('drop', (e) => {
    if (!bmDragIds) return;
    e.preventDefault();
    const ids = bmDragIds;
    bmDragIds = null;
    bmClearDropMarks();
    bmDeleteWithToast(ids);
  });
  container.appendChild(row);
}

function bmRenderHeading(h) {
  h.innerHTML = '';
  if (bmManager.folderId === 'trash') {
    h.appendChild(bmEl('span', 'bm-crumb current', 'Corbeille'));
    if (bookmarksData.trash.length) {
      const btn = bmEl('button', 'bm-btn danger bm-heading-action');
      btn.innerHTML = BM_ICONS.trash + 'Vider la corbeille';
      btn.addEventListener('click', bmEmptyTrash);
      h.appendChild(btn);
    }
    return;
  }
  if (bmManager.search) {
    h.appendChild(bmEl('span', 'bm-crumb current', `Résultats pour « ${bmManager.search} »`));
    return;
  }
  const info = bmFind(bmManager.folderId);
  const chain = [...info.path, info.node];
  chain.forEach((f, i) => {
    if (i > 0) {
      const sep = bmEl('span', 'bm-crumb-sep');
      sep.innerHTML = BM_ICONS.caret;
      h.appendChild(sep);
    }
    const c = bmEl('span', 'bm-crumb' + (i === chain.length - 1 ? ' current' : ''), bmFolderTitle(f));
    if (i < chain.length - 1) c.addEventListener('click', () => bmManagerGo(f.id));
    bmSetupDropTarget(c, () => (i < chain.length - 1 ? { parentId: f.id, beforeId: null, into: true, el: c } : null));
    h.appendChild(c);
  });
  const count = info.node.children.length;
  h.appendChild(bmEl('span', 'bm-heading-count', count ? `${count} élément${count > 1 ? 's' : ''}` : ''));
}

function bmRenderFolder(content, folder) {
  if (!folder.children.length) {
    const empty = bmEl('div', 'bm-empty');
    empty.innerHTML = `${BM_ICONS.bookmark}<h2>Ce dossier est vide</h2><p>Ajoutez des pages avec le bouton signet de la barre d'adresse (Ctrl+D), ou glissez des signets ici.</p>`;
    content.appendChild(empty);
    return;
  }
  const orientation = bmManager.view === 'list' ? 'vertical' : 'horizontal';
  folder.children.forEach(node => {
    const entry = bmCreateEntry(node);
    bmSetupDropTarget(entry, (e) => bmDropPosition(e, entry, node, folder.id, orientation));
    content.appendChild(entry);
  });
}

function bmRenderSearch(content) {
  const q = bmManager.search.toLowerCase();
  const results = [];
  bmWalk((node, parent, path) => {
    if (!parent) return;
    const hay = (node.title + ' ' + (node.url || '')).toLowerCase();
    if (hay.includes(q)) results.push({ node, path: [...path, parent].slice(0) });
  });
  if (!results.length) {
    const empty = bmEl('div', 'bm-empty');
    empty.innerHTML = `${BM_ICONS.search}<h2>Aucun résultat</h2><p>Aucun signet ne correspond à votre recherche.</p>`;
    content.appendChild(empty);
    return;
  }
  results.forEach(r => {
    const parentPath = r.path.filter(Boolean).map(bmFolderTitle).join(' › ');
    content.appendChild(bmCreateEntry(r.node, parentPath));
  });
}

function bmCreateEntry(node, pathLabel = null) {
  const view = bmManager.view;
  const entry = bmEl('div', `bm-entry ${node.type === 'folder' ? 'is-folder' : 'is-url'}`);
  entry.dataset.id = node.id;
  entry.draggable = !bmManager.search;

  if (view === 'list') {
    entry.appendChild(bmFaviconEl(node));
    const title = bmEl('span', 'bm-entry-title', node.title || node.url);
    entry.appendChild(title);
    const n = node.type === 'folder' ? bmCountUrls(node) : 0;
    const sub = bmEl('span', 'bm-entry-url',
      node.type === 'url' ? node.url : (n ? `${n} signet${n > 1 ? 's' : ''}` : 'Vide'));
    entry.appendChild(sub);
    if (pathLabel) entry.appendChild(bmEl('span', 'bm-entry-path', pathLabel));
    const actions = bmEl('span', 'bm-entry-actions');
    const editBtn = bmEl('button', 'bm-icon-btn');
    editBtn.title = node.type === 'folder' ? 'Renommer' : 'Modifier';
    editBtn.innerHTML = BM_ICONS.edit;
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); bmEditNode(node.id); });
    const delBtn = bmEl('button', 'bm-icon-btn danger');
    delBtn.title = 'Supprimer';
    delBtn.innerHTML = BM_ICONS.trash;
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); bmDeleteWithToast([node.id]); });
    actions.append(editBtn, delBtn);
    entry.appendChild(actions);
  } else {
    const thumb = bmEl('div', 'bm-thumb');
    thumb.appendChild(bmFaviconEl(node, view === 'large'));
    if (node.type === 'folder') {
      const n = bmCountUrls(node);
      thumb.appendChild(bmEl('span', 'bm-thumb-count', String(n)));
    }
    entry.appendChild(thumb);
    entry.appendChild(bmEl('div', 'bm-entry-title', node.title || node.url));
    if (view === 'large') {
      entry.appendChild(bmEl('div', 'bm-entry-url', node.type === 'url' ? bmDisplayUrl(bmHost(node.url) || node.url) : 'Dossier'));
    }
    entry.title = node.type === 'url' ? `${node.title}\n${node.url}` : node.title;
  }

  entry.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault();
  });
  entry.addEventListener('click', (e) => bmEntryClick(e, node));
  entry.addEventListener('dblclick', () => {
    if (node.type === 'folder') bmManagerGo(node.id);
    else bmOpenUrl(node.url, true);
  });
  entry.addEventListener('auxclick', (e) => {
    if (e.button !== 1) return;
    e.preventDefault();
    if (node.type === 'url') bmOpenUrl(node.url, true);
    else bmOpenAll(node);
  });
  entry.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!bmManager.selected.has(node.id)) bmManagerSelect([node.id]);
    const sel = [...bmManager.selected];
    if (sel.length > 1) {
      const urls = sel.map(id => bmFind(id)?.node).filter(n => n?.type === 'url');
      bmShowContextMenu([
        { label: `Ouvrir ${urls.length} signets dans de nouveaux onglets`, icon: BM_ICONS.tabs, action: () => urls.forEach(u => createNewTab(u.url)), disabled: !urls.length },
        { separator: true },
        { label: `Supprimer ${sel.length} éléments`, icon: BM_ICONS.trash, danger: true, action: () => bmDeleteWithToast(sel), shortcut: 'Suppr' }
      ], e.clientX, e.clientY);
    } else {
      bmShowContextMenu(bmNodeContextItems(node, { inManager: true }), e.clientX, e.clientY);
    }
  });
  bmSetupDragSource(entry, () => (bmManager.selected.has(node.id) ? [...bmManager.selected] : [node.id]), node);
  return entry;
}

function bmEntryClick(e, node) {
  const sel = bmManager.selected;
  if (e.ctrlKey || e.metaKey) {
    sel.has(node.id) ? sel.delete(node.id) : sel.add(node.id);
    bmManager.lastClicked = node.id;
  } else if (e.shiftKey && bmManager.lastClicked) {
    const ids = [...bmManager.element.querySelectorAll('.bm-entry')].map(x => x.dataset.id);
    const a = ids.indexOf(bmManager.lastClicked);
    const b = ids.indexOf(node.id);
    if (a >= 0 && b >= 0) {
      sel.clear();
      ids.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(id => sel.add(id));
    }
  } else {
    sel.clear();
    sel.add(node.id);
    bmManager.lastClicked = node.id;
  }
  bmManagerApplySelection();
}

// ---- Corbeille ----
function bmRenderTrash(content) {
  const trash = bookmarksData.trash;
  if (!trash.length) {
    const empty = bmEl('div', 'bm-empty');
    empty.innerHTML = `${BM_ICONS.trash}<h2>La corbeille est vide</h2><p>Les signets supprimés apparaissent ici et peuvent être restaurés.</p>`;
    content.appendChild(empty);
    return;
  }
  trash.forEach((entry, idx) => {
    const node = entry.node;
    const row = bmEl('div', 'bm-entry ' + (node.type === 'folder' ? 'is-folder' : 'is-url'));
    row.dataset.id = 'trash-' + idx;
    row.appendChild(bmFaviconEl(node));
    row.appendChild(bmEl('span', 'bm-entry-title', node.title || node.url));
    row.appendChild(bmEl('span', 'bm-entry-url', node.type === 'url' ? node.url : `Dossier · ${bmCountUrls(node)} signet(s)`));
    row.appendChild(bmEl('span', 'bm-entry-path', new Date(entry.deletedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })));
    const actions = bmEl('span', 'bm-entry-actions visible');
    const restore = bmEl('button', 'bm-icon-btn');
    restore.title = 'Restaurer';
    restore.innerHTML = BM_ICONS.restore;
    restore.addEventListener('click', (e) => { e.stopPropagation(); bmRestore([idx]); showNotification('Signet restauré'); });
    const del = bmEl('button', 'bm-icon-btn danger');
    del.title = 'Supprimer définitivement';
    del.innerHTML = BM_ICONS.close;
    del.addEventListener('click', (e) => { e.stopPropagation(); bmDeleteForever([idx]); });
    actions.append(restore, del);
    row.appendChild(actions);
    row.addEventListener('click', (e) => bmEntryClick(e, { id: row.dataset.id }));
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      bmShowContextMenu([
        { label: 'Restaurer', icon: BM_ICONS.restore, action: () => { bmRestore([idx]); showNotification('Signet restauré'); } },
        { label: 'Supprimer définitivement', icon: BM_ICONS.close, danger: true, action: () => bmDeleteForever([idx]) }
      ], e.clientX, e.clientY);
    });
    content.appendChild(row);
  });
}

function bmEmptyTrash() {
  if (!bookmarksData.trash.length) return;
  if (!confirm('Supprimer définitivement tous les éléments de la corbeille ?')) return;
  bookmarksData.trash = [];
  bmCommit();
}

// ---- Clavier dans le gestionnaire ----
function bmHandleManagerKeydown(e) {
  if (!bmManager || e.defaultPrevented) return;
  const active = tabs.find(t => t.id === activeTabId);
  if (!active?.isBookmarksPage) return;
  if (bmFloating.length) return;
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

  const sel = [...bmManager.selected];
  if (e.key === 'Delete' && sel.length) {
    e.preventDefault();
    if (bmManager.folderId === 'trash') {
      bmDeleteForever(sel.map(id => parseInt(id.replace('trash-', ''), 10)));
    } else {
      bmDeleteWithToast(sel);
    }
  } else if (e.key === 'Enter' && sel.length === 1 && bmManager.folderId !== 'trash') {
    const n = bmFind(sel[0])?.node;
    if (!n) return;
    if (n.type === 'folder') bmManagerGo(n.id);
    else bmOpenUrl(n.url, true);
  } else if (e.key === 'F2' && sel.length === 1 && bmManager.folderId !== 'trash') {
    e.preventDefault();
    bmEditNode(sel[0]);
  } else if (e.key === 'Backspace' && !bmManager.search && bmManager.folderId !== 'trash') {
    const info = bmFind(bmManager.folderId);
    if (info?.parent) bmManagerGo(info.parent.id);
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    bmManagerSelect([...bmManager.element.querySelectorAll('.bm-entry')].map(x => x.dataset.id));
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    bmManager.element.querySelector('#bm-search-input')?.focus();
  }
}

/** Appelé quand l'onglet du gestionnaire est fermé. */
function bmOnTabClosed(tabId) {
  if (bmManager && bmManager.tabId === tabId) bmManager = null;
}

// ========== IMPORT / EXPORT (format HTML Netscape) ==========
function bmEscapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function bmToNetscapeHtml() {
  const sec = (t) => Math.floor((t || Date.now()) / 1000);
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file.',
    '     It will be read and overwritten.',
    '     DO NOT EDIT! -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>'
  ];
  const writeFolder = (folder, depth, extra = '') => {
    const pad = '    '.repeat(depth);
    lines.push(`${pad}<DT><H3 ADD_DATE="${sec(folder.dateAdded)}"${extra}>${bmEscapeHtml(bmFolderTitle(folder))}</H3>`);
    lines.push(`${pad}<DL><p>`);
    folder.children.forEach(c => {
      if (c.type === 'folder') writeFolder(c, depth + 1);
      else lines.push(`${pad}    <DT><A HREF="${bmEscapeHtml(c.url)}" ADD_DATE="${sec(c.dateAdded)}">${bmEscapeHtml(c.title)}</A>`);
    });
    lines.push(`${pad}</DL><p>`);
  };
  writeFolder(bookmarksData.roots.bar, 1, ' PERSONAL_TOOLBAR_FOLDER="true"');
  writeFolder(bookmarksData.roots.other, 1);
  lines.push('</DL><p>');
  return lines.join('\n');
}

function bmParseNetscapeHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rootDl = doc.querySelector('dl');
  if (!rootDl) return null;
  let count = 0;

  const parseDl = (dl) => {
    const out = [];
    for (const dt of dl.children) {
      if (dt.tagName !== 'DT') continue;
      const h3 = dt.querySelector(':scope > h3');
      const a = dt.querySelector(':scope > a');
      if (h3) {
        let sub = dt.querySelector(':scope > dl');
        if (!sub && dt.nextElementSibling?.tagName === 'DL') sub = dt.nextElementSibling;
        const folder = bmNewFolder(h3.textContent.trim() || 'Sans nom');
        const added = parseInt(h3.getAttribute('add_date'), 10);
        if (added) folder.dateAdded = added * 1000;
        folder.children = sub ? parseDl(sub) : [];
        folder._toolbar = h3.hasAttribute('personal_toolbar_folder');
        out.push(folder);
      } else if (a) {
        const href = a.getAttribute('href') || '';
        if (!href || /^(javascript|place):/i.test(href)) continue;
        const icon = a.getAttribute('icon') || '';
        const node = bmNewUrl(a.textContent.trim() || href, href, icon.startsWith('data:image') && icon.length < 30000 ? icon : '');
        const added = parseInt(a.getAttribute('add_date'), 10);
        if (added) node.dateAdded = added * 1000;
        out.push(node);
        count++;
      }
    }
    return out;
  };

  return { items: parseDl(rootDl), count };
}

async function bmImport() {
  let text;
  try {
    text = await window.zenithAPI.importBookmarksFile();
  } catch (e) {
    showNotification("Erreur lors de l'ouverture du fichier");
    return;
  }
  if (!text) return;

  const parsed = bmParseNetscapeHtml(text);
  if (!parsed || !parsed.count) {
    showNotification('Aucun signet trouvé dans ce fichier');
    return;
  }
  const strip = (n) => { delete n._toolbar; if (n.type === 'folder') n.children.forEach(strip); return n; };

  // Le dossier "barre personnelle" (Opera/Chrome/Firefox) va dans la barre de signets,
  // le reste dans un dossier "Importés" dans Autres signets.
  const rest = [];
  parsed.items.forEach(item => {
    if (item.type === 'folder' && item._toolbar) {
      bookmarksData.roots.bar.children.push(...item.children.map(strip));
    } else {
      rest.push(strip(item));
    }
  });
  if (rest.length) {
    const date = new Date().toLocaleDateString('fr-FR');
    const folder = bmNewFolder(`Importés le ${date}`);
    folder.children = rest;
    bookmarksData.roots.other.children.push(folder);
  }
  bmCommit();
  showNotification(`${parsed.count} signet${parsed.count > 1 ? 's' : ''} importé${parsed.count > 1 ? 's' : ''}`);
}

async function bmExport() {
  try {
    const path = await window.zenithAPI.exportBookmarksFile(bmToNetscapeHtml());
    if (path) showNotification('Signets exportés');
  } catch (e) {
    showNotification("Erreur lors de l'export");
  }
}

// ===== SEARCH MODULE =====
// Barre de recherche avec animation de caméra + suggestions tirées de l'historique.
//
// - En tapant, le site le plus visité qui commence par le texte est complété directement
//   dans la barre (le « raccourci »). Entrée l'ouvre.
// - Espace sort du raccourci : la complétion disparaît et Entrée lance une recherche.
// - La liste des suggestions (sites et pages récemment visités) s'affiche sous les raccourcis.
//   Flèches haut/bas pour naviguer, Entrée ou clic pour ouvrir.
// - Nécessite l'historique activé dans Zenith.

const SEARCH_ENGINES = {
    google: 'https://www.google.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    bing: 'https://www.bing.com/search?q=',
    brave: 'https://search.brave.com/search?q=',
    ecosia: 'https://www.ecosia.org/search?q=',
    qwant: 'https://www.qwant.com/?q=',
    startpage: 'https://www.startpage.com/do/search?q=',
    yahoo: 'https://search.yahoo.com/search?p=',
    yandex: 'https://yandex.com/search/?text='
};

const MAX_SUGGESTIONS = 6;

function getSearchUrl(query) {
    let engine = null;
    try { engine = localStorage.getItem('searchEngine'); } catch { /* indisponible */ }
    // Moteur choisi dans les paramètres de Zenith, Brave par défaut
    return (SEARCH_ENGINES[engine] || SEARCH_ENGINES.brave) + encodeURIComponent(query);
}

function looksLikeUrl(text) {
    return /^(https?:\/\/)\S+$/i.test(text) ||
        /^([\da-z-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(text) ||
        /^localhost(:\d+)?(\/\S*)?$/i.test(text);
}

// ---------- Index de l'historique ----------
let historyIndex = { sites: [], pages: [] };
let historyLoadedAt = 0;

async function loadHistoryIndex(force = false) {
    if (!force && Date.now() - historyLoadedAt < 30000) return historyIndex;
    const api = window.zenithHome;
    if (!api || typeof api.getHistory !== 'function') return historyIndex;
    try {
        const settings = await api.getHistorySettings?.();
        if (settings && settings.enabled === false) {
            historyIndex = { sites: [], pages: [] };
            historyLoadedAt = Date.now();
            return historyIndex;
        }
        const entries = (await api.getHistory()) || [];
        const now = Date.now();
        const pages = new Map();
        const sites = new Map();
        for (const e of entries) {
            if (!e || !e.url || !/^https?:/i.test(e.url)) continue;
            let parsed;
            try { parsed = new URL(e.url); } catch { continue; }
            // Les visites récentes comptent plus
            const ageDays = (now - (e.timestamp || 0)) / 86400000;
            const weight = ageDays < 1 ? 4 : ageDays < 7 ? 2 : ageDays < 30 ? 1 : 0.4;

            let page = pages.get(e.url);
            if (!page) { page = { type: 'page', url: e.url, title: e.title || e.url, score: 0, last: 0 }; pages.set(e.url, page); }
            page.score += weight;
            if ((e.timestamp || 0) >= page.last) { page.last = e.timestamp || 0; if (e.title) page.title = e.title; }

            const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
            let site = sites.get(host);
            if (!site) { site = { type: 'site', host, url: `${parsed.protocol}//${parsed.hostname}/`, title: host, score: 0, last: 0 }; sites.set(host, site); }
            site.score += weight;
            site.last = Math.max(site.last, e.timestamp || 0);
        }
        historyIndex = { sites: [...sites.values()], pages: [...pages.values()] };
        historyLoadedAt = now;
    } catch (err) {
        console.warn('Suggestions: historique indisponible', err);
    }
    return historyIndex;
}

function findSuggestions(text) {
    const q = text.trim().toLowerCase();
    if (!q) return { completion: null, items: [] };
    const qHost = q.replace(/^https?:\/\//, '').replace(/^www\./, '');

    // Complétion directe : un seul mot qui commence un nom de site visité
    let completion = null;
    if (!/\s/.test(text) && qHost) {
        completion = historyIndex.sites
            .filter(s => s.host.startsWith(qHost) && s.host !== qHost)
            .sort((a, b) => b.score - a.score || b.last - a.last)[0] || null;
        if (!completion) {
            completion = historyIndex.sites.find(s => s.host === qHost) || null;
        }
    }

    const tokens = q.split(/\s+/).filter(Boolean);
    const sites = historyIndex.sites
        .filter(s => s !== completion && tokens.every(t => s.host.includes(t)))
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);
    const pages = historyIndex.pages
        .filter(p => {
            const hay = `${p.title} ${p.url}`.toLowerCase();
            return tokens.every(t => hay.includes(t));
        })
        .sort((a, b) => b.score - a.score || b.last - a.last);

    const seen = new Set();
    const items = [];
    [completion, ...sites, ...pages].forEach(item => {
        if (!item || items.length >= MAX_SUGGESTIONS) return;
        const key = item.url.replace(/\/$/, '');
        if (seen.has(key)) return;
        seen.add(key);
        items.push(item);
    });
    return { completion, items };
}

// ---------- Interface ----------
function initSearch() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    if (!searchForm || !searchInput) return;

    // Liste des suggestions : placée sous les raccourcis
    const list = document.createElement('div');
    list.className = 'search-suggestions';
    list.id = 'searchSuggestions';
    const anchor = document.querySelector('.shortcuts-container') || searchForm.parentElement;
    anchor.insertAdjacentElement('afterend', list);

    const state = {
        typed: '',          // texte réellement tapé
        completion: null,   // site complété dans la barre (le « raccourci »)
        items: [],
        selected: -1        // suggestion choisie aux flèches
    };

    function hasInlineCompletion() {
        return !!state.completion &&
            searchInput.value.length > state.typed.length &&
            searchInput.selectionStart === state.typed.length &&
            searchInput.selectionEnd === searchInput.value.length;
    }

    function clearCompletion() {
        if (hasInlineCompletion()) searchInput.value = state.typed;
        state.completion = null;
    }

    function render() {
        list.innerHTML = '';
        if (!state.items.length || document.activeElement !== searchInput) {
            list.classList.remove('visible');
            return;
        }
        state.items.forEach((item, i) => {
            const row = document.createElement('div');
            row.className = 'suggestion-item' +
                (i === state.selected || (state.selected < 0 && item === state.completion && hasInlineCompletion()) ? ' active' : '');

            const icon = document.createElement('img');
            icon.className = 'suggestion-icon';
            icon.alt = '';
            try { icon.src = `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=32`; } catch { /* ignore */ }
            icon.onerror = () => { icon.src = 'assets/img/planet.svg'; };

            const textWrap = document.createElement('div');
            textWrap.className = 'suggestion-text';
            const title = document.createElement('span');
            title.className = 'suggestion-title';
            title.textContent = item.type === 'site' ? item.host : item.title;
            const url = document.createElement('span');
            url.className = 'suggestion-url';
            url.textContent = item.type === 'site'
                ? 'Site visité'
                : item.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
            textWrap.append(title, url);

            row.append(icon, textWrap);
            if (item === state.completion && hasInlineCompletion() && state.selected < 0) {
                const hint = document.createElement('span');
                hint.className = 'suggestion-hint';
                hint.textContent = 'Entrée pour ouvrir · Espace pour rechercher';
                row.appendChild(hint);
            }
            row.addEventListener('mousedown', (e) => e.preventDefault());
            row.addEventListener('click', () => { window.location.href = item.url; });
            row.addEventListener('mouseenter', () => {
                state.selected = i;
                list.querySelectorAll('.suggestion-item').forEach((r, j) => r.classList.toggle('active', j === i));
            });
            list.appendChild(row);
        });
        list.classList.add('visible');
    }

    async function update(allowInline) {
        await loadHistoryIndex();
        const { completion, items } = findSuggestions(state.typed);
        state.items = items;
        state.selected = -1;
        state.completion = null;

        // Complétion dans la barre : seulement en ajoutant des caractères
        if (allowInline && completion && searchInput.value === state.typed) {
            const qHost = state.typed.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
            if (completion.host.startsWith(qHost.toLowerCase()) && completion.host.length > qHost.length) {
                state.completion = completion;
                searchInput.value = state.typed + completion.host.slice(qHost.length);
                searchInput.setSelectionRange(state.typed.length, searchInput.value.length);
            }
        }
        render();
    }

    // Animation de la caméra quand on focus/blur la barre de recherche
    searchInput.addEventListener('focus', () => {
        if (window.animationManager) {
            window.animationManager.focusCamera();
        }
        loadHistoryIndex(true).then(() => { if (searchInput.value.trim()) update(false); });
    });

    searchInput.addEventListener('blur', () => {
        if (window.animationManager) {
            window.animationManager.unfocusCamera();
        }
        list.classList.remove('visible');
    });

    searchInput.addEventListener('input', (e) => {
        state.typed = searchInput.value;
        const adding = e.inputType === 'insertText' || e.inputType === 'insertFromPaste' || e.inputType === 'insertCompositionText';
        update(adding);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            if (!state.items.length) return;
            e.preventDefault();
            clearCompletion();
            const n = state.items.length;
            state.selected = e.key === 'ArrowDown'
                ? (state.selected + 1) % n
                : (state.selected <= 0 ? n - 1 : state.selected - 1);
            render();
        } else if (e.key === ' ') {
            // Espace : sortir du raccourci (la sélection complétée est remplacée par l'espace)
            state.completion = null;
            state.selected = -1;
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            if (hasInlineCompletion()) {
                // Premier retour arrière : on enlève seulement la complétion
                e.preventDefault();
                clearCompletion();
                render();
            }
        }
    });

    // Soumission du formulaire
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (state.selected >= 0 && state.items[state.selected]) {
            window.location.href = state.items[state.selected].url;
            return;
        }
        if (hasInlineCompletion()) {
            window.location.href = state.completion.url;
            return;
        }
        const query = searchInput.value.trim();
        if (!query) return;
        if (looksLikeUrl(query)) {
            window.location.href = /^https?:\/\//i.test(query) ? query : `https://${query}`;
        } else {
            window.location.href = getSearchUrl(query);
        }
    });
}

// Export
window.SearchModule = {
    initSearch
};

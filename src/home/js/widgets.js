// ===== WIDGETS MODULE =====
// Météo et calendrier déplaçables (glisser) et redimensionnables (poignée en haut à droite).
// Position et taille mémorisées. Double-clic sur la poignée : taille par défaut.

(function () {
    const STORAGE_KEY = 'widgetLayout';
    const MARGIN = 32;
    const WIDGETS = {
        weather: { selector: '#weatherCard', scale: 0.65 },
        calendar: { selector: '.calendar-wrapper', scale: 0.65 }
    };
    const MIN_SCALE = 0.4;
    const MAX_SCALE = 2;

    let layout = {};
    const frames = {};

    function load() {
        try { layout = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { layout = {}; }
        // v2 : la météo n'a plus sa propre mise à l'échelle (0.65), c'est le cadre qui la porte
        if (layout._v !== 2) {
            if (layout.weather && layout.weather.scale) layout.weather.scale = Math.round(layout.weather.scale * 0.65 * 100) / 100;
            layout._v = 2;
            save();
        }
    }

    function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); } catch { /* stockage indisponible */ }
    }

    function scaleOf(key) {
        return (layout[key] && layout[key].scale) || WIDGETS[key].scale;
    }

    function isShown(frame) {
        return !!frame && !!frame.querySelector('.active') && frame.getBoundingClientRect().height > 0;
    }

    /** Positionne un widget : position mémorisée, sinon empilés en bas à gauche. */
    function apply(key) {
        const frame = frames[key];
        if (!frame) return;
        const s = scaleOf(key);
        frame.dataset.scale = String(s);
        frame.style.transform = `scale(${s})`;

        const saved = layout[key];
        let left = MARGIN;
        let bottom = MARGIN;
        if (saved && typeof saved.left === 'number') {
            left = saved.left;
            bottom = saved.bottom;
        } else if (key === 'calendar') {
            // Par défaut, le calendrier se pose au-dessus de la météo (si elle est à sa place par défaut)
            const weatherDefault = !(layout.weather && typeof layout.weather.left === 'number');
            if (weatherDefault && isShown(frames.weather)) {
                bottom = MARGIN + frames.weather.getBoundingClientRect().height + 12;
            }
        }

        // Rester dans la fenêtre
        const r = frame.getBoundingClientRect();
        left = Math.max(0, Math.min(left, window.innerWidth - Math.min(r.width || 100, 100)));
        bottom = Math.max(0, Math.min(bottom, window.innerHeight - Math.min(r.height || 60, 60)));
        frame.style.left = `${left}px`;
        frame.style.bottom = `${bottom}px`;
    }

    function applyAll() {
        apply('weather');
        apply('calendar');
    }

    /** Empêche le clic qui suit un glisser (sinon un jour du calendrier serait sélectionné). */
    function swallowNextClick() {
        const block = (e) => { e.stopPropagation(); e.preventDefault(); };
        window.addEventListener('click', block, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', block, { capture: true }), 60);
    }

    function setupDrag(frame, key) {
        frame.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('.widget-resize-grip')) return;
            if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;

            const r = frame.getBoundingClientRect();
            const startX = e.clientX;
            const startY = e.clientY;
            const startLeft = r.left;
            const startBottom = window.innerHeight - r.bottom;
            let moving = false;

            const onMove = (ev) => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                if (!moving && Math.hypot(dx, dy) > 5) {
                    moving = true;
                    frame.classList.add('dragging');
                }
                if (!moving) return;
                ev.preventDefault();
                layout[key] = { ...(layout[key] || {}), scale: scaleOf(key), left: startLeft + dx, bottom: startBottom - dy };
                apply(key);
                if (key === 'weather') apply('calendar');
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                if (!moving) return;
                frame.classList.remove('dragging');
                save();
                swallowNextClick();
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    function setupResize(frame, grip, key) {
        grip.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            const r = frame.getBoundingClientRect();
            const s0 = scaleOf(key);
            const startX = e.clientX;
            const startY = e.clientY;
            // Ancrage en bas à gauche : on agrandit vers le haut et la droite
            const anchor = { left: r.left, bottom: window.innerHeight - r.bottom };
            frame.classList.add('resizing');

            const onMove = (ev) => {
                const fx = (r.width + (ev.clientX - startX)) / r.width;
                const fy = (r.height - (ev.clientY - startY)) / r.height;
                const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s0 * Math.max(fx, fy)));
                layout[key] = { ...(layout[key] || {}), ...anchor, scale: Math.round(s * 100) / 100 };
                apply(key);
                if (key === 'weather') apply('calendar');
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                frame.classList.remove('resizing');
                save();
                swallowNextClick();
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        grip.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            layout[key] = { ...(layout[key] || {}), scale: WIDGETS[key].scale };
            save();
            applyAll();
        });
    }

    function init() {
        load();
        Object.entries(WIDGETS).forEach(([key, def]) => {
            const el = document.querySelector(def.selector);
            if (!el) return;
            const frame = document.createElement('div');
            frame.className = 'widget-frame';
            frame.dataset.widget = key;
            el.parentNode.insertBefore(frame, el);
            frame.appendChild(el);

            const grip = document.createElement('div');
            grip.className = 'widget-resize-grip';
            grip.title = 'Glisser pour redimensionner · Double-clic : taille par défaut';
            grip.innerHTML = '<i class="fas fa-up-right-and-down-left-from-center"></i>';
            frame.appendChild(grip);

            frames[key] = frame;
            setupDrag(frame, key);
            setupResize(frame, grip, key);
        });

        applyAll();
        window.addEventListener('resize', applyAll);

        // Recalculer quand la météo change de taille ou s'affiche / se masque
        if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => applyAll());
            Object.values(frames).forEach(f => ro.observe(f));
        }
        const mo = new MutationObserver(() => applyAll());
        Object.values(frames).forEach(f => mo.observe(f, { attributes: true, subtree: true, attributeFilter: ['class'] }));

        // Le bouton « Réinitialiser » de la personnalisation remet aussi les widgets à leur place
        document.getElementById('resetSettings')?.addEventListener('click', () => {
            layout = { _v: 2 };
            save();
            applyAll();
        });
    }

    window.WidgetsModule = {
        init,
        /** Facteur d'échelle d'un widget contenant l'élément (pour les positions internes). */
        scaleFor(el) {
            const frame = el && el.closest('.widget-frame');
            return frame ? parseFloat(frame.dataset.scale || '1') || 1 : 1;
        }
    };
})();

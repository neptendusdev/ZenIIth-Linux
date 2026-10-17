// ===== TRANSLATION MODULE =====
// Système de traduction FR/EN

// Français par défaut (Electron suit la langue du système, souvent l'anglais).
// Pour passer en anglais : localStorage.setItem('zenithLang', 'en')
let savedLang = null;
try { savedLang = localStorage.getItem('zenithLang'); } catch { /* indisponible */ }
const currentLang = savedLang === 'en' ? 'en' : 'fr';
const isFrench = currentLang === 'fr';

// Fonction pour traduire la page
function translatePage() {
    const htmlRoot = document.getElementById('htmlRoot');
    htmlRoot.lang = currentLang;
    
    // Traduire tous les éléments avec data-fr et data-en
    document.querySelectorAll('[data-fr]').forEach(element => {
        const text = element.getAttribute(`data-${currentLang}`);
        if (text) {
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                // Pour les inputs, ne pas changer le textContent
            } else if (element.innerHTML.includes('<')) {
                // Si l'élément contient du HTML, utiliser innerHTML
                element.innerHTML = text;
            } else {
                element.textContent = text;
            }
        }
    });
    
    // Traduire les placeholders
    document.querySelectorAll('[data-fr-placeholder]').forEach(element => {
        const placeholder = element.getAttribute(`data-${currentLang}-placeholder`);
        if (placeholder) {
            element.placeholder = placeholder;
        }
    });
    
    // Traduire les boutons avec data-fr/data-en
    document.querySelectorAll('button[data-fr]').forEach(button => {
        const text = button.getAttribute(`data-${currentLang}`);
        if (text) {
            button.textContent = text;
        }
    });
}

// Export
window.TranslationModule = {
    currentLang,
    isFrench,
    translatePage
};

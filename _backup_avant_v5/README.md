# Zenith

Navigateur web minimaliste construit avec Electron.

![Zenith Browser](assets/logo.png)

## Fonctionnalités

- Interface sombre et épurée
- Gestion des onglets (drag & drop, clic molette pour fermer)
- Page d'accueil personnalisable avec horloge, météo, calendrier et raccourcis
- Animations de fond (Galaxy, Medusa, fonds Unsplash)
- Gestionnaire de téléchargements avec progression et vitesse
- Historique de navigation avec recherche
- Piles d'onglets façon Opera (couleur, nom, logo, enregistrement en signets)
- Widgets météo et calendrier déplaçables et redimensionnables
- Suggestions de recherche tirées de l'historique sur la page d'accueil
- Signets façon Opera : barre de signets avec dossiers, gestionnaire `zenith://bookmarks` (vues vignettes/liste, recherche, glisser-déposer, corbeille), import/export HTML compatible Opera/Chrome/Firefox
- Bloqueur de publicités intégré
- Blocage des cookies tiers
- DevTools intégrés
- Thème clair/sombre synchronisé

## Installation

```bash
# Cloner le repo
git clone https://github.com/SkyNigh1/Zenith.git
cd Zenith

# Installer les dépendances
npm install

# Lancer l'application
npm start
```

## Build

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| Ctrl+T | Nouvel onglet |
| Ctrl+W | Fermer l'onglet |
| Ctrl+Shift+T | Rouvrir le dernier onglet |
| Ctrl+Tab | Onglet suivant |
| Ctrl+Shift+Tab | Onglet le plus récent (appuis répétés : remonte l'ordre d'utilisation) |
| Ctrl+Clic droit sur un lien | Nouvel onglet dans la pile |
| Ctrl+Clic gauche sur un lien | Nouvel onglet hors pile |
| Ctrl+L | Focus barre d'URL |
| Ctrl+R | Rafraîchir |
| Ctrl+Shift+R | Rafraîchir (cache ignoré) |
| Ctrl+J | Téléchargements |
| Ctrl+H | Historique |
| Ctrl+D | Ajouter / modifier le signet de la page |
| Ctrl+Shift+B | Afficher / masquer la barre de signets |
| Ctrl+Shift+O | Gestionnaire de signets |
| F12 | DevTools |

## Structure

```
Zenith/
├── src/
│   ├── main.js          # Process principal Electron
│   ├── preload.js       # Bridge API
│   ├── renderer.js      # Interface navigateur
│   ├── bookmarks.js     # Système de signets
│   ├── bookmarks.css    # Styles des signets
│   ├── index.html       # Structure HTML
│   ├── styles.css       # Styles
│   └── home/            # Page d'accueil
├── assets/
│   ├── logo.png
│   └── logo.ico
└── package.json
```

## Technologies

- Electron
- HTML/CSS/JavaScript vanilla

## Licence

MIT

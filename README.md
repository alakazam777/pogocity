# PogoCity

Le portail web clé en main pour les communautés **Pokémon GO** locales — globe 3D,
classements, échanges, Pokédex, événements. Connecté au réseau **Pogosphère**.

Ce dépôt est un **template** : créez le site de votre ville en quelques minutes.

---

## 🚀 Créer le site de votre ville

### 1. Prérequis
- [Node.js](https://nodejs.org) 20 ou plus récent
- Un compte Discord (pour la connexion des utilisateurs)
- Un compte GitHub

### 2. Récupérer le code
Cliquez sur le bouton vert **« Use this template »** en haut de cette page GitHub,
puis **Create a new repository**. Donnez-lui le nom de votre ville (ex. `pogo-angers`).

Ensuite, sur votre ordinateur :

```bash
git clone https://github.com/VOTRE-COMPTE/pogo-angers.git
cd pogo-angers
npm install
```

### 3. Configurer votre ville
Ouvrez **`city.config.js`** et remplissez vos informations : nom du site, ville,
domaine, langue, coordonnées GPS, couleur, lien Discord, contact.

👉 C'est le **seul fichier** à modifier pour la personnalisation.

### 4. Les secrets
Copiez `.env.example` vers `.env.local` :

```bash
cp .env.example .env.local
```

Puis remplissez les valeurs (identifiants Discord, etc.). Voir **`DISCORD_SETUP.md`**
pour créer votre application Discord.

⚠️ Ne committez **jamais** `.env.local` — il contient vos secrets (déjà dans `.gitignore`).

### 5. Votre logo
Remplacez ces fichiers dans `/public` par les vôtres :
- `logo.svg` — le logo du site
- `icon-512.png` — l'icône / favicon
- `og-image.png` — l'image de partage social (1200 × 630 px)

### 6. Lancer le site

```bash
npm run dev      # développement (ouvrez l'adresse indiquée dans le terminal)
npm run build    # build de production
```

---

## 🌐 Le réseau Pogosphère

PogoCity se connecte à **[pogosphere.com](https://pogosphere.com)**, le hub mondial :

- **Événements** — votre site affiche automatiquement le calendrier d'événements
  partagé par le hub. Rien à gérer.
- **Classements & échanges** — une fois votre site en ligne, vos dresseurs et vos
  listes d'échanges peuvent apparaître sur la carte mondiale de Pogosphère.
  Contactez l'équipe Pogosphère pour enregistrer l'URL de votre ville.

Réglages dans `city.config.js` → section `federation`.

---

## 🔄 Rester à jour

PogoCity évolue (design, nouvelles fonctionnalités). Pour récupérer les dernières
améliorations sans perdre votre configuration :

```bash
# Une seule fois — lier le template d'origine :
git remote add upstream https://github.com/VOTRE-COMPTE/pogocity.git

# À chaque mise à jour :
git fetch upstream
git merge upstream/main
```

Votre `city.config.js` et vos secrets ne sont pas touchés — seul le code commun
est mis à jour.

---

## 📁 Structure du projet

| Chemin | Rôle |
|---|---|
| `city.config.js` | **Votre configuration** (à éditer) |
| `.env.local` | **Vos secrets** (à créer, jamais committé) |
| `src/` | Le code de l'application (Next.js) |
| `public/` | Images, logos, assets |
| `data/` | Données locales du site (créées automatiquement) |

---

## ⚖️ Mentions

PogoCity est un projet communautaire **fan-made**, gratuit et non commercial,
indépendant des éditeurs et développeurs de tout jeu de capture de créatures.
Toutes les marques tierces appartiennent à leurs ayants droit respectifs.

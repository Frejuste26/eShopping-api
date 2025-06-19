# 🛒 eShopping API

> ⚙️ Un moteur backend puissant pour propulser votre e-commerce. Développé avec rigueur, inspiré par la vitesse et l'efficacité du futur. **Évolutif, modulaire et sécurisé**.

![License](https://img.shields.io/github/license/Frejuste26/cerincommerce-api?style=flat-square)
![Node](https://img.shields.io/badge/Node.js-18.x-green?style=flat-square&logo=node.js)
![Express](https://img.shields.io/badge/Express.js-4.x-black?style=flat-square&logo=express)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=flat-square&logo=postgresql)
![Status](https://img.shields.io/badge/Stable-yes-brightgreen?style=flat-square)
![Made with ❤️](https://img.shields.io/badge/Made%20with-%E2%9D%A4-red?style=flat-square)

---

## ✨ Fonctionnalités principales

### 🔐 Authentification & Utilisateurs
- Inscription / Connexion sécurisée (JWT, OAuth)
- Réinitialisation de mot de passe
- Rôles et permissions (Admin, Modérateur, Client)
- Suivi d’activité utilisateur

### 🛍️ Produits & Catégories
- CRUD complet des produits
- Organisation en catégories et sous-catégories
- Upload d’images avec CDN
- Gestion avancée du stock

### 🧺 Panier & Commandes
- Panier dynamique par utilisateur
- Suivi des statuts de commande
- Système de notification
- Génération de facture

### 💳 Paiement sécurisé
- Intégration Stripe / PayPal / MTN Mobile Money / Orange Money
- Historique des transactions
- Statistiques par méthode de paiement

---

## 🧠 Stack Technique

| Catégorie        | Technologie         |
|------------------|---------------------|
| Langage          | Node.js             |
| Framework        | Express.js          |
| Base de données  | PostgreSQL / MySQL  |
| Authentification | JWT, bcrypt         |
| ORM              | Sequelize / Prisma  |
| Stockage         | AWS S3 / Cloudinary |
| Paiements        | Wave, MoMo          |
| Tests            | Jest / Supertest    |

---

## 🏗️ Structure du projet

```Architecture
📦 eShopping
┣ 📂 __tests__  # test unitaires
┣ 📂 App        # Dossier Application
┃  ┣ 📂 Configs
┃  ┣ 📂 Controllers
┃  ┣ 📂 Middlewares
┃  ┣ 📂 Models
┃  ┣ 📂 Public
┃  ┣ 📂 Routes
┃  ┣ 📂 Utils
┃  ┣ 📂 Views
┃  ┗ 📜 app.js
┣ 📂 Uploads
┣ 📂 Logs
┣ 📜 .env
┣ 📜 .gitignore
┣ 📜 package.json
┣ 📜 server.js
┣ 📜 swagger.json
┗ 📜 README.md
```

---

## 🧬 Base de données

Structure relationnelle pensée pour l’évolutivité :

- `users`: gestion des profils
- `products`: catalogue de produits
- `categories`: hiérarchie produit
- `orders`: suivi et historique
- `payments`: sécurité financière
- `cart`: gestion en temps réel

Un diagramme peut être consulté ici : [📄 database.pdf](./database.pdf) *(à générer)*

---

## 🚀 Installation locale

```bash
git clone https://github.com/Frejuste26/cerincommerce-api.git
cd cerincommerce-api
npm install
cp .env.example .env
# Remplissez les variables nécessaires
npm run dev
```

---
## 🛣️ Roadmap

 -Authentification utilisateur
 -Gestion produits / catégories
 -Commandes et paniers
 -Paiement mobile avec intégration API Côte d'Ivoire 🇨🇮
 -Système de notifications push
 -Système de recommandation AI (🚀 à venir)
 -Dockerisation & CI/CD

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour participer :
1.Fork le dépôt
2.Crée une branche (git checkout -b feature/ma-fonction)
3.Commit tes modifications (git commit -am 'Ajout d’une nouvelle fonctionnalité')
4.Push (git push origin feature/ma-fonction)
4.Ouvre une Pull Request

## 📜 Licence

Distribué sous licence MIT. Voir LICENSE pour plus d’informations.

## 👑 Auteur
Frejuste Kei Prince – [@Frejuste26](https://github.com/Frejuste26/)

---

> “Les lignes de code sont les vers de notre époque. Et chaque API, un pont vers demain.”

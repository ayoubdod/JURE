# Guide pour exécuter le projet Jure DRF

## Prérequis

- Python 3.11 ou supérieur
- Poetry (gestionnaire de dépendances)
- Git

## Installation

### 1. Installer Poetry (si ce n'est pas déjà fait)

```bash
# Windows (PowerShell)
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -

# Ou avec pip
pip install poetry
```

### 2. Installer les dépendances

```bash
# Dans le répertoire du projet
cd C:\jure\jure-drf

# Installer les dépendances avec Poetry
poetry install
```

### 3. Activer l'environnement virtuel Poetry

```bash
# Activer le shell Poetry
poetry shell

# Ou utiliser poetry run pour exécuter les commandes
```

## Configuration

### 1. Créer un fichier .env (optionnel)

Le projet utilise `django-environ`. Créez un fichier `.env` à la racine du projet si vous avez besoin de variables d'environnement personnalisées :

```env
FRONTEND_BASE_URL=http://localhost:3000
DEBUG=True
SECRET_KEY=your-secret-key-here
```

### 2. Appliquer les migrations

```bash
# Appliquer toutes les migrations
poetry run python manage.py migrate

# Ou si vous êtes dans le shell Poetry
python manage.py migrate
```

### 3. Créer un superutilisateur (optionnel)

```bash
poetry run python manage.py createsuperuser
```

## Exécution du serveur

### Option 1: Serveur de développement Django (HTTP)

```bash
poetry run python manage.py runserver
```

Le serveur sera accessible sur : `http://localhost:8000`

### Option 2: Serveur ASGI avec Daphne (pour WebSockets)

```bash
poetry run daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

## Accès aux endpoints

- **API Base URL**: `http://localhost:8000/api/v1/`
- **Documentation Swagger**: `http://localhost:8000/api/docs/`
- **Admin Django**: `http://localhost:8000/admin/`
- **API Schema**: `http://localhost:8000/api/schema/`

## Commandes utiles

### Vérifier les utilisateurs et permissions
```bash
poetry run python manage.py check_user_permissions <email>
```

### Vérifier un email
```bash
poetry run python manage.py verify_email <email>
```

### Trouver les doublons d'utilisateurs
```bash
poetry run python manage.py find_duplicate_users
poetry run python manage.py find_duplicate_users --clean
```

### Corriger les propriétaires de cabinet
```bash
poetry run python manage.py fix_cabinet_owners
```

### Supprimer tous les utilisateurs
```bash
poetry run python manage.py delete_all_users
poetry run python manage.py delete_all_users --force
```

## Dépannage

### Problème: "Module not found"
```bash
# Réinstaller les dépendances
poetry install
```

### Problème: "Database does not exist"
```bash
# Le projet utilise SQLite par défaut (db.sqlite3)
# Si vous utilisez PostgreSQL, configurez-le dans settings.py
```

### Problème: "Port already in use"
```bash
# Utiliser un autre port
poetry run python manage.py runserver 8001
```

## Structure des endpoints principaux

- `/api/v1/dj-rest-auth/login/` - Connexion
- `/api/v1/dj-rest-auth/registration/` - Inscription
- `/api/v1/clients/` - Gestion des clients
- `/api/v1/cabinets/members/` - Gestion des membres d'équipe
- `/api/v1/cases/` - Gestion des dossiers
- `/api/v1/tasks/` - Gestion des tâches
- `/api/v1/library/` - Bibliothèque de documents
- `/api/v1/chat/` - Chat (WebSocket)

## Notes importantes

1. **Base de données**: Le projet utilise SQLite par défaut (`db.sqlite3`)
2. **WebSockets**: Pour utiliser les WebSockets (chat), utilisez Daphne au lieu de `runserver`
3. **Email**: Configurez les paramètres SMTP dans `settings.py` pour l'envoi d'emails
4. **CORS**: Les origines autorisées sont configurées dans `settings.py`










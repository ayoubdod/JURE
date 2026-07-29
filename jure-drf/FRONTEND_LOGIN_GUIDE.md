# Guide de connexion - Frontend

## Endpoint de connexion

**URL:** `POST /api/v1/dj-rest-auth/login/`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

## Format de la requête

### Option 1: Connexion par email
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

### Option 2: Connexion par téléphone
```json
{
  "email": "+212612345678",
  "password": "your_password"
}
```

**Note importante:** Le champ `email` dans la requête peut contenir soit un email, soit un numéro de téléphone. Le backend détecte automatiquement le type d'identifiant.

## Réponse en cas de succès (200 OK)

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    ...
  }
}
```

## Réponses d'erreur possibles

### 1. Identifiants incorrects (400 Bad Request)
```json
{
  "non_field_errors": [
    "Unable to log in with provided credentials."
  ]
}
```

**Causes possibles:**
- Email/téléphone incorrect
- Mot de passe incorrect
- Utilisateur n'existe pas

### 2. Email non vérifié (400 Bad Request)
```json
{
  "non_field_errors": [
    "L'e-mail n'est pas vérifié."
  ]
}
```

**Solution:** L'utilisateur doit vérifier son email avant de pouvoir se connecter.

### 3. Téléphone non vérifié (400 Bad Request)
```json
{
  "non_field_errors": [
    "Le téléphone n'est pas vérifié."
  ]
}
```

**Solution:** L'utilisateur doit vérifier son téléphone avant de pouvoir se connecter.

### 4. Utilisateur inactif (400 Bad Request)
```json
{
  "non_field_errors": [
    "User account is disabled."
  ]
}
```

## Exemple de code JavaScript/TypeScript

### Avec fetch
```javascript
async function login(emailOrPhone, password) {
  try {
    const response = await fetch('http://localhost:8000/api/v1/dj-rest-auth/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: emailOrPhone,  // Peut être un email ou un téléphone
        password: password
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.non_field_errors?.[0] || 'Erreur de connexion');
    }

    const data = await response.json();
    
    // Sauvegarder les tokens
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    
    return data;
  } catch (error) {
    console.error('Erreur de connexion:', error.message);
    throw error;
  }
}

// Utilisation
login('user@example.com', 'password123')
  .then(data => console.log('Connecté:', data))
  .catch(error => console.error('Erreur:', error));
```

### Avec axios
```javascript
import axios from 'axios';

async function login(emailOrPhone, password) {
  try {
    const response = await axios.post(
      'http://localhost:8000/api/v1/dj-rest-auth/login/',
      {
        email: emailOrPhone,  // Peut être un email ou un téléphone
        password: password
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Sauvegarder les tokens
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    
    return response.data;
  } catch (error) {
    if (error.response) {
      // Erreur de l'API
      const errorMessage = error.response.data.non_field_errors?.[0] || 'Erreur de connexion';
      throw new Error(errorMessage);
    }
    throw error;
  }
}
```

## Points importants pour le frontend

1. **Champ `email` polyvalent:** Le champ `email` dans la requête accepte aussi bien un email qu'un numéro de téléphone. Le backend détecte automatiquement le type.

2. **Gestion des erreurs:** Toujours vérifier `non_field_errors` dans la réponse d'erreur pour afficher un message approprié à l'utilisateur.

3. **Stockage des tokens:** Après une connexion réussie, stockez les tokens JWT (`access` et `refresh`) pour les utiliser dans les requêtes authentifiées.

4. **Format du téléphone:** Si vous utilisez un téléphone, assurez-vous qu'il est dans le format attendu (généralement avec le code pays, ex: `+212612345678`).

5. **Validation côté client:** Validez que l'email/téléphone et le mot de passe ne sont pas vides avant d'envoyer la requête.

## Dépannage

Si vous obtenez toujours "Unable to log in with provided credentials" malgré des identifiants corrects:

1. Vérifiez que l'email/téléphone est exactement comme enregistré (sensible à la casse pour le téléphone, insensible pour l'email).

2. Vérifiez que l'utilisateur existe et est actif dans la base de données.

3. Vérifiez que l'email est vérifié si la vérification est obligatoire.

4. Utilisez la commande de diagnostic backend:
   ```bash
   python manage.py check_user_auth <email_or_phone> --password <password>
   ```





# Création de facture (dossier) — contrat API officiel

`POST /api/v1/cases/<case_id>/invoices/`  
(Côté front relatif : `cases/{caseId}/invoices/` sous la base API.)

---

## 1) Point d’entrée (backend)

| Élément | Valeur |
|--------|--------|
| **Fichier** | `finance/views/case_finance_views.py` |
| **Classe** | `InvoiceListCreateView` |
| **Méthode** | `post` |
| **URL Django** | `api/v1/cases/<int:case_id>/` → include `finance.case_urls` → route `invoices/` (`finance/case_urls.py`) |

---

## 2) Serializer — champs acceptés (noms **exactes**)

Classe : `InvoiceCreateSerializer` dans `finance/serializers/invoice_serializer.py`.

| Champ JSON | Type | Obligatoire | Remarque |
|------------|------|-------------|----------|
| **`fee_id`** | entier ou `null` | Non | FK vers un **Fee** du **même dossier** (`case`). Si l’id n’existe pas pour ce dossier → erreur de validation sur `fee_id`. |
| **`amount_ht`** | nombre (décimal) | **Oui** | Montant HT. Chaîne numérique acceptée par DRF. |
| **`due_date`** | date ou `null` | Non | **Recommandé :** date seule `YYYY-MM-DD` (ex. `"2026-03-24"`). Les chaînes type ISO datetime (`2026-03-24T00:00:00.000Z`) sont **normalisées** côté backend (partie date avant `T`). |
| **`notes`** | string | Non | Peut être absent, `""` ou texte. |

**Non supporté comme clé d’entrée :** `fee` (utiliser `fee_id`), `montant_ht` (utiliser `amount_ht`), etc.

---

## 3) Règles métier → **400** (validation DRF)

Réponses typiques : objet JSON avec clés de champs **ou** `non_field_errors` (liste de strings).

| Situation | Corps typique (exemple) |
|-----------|-------------------------|
| Dossier **sans cabinet** | `{"case": ["Case must belong to a cabinet to create an invoice."]}` |
| Dossier **sans client** (`case.client` null) | `{"client": ["Case must have a client to create an invoice."]}` |
| Profil client introuvable (rare) | `{"client": ["Could not resolve client profile for this case."]}` |
| **`amount_ht`** manquant | `{"amount_ht": ["This field is required."]}` |
| **`fee_id`** invalide pour ce dossier | `{"fee_id": ["Invalid pk \"…\" - object does not exist."]}` (formulation DRF) |
| **`due_date`** format invalide (après normalisation) | `{"due_date": ["Date has wrong format. Use one of these formats instead: YYYY-MM-DD."]}` |

**Il n’y a pas** aujourd’hui de règle « honoraire déjà entièrement facturé » : plusieurs factures peuvent référencer le même `fee` (pas de blocage métier côté modèle sur ce point).

**404** : dossier inexistant ou pas dans le cabinet de l’utilisateur (voir §5).

---

## 4) Permissions

| Cas | HTTP | Corps JSON typique |
|-----|------|---------------------|
| Non authentifié | **401** | `{"detail": "Authentication credentials were not provided."}` |
| Authentifié mais rôle ≠ **OWNER** ni **ADMIN** | **403** | `{"detail": "Access denied. Finance module requires Owner or Administrator role."}` |
| Utilisateur **sans cabinet** (propriétaire ni membre) | **403** | `{"detail": "User is not attached to any cabinet."}` |

Permissions sur la vue : `[IsAuthenticated, IsFinanceAuthorized]` (`finance/permissions.py`).

---

## 5) Exemples de réponses d’échec (pour debug front)

**404 — mauvais `case_id` ou dossier d’un autre cabinet**

```json
{"detail": "Not found."}
```

**400 — client dossier manquant**

```json
{"client": ["Case must have a client to create an invoice."]}
```

**400 — `fee_id` qui n’appartient pas au dossier**

```json
{"fee_id": ["Invalid pk \"999\" - object does not exist."]}
```

**403 — rôle non autorisé**

```json
{"detail": "Access denied. Finance module requires Owner or Administrator role."}
```

**500** : en cas d’erreur serveur inattendue, consulter les logs Django / Daphne ; une ligne de log **INFO** est émise au début de chaque POST facture :

```text
invoice_create POST case_id=<id> user_id=<id> body=<QueryDict ou dict>
```

(Niveau `INFO`, logger `finance.views.case_finance_views` — à désactiver ou passer en `DEBUG` en production si besoin.)

---

## 6) Exemple de payload **valide**

```json
{
  "fee_id": 12,
  "amount_ht": 5000.0,
  "due_date": "2026-04-15",
  "notes": "Acompte sur honoraires"
}
```

Sans notes, sans `fee_id` (facture sans lien honoraire) :

```json
{
  "amount_ht": 2500.5,
  "due_date": "2026-04-15"
}
```

---

## 7) Exemple de réponse **201** (succès)

Les montants TTC/TVA sont calculés côté serveur ; `invoice_number` est généré (`FAC-YYYY-XXX`).

```json
{
  "id": 3,
  "invoice_number": "FAC-2026-001",
  "case": 1,
  "client": {
    "id": 42,
    "name": "Jean Dupont",
    "ice": null,
    "if_number": null
  },
  "fee": 12,
  "amount_ht": 5000.0,
  "tva_rate": 20.0,
  "tva_amount": 1000.0,
  "amount_ttc": 6000.0,
  "status": "DRAFT",
  "issued_date": "2026-03-24",
  "due_date": "2026-04-15",
  "notes": "Acompte sur honoraires",
  "created_by": 7,
  "created_at": "2026-03-24T12:00:00.123456Z",
  "updated_at": "2026-03-24T12:00:00.123456Z",
  "is_overdue": false
}
```

*(Les valeurs sont indicatives ; les noms de champs correspondent au `InvoiceSerializer`.)*

---

## Fichiers liés

- `finance/case_urls.py` — route `invoices/`
- `finance/serializers/invoice_serializer.py` — `InvoiceCreateSerializer`, `InvoiceSerializer`
- `finance/models/invoice.py` — modèle `Invoice`
- `finance/signals.py` — `pre_save` numéro de facture

Index : `docs/BACKEND_FRONTEND_SYNC.md`

# Configurazione Keycloak Admin per promozione organizer

Questa guida serve a configurare la promozione automatica da Admin EventHub. Senza questa configurazione, il backend puo aggiornare utenti locali ma non puo assegnare il ruolo `organizer` in Keycloak, quindi l'app mostra il messaggio di configurazione mancante.

## Obiettivo

Creare un client confidenziale in Keycloak con permessi minimi per assegnare ruoli agli utenti del realm `eventhub`.

Valori usati dal progetto:

- Realm: `eventhub`
- Client frontend pubblico: `eventhub-frontend`
- Ruolo da assegnare: `organizer`
- Variabili backend richieste:
  - `KEYCLOAK_ADMIN_CLIENT_ID`
  - `KEYCLOAK_ADMIN_CLIENT_SECRET`

## 1. Aprire Keycloak

Con lo stack locale Docker:

```bash
docker compose up -d keycloak
```

Apri:

```text
http://localhost:8080
```

Credenziali locali definite in `docker-compose.yml`:

```text
username: admin
password: admin
```

Entra nel realm `eventhub`.

## 2. Creare il client admin

Vai in:

```text
Clients -> Create client
```

Configura:

```text
Client type: OpenID Connect
Client ID: eventhub-admin
Name: EventHub Admin
```

Nella schermata successiva:

```text
Client authentication: On
Authorization: Off
Authentication flow: Service accounts roles
```

Salva.

## 3. Assegnare i permessi al service account

Apri il client appena creato:

```text
Clients -> eventhub-admin
```

Vai in:

```text
Service account roles
```

Premi:

```text
Assign role
```

Nella modale di assegnazione non cercarli in `Realm roles`: non sono ruoli del realm
come `user`, `organizer` o `admin`. Sono ruoli del client interno
`realm-management`.

Seleziona il filtro/dropdown:

```text
Filter by clients
```

Poi cerca e assegna questi ruoli del client `realm-management`:

```text
manage-users
view-users
view-realm
```

Nella tabella Keycloak puo mostrare voci come `realm-managementcreate-client`:
significa che sta concatenando client e ruolo nella stessa riga. In quel caso usa
la ricerca della modale per cercare un ruolo alla volta, per esempio
`manage-users`.

Se non li vedi, controlla di essere nel realm `eventhub` e di avere davvero aperto:

```text
Clients -> eventhub-admin -> Service account roles -> Assign role
```

In alternativa, puoi assegnarli direttamente da terminale:

```bash
python3 - <<'PY'
import json
import urllib.parse
import urllib.request

base = "http://localhost:8080"
realm = "eventhub"

def request(method, url, token=None, data=None, headers=None):
    headers = dict(headers or {})
    body = None
    if data is not None:
        if isinstance(data, (dict, list)):
            body = json.dumps(data).encode()
            headers["Content-Type"] = "application/json"
        else:
            body = data
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req) as res:
        return res.status, res.read().decode()

data = urllib.parse.urlencode({
    "client_id": "admin-cli",
    "username": "admin",
    "password": "admin",
    "grant_type": "password",
}).encode()
_, raw = request(
    "POST",
    f"{base}/realms/master/protocol/openid-connect/token",
    data=data,
    headers={"Content-Type": "application/x-www-form-urlencoded"},
)
token = json.loads(raw)["access_token"]

def client_uuid(client_id):
    _, raw = request(
        "GET",
        f"{base}/admin/realms/{realm}/clients?clientId={urllib.parse.quote(client_id)}",
        token=token,
    )
    return json.loads(raw)[0]["id"]

admin_client_uuid = client_uuid("eventhub-admin")
realm_management_uuid = client_uuid("realm-management")
_, raw = request(
    "GET",
    f"{base}/admin/realms/{realm}/clients/{admin_client_uuid}/service-account-user",
    token=token,
)
service_user_id = json.loads(raw)["id"]
_, raw = request(
    "GET",
    f"{base}/admin/realms/{realm}/clients/{realm_management_uuid}/roles",
    token=token,
)
wanted = {"manage-users", "view-users", "view-realm"}
roles = [role for role in json.loads(raw) if role["name"] in wanted]
request(
    "POST",
    f"{base}/admin/realms/{realm}/users/{service_user_id}/role-mappings/clients/{realm_management_uuid}",
    token=token,
    data=roles,
)
print("Ruoli assegnati:", ", ".join(sorted(role["name"] for role in roles)))
PY
```

`manage-users` permette l'assegnazione dei role mappings. `view-users` e `view-realm` permettono al backend di leggere utenti e ruoli quando popola la dashboard admin.

## 4. Recuperare il secret

Vai in:

```text
Clients -> eventhub-admin -> Credentials
```

Copia il valore:

```text
Client secret
```

## 5. Aggiornare le variabili ambiente

Nel file `.env` del progetto imposta:

```env
KEYCLOAK_ADMIN_CLIENT_ID=eventhub-admin
KEYCLOAK_ADMIN_CLIENT_SECRET=<client-secret-copiato-da-keycloak>
```

Lascia coerenti anche:

```env
KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_REALM=eventhub
KEYCLOAK_CLIENT_ID=eventhub-frontend
```

Se il backend gira dentro Docker Compose, `docker-compose.yml` usa `http://keycloak:8080` per `KEYCLOAK_BASE_URL`. In quel caso il valore nel container deve rimanere:

```env
KEYCLOAK_BASE_URL=http://keycloak:8080
```

## 6. Riavviare il backend

Dopo aver modificato `.env`, riavvia il backend:

```bash
docker compose up -d --force-recreate backend
```

Oppure, se lo stai eseguendo localmente, ferma e riavvia il processo Flask.

## 7. Verifica

1. Accedi a EventHub con un utente `admin`.
2. Vai in `Admin`.
3. Premi `Promuovi` su un utente.
4. Il messaggio atteso e:

```text
Ruolo organizer assegnato in Keycloak.
```

5. Fai logout e login con l'utente promosso.
6. L'utente deve vedere la voce `Organizzatore` e poter aprire `/organizer`.

## Troubleshooting

### Vedo ancora il messaggio di configurazione mancante

Controlla che nel backend siano valorizzate entrambe:

```env
KEYCLOAK_ADMIN_CLIENT_ID
KEYCLOAK_ADMIN_CLIENT_SECRET
```

Poi riavvia il backend. Le variabili vengono lette all'avvio.

### Ricevo errori 401 o 403 dal backend

Controlla:

- `KEYCLOAK_BASE_URL` deve essere raggiungibile dal backend.
- Il client `eventhub-admin` deve avere `Client authentication` attivo.
- Il service account deve avere almeno i client roles `manage-users`, `view-users`, `view-realm` del client `realm-management`.
- Il realm deve essere `eventhub`.

### L'utente promosso non vede subito Organizer

I ruoli Keycloak sono nel token. Dopo la promozione l'utente promosso deve fare logout/login, oppure attendere il refresh del token.

### Il ruolo organizer non esiste

Nel realm `eventhub`, vai in:

```text
Realm roles
```

Verifica che esista il ruolo:

```text
organizer
```

Il realm importato da `keycloak/realm-export.json` dovrebbe gia includerlo.

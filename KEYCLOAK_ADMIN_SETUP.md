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

Seleziona il filtro:

```text
Filter by clients
```

Assegna questi ruoli del client `realm-management`:

```text
manage-users
view-users
view-realm
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
- Il service account deve avere almeno `manage-users`, `view-users`, `view-realm`.
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

# EventHub

Web application full-stack per gestione eventi culturali a tema orologi, con backend Flask, frontend Angular, MySQL e autenticazione Keycloak.

## Stack

- Backend: Flask, Blueprint REST, SQLAlchemy, Flask-Migrate, Marshmallow, pytest.
- Frontend: Angular standalone components, Tailwind CSS, RxJS services, guards e HTTP interceptor.
- Auth: Keycloak OIDC. Angular usa redirect login/registrazione, Flask valida JWT via JWKS.
- Database: MySQL 8.4.
- Dev stack: Docker Compose con MySQL, Keycloak, backend e frontend.

## Avvio con Docker

```bash
cp .env.example .env
docker compose up --build
```

Servizi:

- Frontend: http://localhost:4200
- Backend API: http://localhost:5000
- Swagger/OpenAPI: http://localhost:5000/api/docs
- Keycloak: http://localhost:8080, admin `admin`, password `admin`

Il realm `eventhub` viene importato da `keycloak/realm-export.json` con client pubblico `eventhub-frontend` e ruoli `user`, `organizer`, `admin`.

I dati sono persistiti in volumi Docker nominati:

- `mysql_data` per MySQL.
- `keycloak_data` per utenti, ruoli e configurazioni Keycloak.
- `backend_uploads` per le copertine caricate.

Per riavviare senza perdere dati usa:

```bash
docker compose restart
```

oppure:

```bash
docker compose down
docker compose up -d
```

Non usare `docker compose down -v` se vuoi conservare i dati: l'opzione `-v` elimina anche i volumi.

Per provare le aree protette:

1. Crea un utente dalla UI Keycloak o dal link registrazione Angular.
2. Entra in Keycloak admin, realm `eventhub`, assegna i ruoli `organizer` o `admin` all'utente quando serve.
3. Riesegui login per aggiornare il token con i ruoli.

## Backend locale

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export FLASK_APP=app:create_app
flask db upgrade
flask run --host=0.0.0.0 --port=5000
```

Variabili principali in `.env.example`:

- `DATABASE_URL`
- `KEYCLOAK_BASE_URL`
- `KEYCLOAK_REALM`
- `KEYCLOAK_CLIENT_ID`
- `KEYCLOAK_ADMIN_CLIENT_ID` e `KEYCLOAK_ADMIN_CLIENT_SECRET`, opzionali per promozione automatica a organizer.

Per configurare la promozione automatica tramite Keycloak Admin API, vedi [KEYCLOAK_ADMIN_SETUP.md](KEYCLOAK_ADMIN_SETUP.md).

## Frontend locale

```bash
cd frontend
npm install
npm start
```

La configurazione Angular si trova in `src/environments/environment.ts`.

## Test

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm run build
```

## Funzionalita incluse

- Area pubblica con lista eventi, filtri, dettaglio, iscrizione e recensioni.
- Area utente con profilo EventHub modificabile via API/app, biglietti e QR code.
- Area organizer con CRUD eventi, upload copertina, statistiche e CSV iscritti.
- Area admin con ban utenti, promozione organizer tramite Keycloak Admin API opzionale e moderazione recensioni.
- Dark mode e switch lingua IT/EN lato frontend.
- Task asincrono semplice con `threading` per conferma iscrizione.

Il profilo EventHub (`display_name`, `city`) si modifica tramite `PATCH /api/me/profile`. Email, login, password e ruoli restano gestiti da Keycloak.

Sono escluse le funzionalita nel blocco `<Ignore>` di `instructions.md`: Stripe, WebSocket e relazione di consegna.

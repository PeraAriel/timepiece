"EventHub": Piattaforma di Gestione Eventi a tema orologi

Una piccola associazione culturale vuole digitalizzare la gestione dei propri eventi (concerti,
workshop, presentazioni di libri). Hai il compito di sviluppare una web application full-stack
con backend in Flask e frontend in Angular che permetta agli organizzatori di pubblicare
eventi e agli utenti di iscriversi, lasciare recensioni e gestire i propri biglietti.

Requisiti funzionali

Area pubblica

•  Homepage con lista eventi in evidenza e prossimi in programma
•  Pagina di dettaglio evento (descrizione, data, luogo, posti disponibili, locandina)
•  Ricerca e filtri per categoria, data, città, prezzo
•  Registrazione e login utente (JWT)

Area utente autenticato

Iscrizione/disiscrizione agli eventi (con verifica posti disponibili)

•
•  Visualizzazione dei propri biglietti con QR code
•  Pubblicazione di recensioni (rating 1–5 + commento) solo dopo che l'evento si è svolto
•  Modifica del profilo personale e cambio password

Area organizzatore (ruolo separato)

•  CRUD eventi con upload immagine di copertina (NON URL)
•  Dashboard con statistiche: iscritti per evento, incassi stimati, rating medio
•  Esportazione lista iscritti in CSV

Area admin

•  Gestione utenti (ban, promozione a organizzatore)
•  Moderazione recensioni segnalate
•  Creazione eventi

Requisiti tecnici

Backend (Flask)

•  API REST con Flask + Flask-RESTful o Blueprint organizzati per risorsa
•  Database relazionale (PostgreSQL o SQLite per sviluppo) con SQLAlchemy
•  Migrazioni con Flask-Migrate / Alembic
•  Autenticazione JWT (Flask-JWT-Extended) con refresh token
•  Validazione input con Marshmallow o Pydantic
•  Gestione ruoli (user / organizer / admin) con decoratori personalizzati
•  Almeno un task asincrono (es. invio email di conferma iscrizione) con Celery + Redis o,

in alternativa, threading per semplicità

•  Test unitari su almeno 3 endpoint critici con pytest

Frontend (Angular)

•  Angular standalone components o moduli ben organizzati
•  Routing con lazy loading per le aree autenticate
•  Guards per proteggere le rotte in base al ruolo
•  HTTP Interceptor per inserire il token JWT e gestire errori 401
•  State management con services + RxJS (BehaviorSubject) oppure NgRx se vuoi alzare l'asticella

•  Form reattivi con validazioni custom
•  UI con Angular Tailwind , responsive mobile-first

Trasversale

•  README con istruzioni di setup chiare (backend, frontend, DB)
•  Variabili d'ambiente in .env (non committare segreti)
•  File docker-compose.yml per avviare backend + DB + frontend
•  Documentazione API con Swagger/OpenAPI
•  Repository Git con commit history sensata e branch per le feature principali


Internazionalizzazione (IT/EN) lato frontend
Integrazione Dark Mode



<Ignore>
Funzionalità opzionali (bonus)

Integrazione pagamento con Stripe in modalità test

•
•  Notifiche in tempo reale con WebSocket (Flask-SocketIO) quando un evento a cui sei

iscritto viene modificato


Consegna

•  Link al repository Git
•  Breve relazione (max 4 pagine) con: scelte architetturali, schema ER del database,

screenshot principali, problemi incontrati e soluzioni adottate
</Ignore>

# NewsApp – Deine persönlichen, KI-recherchierten News

Selbstgehostete News-App: Du definierst Interessen-Kategorien mit Hot Topics, deine KI
(Claude Desktop, lokales LLM, …) holt sie per **MCP** ab, recherchiert im Web, prüft Fakten
und speichert fertige Artikel (Bild, Headline, Teaser, Volltext, Quellen) zurück in die App.
Unter jedem Artikel kannst du einer angebundenen KI (OpenAI-kompatible API) Rückfragen stellen.

## Features

- Registrierung/Login (Registrierung per `ALLOW_REGISTRATION=false` abschaltbar)
- Kategorien + Hot Topics mit Beschreibungstexten als Recherche-Auftrag für die KI
- News-Startseite: Kategorie-Chips („Alle", „★ Gemerkt", Kategorien, zweite Zeile Hot Topics),
  Karten im responsiven Grid, nach Tagen gruppiert (Heute/Gestern/Datum)
- Artikelansicht: Titelbild mit Fade-out, Markdown-Volltext, YouTube-Embeds,
  Quellen-Karten, „Als Sub-Topic festlegen", Merken-Stern
- Artikel-Chat mit gespeicherter Q&A-Historie (OpenAI-kompatibel: Claude, OpenAI, Ollama, LM Studio)
- Automatisches Löschen nach einstellbarem Intervall (gemerkte Artikel ausgenommen,
  hartes Limit 12 Monate), Bilder werden lokal gecacht und mitgelöscht
- MCP-Server (Streamable HTTP) + REST-API mit Bearer-Tokens

## Installation auf dem Server

Voraussetzungen: Docker + Docker Compose, ein Reverse Proxy (Traefik, Nginx Proxy Manager,
Caddy, …), der deine Domain per HTTPS auf `127.0.0.1:3000` weiterleitet.

```bash
git clone <repo-url> newsapp && cd newsapp
cp .env.example .env        # POSTGRES_PASSWORD und ORIGIN anpassen!
docker compose up -d --build
```

Die Datenbank-Migrationen laufen beim Start automatisch. Danach: Domain öffnen, Account
registrieren, in den Einstellungen Kategorien anlegen – und optional
`ALLOW_REGISTRATION=false` in `.env` setzen und `docker compose up -d` erneut ausführen.

> **Wichtig:** `ORIGIN` muss exakt deine öffentliche URL sein (z. B. `https://news.example.com`),
> sonst lehnt SvelteKit Formular-Submits ab. Der Proxy muss `X-Forwarded-Proto` und
> `X-Forwarded-Host` setzen (bei Traefik/NPM/Caddy Standard).

### Deployment mit Coolify

Für Coolify liegt eine eigene Compose-Datei ohne Host-Port-Binding bei
(`docker-compose.coolify.yml`) – Coolifys Proxy übernimmt Domain und TLS:

1. **Projekt → + New → Resource** → Repository auswählen (per GitHub-App oder als
   Public Repository), Branch `main`.
2. **Build Pack:** „Docker Compose", **Docker Compose Location:** `/docker-compose.coolify.yml`.
3. Beim Service **app** als Domain `https://news.deine-domain.de:3000` eintragen –
   das `:3000` sagt Coolify, auf welchen Container-Port geroutet wird. DNS-A-Record
   der Domain muss auf den Server zeigen; das TLS-Zertifikat holt Coolify automatisch.
4. **Environment Variables** setzen: `POSTGRES_PASSWORD` (sicheres Passwort),
   `ORIGIN=https://news.deine-domain.de`, optional `ALLOW_REGISTRATION`.
5. **Deploy** klicken. Migrationen laufen beim Start automatisch; `pgdata`- und
   `images`-Volumes bleiben über Redeploys erhalten.
6. Nach der eigenen Registrierung `ALLOW_REGISTRATION=false` setzen und neu deployen.

## KI per MCP verbinden

In **Einstellungen → KI & MCP** einen Token erstellen. Der MCP-Endpoint ist
`https://deine-domain/mcp` (Streamable HTTP, Auth per `Authorization: Bearer <token>`).

**Claude Desktop** – zwei Möglichkeiten:

1. *Custom Connector*: Settings → Connectors → „Add custom connector" → URL `https://deine-domain/mcp`,
   Header `Authorization: Bearer <token>`.
2. *`claude_desktop_config.json`* (auch für Clients ohne Remote-Support):

```json
{
  "mcpServers": {
    "news": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote", "https://deine-domain/mcp",
        "--header", "Authorization: Bearer <DEIN_TOKEN>"
      ]
    }
  }
}
```

**MCP-Tools:** `get_interests` (Kategorien + Hot Topics mit Beschreibungen),
`list_recent_articles` (Duplikat-Vermeidung), `save_article` (Artikel speichern).

**Recherche starten** (MCP ist „pull" – die KI muss angestoßen werden, z. B. manuell oder als
wiederkehrende Aufgabe):

> Hole über das News-MCP meine Interessen (get_interests) und prüfe mit list_recent_articles,
> was bereits vorhanden ist. Recherchiere dann im Web die wichtigsten aktuellen Nachrichten zu
> jeder Kategorie und jedem Hot Topic, prüfe Fakten über mehrere Quellen hinweg und speichere
> jeden Artikel mit save_article (Headline, Teaser, ausführlicher Artikel in Markdown, Bild-URL
> aus einer Quelle, alle Quellen).

## REST-API (gleiche Tokens)

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/v1/interests` | Kategorien + Hot Topics |
| `GET` | `/api/v1/articles?days=3` | Headlines der letzten Tage |
| `POST` | `/api/v1/articles` | Artikel speichern (`category_id`, `topic_id?`, `headline`, `summary`, `content`, `image_url?`, `published_at?`, `sources[]`) |

## Artikel-Chat verbinden

**Einstellungen → KI & MCP → KI für Artikel-Rückfragen**: Base-URL, Modell, API-Key.

| Anbieter | Base-URL | Beispiel-Modell |
|---|---|---|
| Claude | `https://api.anthropic.com/v1` | `claude-sonnet-4-6` |
| OpenAI | `https://api.openai.com/v1` | `gpt-5.2` |
| Ollama | `http://<host>:11434/v1` | `qwen3` |
| LM Studio | `http://<host>:1234/v1` | geladenes Modell |

## Entwicklung

```bash
npm install
docker run -d --name newsapp-db -e POSTGRES_PASSWORD=newsapp -e POSTGRES_USER=newsapp \
  -e POSTGRES_DB=newsapp -p 5432:5432 postgres:16-alpine
npm run dev
```

Migrationen nach Schema-Änderungen: `npm run db:generate` (laufen beim App-Start automatisch).

## Tech-Stack

SvelteKit (Svelte 5) + TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL 16 ·
eigener schlanker MCP-Server (Streamable HTTP, stateless) · Docker Compose

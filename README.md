# BennAI Blog Studio 🤖

Jouw AI-agent voor SEO en content. Je koppelt in een paar minuten je eigen bedrijf via de **setup-wizard**: de agent leest je website uit (bedrijfsprofiel + tone of voice + recente blogs), je koppelt je CMS (**WordPress**, **Shopify** of een **eigen blog-API**), en vanaf dan **schrijft Claude** de artikelen, **maakt GPT-image** de featured image en **publiceert de agent automatisch** naar jouw site. Inclusief autopilot die op schema zelf onderwerpen bedenkt, schrijft en publiceert.

Alle instellingen en credentials vul je in de app in — ze worden per gebruiker opgeslagen in `data/*.json`. Je hoeft niets in code te zetten.

> 👉 **Nieuw hier? Volg de [QUICKSTART](QUICKSTART.md)** — stap voor stap, geen technische kennis nodig.

## Starten

**De makkelijkste manier** (geen terminal nodig):

- **Mac:** dubbelklik op `start-mac.command`
- **Windows:** dubbelklik op `start-windows.bat`

De eerste keer installeert de studio zichzelf (paar minuten); daarna opent de browser vanzelf op [http://localhost:3000](http://localhost:3000) met de **setup-wizard**.

**Via de terminal:**

```bash
npm install
npm run dev
```

> Node.js nog niet geïnstalleerd? Haal de LTS-versie op [nodejs.org](https://nodejs.org).

## De setup-wizard (4 stappen)

### 1. Jouw bedrijf
Vul je **website-URL** en je **OpenRouter API-sleutel** in en klik *Analyseer mijn bedrijf*. De agent crawlt je site en vult automatisch je profiel + tone of voice in, en vindt je recente blogs.

**Hoe kom ik aan een OpenRouter-sleutel?**
1. Maak gratis een account op [openrouter.ai](https://openrouter.ai).
2. Zet wat tegoed op je account onder **Credits** (je betaalt per gebruik — een blog kost ruwweg $0,05–$0,25).
3. Ga naar [Keys](https://openrouter.ai/settings/keys) en klik **Create Key**.
4. Kopieer de sleutel (begint met `sk-or-`) en plak hem in de wizard.

### 2. Bedrijfsprofiel
Alles is automatisch uit je site gehaald: bedrijfsnaam, waar de site over gaat, doelgroep, taal en **tone of voice**. Controleer het en pas aan waar nodig — zo schrijft de agent voortaan in jouw stem.

### 3. CMS-koppeling
Kies waar je website draait. Deze instructies staan ook ín de app (klik op *"Hoe koppel ik …?"*).

<details>
<summary><b>WordPress</b></summary>

Je maakt een **Application Password** aan — een apart wachtwoord speciaal voor deze app. Je gewone wachtwoord heb je niet nodig.

1. Log in op je WordPress-beheer (meestal `jouwsite.nl/wp-admin`).
2. Ga naar **Gebruikers → Profiel** (Users → Profile).
3. Scroll naar **Application Passwords** onderaan de pagina.
4. Typ een naam, bijv. *BennAI Blog Studio*, en klik **Nieuw applicatiewachtwoord toevoegen**.
5. Kopieer het wachtwoord dat verschijnt (iets als `abcd EFGH 1234 wxyz` — de spaties mogen erin blijven). Je ziet het maar één keer.
6. Vul in de app in: je **site-URL**, je WordPress-**gebruikersnaam** en dit **wachtwoord**.

> Zie je geen "Application Passwords"? Dan moet je site op https draaien (standaard sinds WordPress 5.6).
</details>

<details>
<summary><b>Shopify</b></summary>

Je maakt een eigen "custom app" aan en kopieert het toegangstoken.

1. Ga in je Shopify-beheer naar **Settings → Apps and sales channels**.
2. Klik **Develop apps → Create an app**. Geef hem een naam, bijv. *BennAI Blog Studio*.
3. Tabblad **Configuration** → bij **Admin API integration** klik je **Configure**.
4. Vink de scopes `write_content` en `read_content` aan en **Save**.
5. Tabblad **API credentials** → klik **Install app**.
6. Kopieer het **Admin API access token** (begint met `shpat_`). Je ziet het maar één keer.
7. Vul in de app je winkeldomein (`jouwwinkel.myshopify.com`) en dit token in.

> Je hebt al een blog nodig in Shopify (Online Store → Blog posts). Het blog-ID mag je leeg laten — dan gebruikt de app je eerste blog.
</details>

<details>
<summary><b>Ander systeem (eigen blog-API)</b></summary>

Voor een zelfgebouwd endpoint (bijv. een Supabase/Lovable edge function) met `x-api-key`-auth dat Markdown accepteert:

- **Publish-URL** — het endpoint (`POST` = post aanmaken, `GET` = lijst, `PATCH /<slug>` = bijwerken, `DELETE /<slug>` = verwijderen).
- **API-sleutel** — meegestuurd als header `x-api-key`.
- **Image-upload-URL** (optioneel) — endpoint dat een afbeelding opslaat en een publieke URL teruggeeft. Leeg laten? Dan gaat het beeld als data-URI mee.
</details>

Klik **Test verbinding** om te controleren of de koppeling werkt.

### 4. Klaar
Zet eventueel meteen de autopilot aan. Je kunt alles later aanpassen bij **Instellingen**.

## Gebruik

**Kansen** → *🔍 Analyseer mijn site*: crawlt je sitemap, haalt zoekwoorden op, clustert ze en laat zien waar je content mist. Elke kans heeft een prioriteitsscore en een knop *✨ Genereer blog*.

**Nieuwe post** → onderwerp intypen of AI-suggesties kiezen → Claude schrijft + de cover wordt gegenereerd → preview → *🚀 Publiceer*. Elk artikel krijgt automatisch **interne links** naar 2-4 relevante bestaande posts.

**Plannen** → open een draft → *Plan* → kies datum + tijd. De post wordt meteen als concept naar je CMS gepusht en gaat op het gekozen moment automatisch live. Vereist een draaiende scheduler (`npm run scheduler`).

**Autopilot** → toggle aan in Instellingen, kies interval en tijdstip, en of posts direct live gaan of eerst als draft klaarstaan. Start de scheduler in een tweede terminal:

```bash
npm run scheduler
```

Testen zonder te wachten: Instellingen → *▶ Test nu een run*.

## Hoe publiceren werkt

De app praat met je CMS via een **provider-laag** (`src/lib/cms/`):

| CMS | Koppeling | Bijzonderheden |
|---|---|---|
| **WordPress** | REST API + Application Password | Markdown → HTML; cover als featured image in de mediabibliotheek |
| **Shopify** | Admin API access token | Blog-artikelen; cover als image-attachment |
| **Ander systeem** | Eigen endpoint (URL + `x-api-key`) | Markdown wordt door je eigen site gerenderd |

De agent schrijft in Markdown; voor WordPress en Shopify wordt dat automatisch naar HTML omgezet (`src/lib/markdown.ts`).

## Kosten

Alleen OpenRouter-usage: ruwweg **$0,05–$0,25 per post** (tekst + afbeelding samen).

## Optioneel: DataForSEO

Voor echte zoekvolumes en keyword difficulty op de Kansen-pagina. Vul `DATAFORSEO_LOGIN` en `DATAFORSEO_PASSWORD` in `.env.local`. Zonder tegoed valt de analyse terug op je eigen site + Google autocomplete (zonder cijfers). Eén analyse kost ~$0,10–$0,20.

## Later online zetten (Vercel)

1. Push naar GitHub en importeer in [Vercel](https://vercel.com).
2. `vercel.json` staat klaar: Vercel Cron pingt de autopilot elk uur, dus je Mac hoeft niet aan te blijven.

> Let op: op Vercel is het bestandssysteem read-only. Voor een deploy moeten drafts en instellingen naar een echte database (bijv. Vercel KV of Postgres) — `src/lib/store.ts` is het enige bestand dat je daarvoor hoeft te vervangen.

## `.env.local` (optioneel)

Alle koppelingen vul je in via de wizard. `.env.local` is alleen nodig voor:

| Variabele | Waarvoor |
|---|---|
| `OPENROUTER_API_KEY` | Gedeelde terugval-sleutel als een gebruiker er in de wizard geen invult |
| `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` | Echte zoekvolumes op de Kansen-pagina |
| `CRON_SECRET` | Beveiligt de autopilot-cronroute |
| `APP_URL` | Basis-URL voor de lokale scheduler |

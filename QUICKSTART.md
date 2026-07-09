# 🚀 Snelstart — BennAI Blog Studio

Je eigen AI-contentstudio, draaiend voor jouw bedrijf in een paar minuten. Geen technische kennis nodig — volg gewoon de stapjes.

---

## Wat heb je nodig?

1. **Je website-URL** (bijv. `https://jouwbedrijf.nl`)
2. **Een OpenRouter-sleutel** — hiermee schrijft de AI (zie stap 3 hieronder)
3. **Toegang tot je CMS** — WordPress, Shopify, of een eigen blog-API

---

## Stap 1 — Node.js installeren (eenmalig)

De studio draait op **Node.js**. Heb je dat nog niet:

1. Ga naar **[nodejs.org](https://nodejs.org)**
2. Download de knop die **"LTS"** zegt
3. Open het gedownloade bestand en klik door de installatie (gewoon steeds "Volgende")

> Al Node.js? Sla deze stap over.

---

## Stap 2 — De studio starten

**Op een Mac:** dubbelklik op **`start-mac.command`**

**Op Windows:** dubbelklik op **`start-windows.bat`**

De eerste keer duurt het opstarten een paar minuten (hij installeert zichzelf). Daarna opent je browser vanzelf op **http://localhost:3000** en zie je de setup-wizard.

> Laat het zwarte venster dat opent gewoon open zolang je met de studio werkt. Klaar? Sluit het venster.

*Liever via de terminal? `npm install` en dan `npm run dev`.*

---

## Stap 3 — De setup-wizard invullen

De wizard leidt je door 4 stappen. Vul in:

### 1. Jouw bedrijf
- Je **website-URL**
- Je **OpenRouter-sleutel**:
  1. Maak gratis een account op **[openrouter.ai](https://openrouter.ai)**
  2. Zet wat tegoed op je account onder **Credits** (je betaalt per gebruik — een blog kost ~ $0,05–$0,25)
  3. Ga naar **[Keys](https://openrouter.ai/settings/keys)** → **Create Key**
  4. Kopieer de sleutel (begint met `sk-or-`) en plak hem in de wizard

Klik **Analyseer mijn bedrijf** — de AI leest je site uit.

### 2. Bedrijfsprofiel
Alles is automatisch ingevuld (naam, doelgroep, **tone of voice**). Controleer en pas aan waar nodig.

### 3. Koppel je CMS
Kies waar je website staat. In de app staat bij elke keuze een uitklapbare **"Hoe koppel ik …?"** met exacte stappen:

- **WordPress** → je maakt een *Application Password* aan (Gebruikers → Profiel)
- **Shopify** → je maakt een *custom app* aan met scope `write_content`
- **Ander systeem** → je eigen blog-API (URL + sleutel)

Klik **Test verbinding** om te checken of het werkt.

### 4. Klaar
Zet eventueel meteen de autopilot aan. Klaar!

---

## En dan?

- **Nieuwe post** → onderwerp intypen → de AI schrijft + maakt een afbeelding → **Publiceer**
- **Kansen** → laat de studio je site analyseren en SEO-onderwerpen voorstellen
- **Autopilot** → laat de studio zelf op schema publiceren. Zet 'm aan bij **Instellingen** en start de planner: dubbelklik-start werkt, of open een tweede terminal en typ `npm run scheduler`. *Let op: je computer moet dan wel aan blijven staan.*

Alles wat je invult, pas je later aan bij **Instellingen**.

---

## Vastgelopen?

- **"npm wordt niet herkend"** → Node.js is nog niet (goed) geïnstalleerd. Herhaal stap 1 en herstart je computer.
- **Analyse mislukt** → check of je website-URL klopt en of je OpenRouter-sleutel tegoed heeft.
- **CMS-verbinding mislukt** → lees de "Hoe koppel ik …?"-uitleg in de app nog eens; let vooral op het juiste wachtwoord/token.

Kom je er niet uit? Stel je vraag in de **BennAI Community**.

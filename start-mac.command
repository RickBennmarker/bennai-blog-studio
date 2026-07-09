#!/bin/bash
# Dubbelklik dit bestand om BennAI Blog Studio te starten (macOS).
cd "$(dirname "$0")" || exit 1

echo "────────────────────────────────────────"
echo "   BennAI Blog Studio — opstarten"
echo "────────────────────────────────────────"
echo

if ! command -v npm >/dev/null 2>&1; then
  echo "⚠️  Node.js is nog niet geïnstalleerd."
  echo "    Ga naar https://nodejs.org, download de LTS-versie,"
  echo "    installeer die en dubbelklik dit bestand daarna opnieuw."
  echo
  read -r -p "Druk op Enter om te sluiten."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "📦  Eenmalig installeren… dit kan een paar minuten duren."
  echo
  if ! npm install; then
    echo "❌  Installatie mislukt. Probeer het opnieuw of vraag hulp in de community."
    read -r -p "Druk op Enter om te sluiten."
    exit 1
  fi
  echo
fi

echo "🚀  Studio start op http://localhost:3000"
echo "    De browser opent zo vanzelf. Laat dit venster open zolang je werkt."
echo "    Sluiten? Klik dit venster en druk op Ctrl + C."
echo

# Open de browser zodra de server waarschijnlijk klaar is.
( sleep 4 && open http://localhost:3000 ) &

npm run dev

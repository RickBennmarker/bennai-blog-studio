import type { ReactNode } from "react";
import type { CmsProviderId } from "@/lib/types";
import { IconLightbulb, IconExternal } from "./icons";

/** Uitklapbare uitleg met genummerde stappen. Werkt zonder JS (native details). */
function HelpBox({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="mt-3 rounded-xl border border-border bg-surface-2/50 text-sm"
    >
      <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-3 font-medium text-text/90">
        <IconLightbulb className="h-4 w-4 shrink-0 text-warning" />
        {title}
      </summary>
      <div className="space-y-2 border-t border-border px-4 py-3 text-muted">
        {children}
      </div>
    </details>
  );
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline underline-offset-2"
    >
      {children} <IconExternal className="inline h-3 w-3" />
    </a>
  );
}

/** Uitleg: hoe kom ik aan een OpenRouter-sleutel? */
export function OpenRouterHelp() {
  return (
    <HelpBox title="Hoe kom ik aan een OpenRouter-sleutel?">
      <ol className="list-decimal space-y-1.5 pl-4">
        <li>
          Maak gratis een account op <Ext href="https://openrouter.ai">openrouter.ai</Ext>.
        </li>
        <li>
          Zet wat tegoed op je account onder <strong>Credits</strong> (je betaalt per
          gebruik — een blog kost ruwweg $0,05–$0,25).
        </li>
        <li>
          Ga naar <Ext href="https://openrouter.ai/settings/keys">Keys</Ext> en klik{" "}
          <strong>Create Key</strong>.
        </li>
        <li>Kopieer de sleutel (begint met <code>sk-or-</code>) en plak hem hierboven.</li>
      </ol>
    </HelpBox>
  );
}

/** Provider-specifieke uitleg voor het koppelen van het CMS. */
export function CmsHelp({
  provider,
  defaultOpen = false,
}: {
  provider: CmsProviderId;
  defaultOpen?: boolean;
}) {
  if (provider === "wordpress") {
    return (
      <HelpBox title="Hoe koppel ik WordPress? (stap voor stap)" defaultOpen={defaultOpen}>
        <p>
          Je maakt in WordPress een <strong>Application Password</strong> aan — een apart
          wachtwoord speciaal voor deze app. Je gewone wachtwoord heb je niet nodig.
        </p>
        <ol className="list-decimal space-y-1.5 pl-4">
          <li>Log in op je WordPress-beheer (meestal <code>jouwsite.nl/wp-admin</code>).</li>
          <li>
            Ga linksonder naar <strong>Gebruikers → Profiel</strong> (Users → Profile).
          </li>
          <li>
            Scroll naar het kopje <strong>Application Passwords</strong> onderaan de pagina.
          </li>
          <li>
            Typ een naam, bijv. <em>BennAI Blog Studio</em>, en klik{" "}
            <strong>Nieuw applicatiewachtwoord toevoegen</strong>.
          </li>
          <li>
            Kopieer het wachtwoord dat verschijnt (iets als{" "}
            <code>abcd EFGH 1234 wxyz</code> — de spaties mogen erin blijven). Je ziet het
            maar één keer.
          </li>
          <li>
            Vul hierboven in: je <strong>site-URL</strong>, je WordPress-{" "}
            <strong>gebruikersnaam</strong> en dit <strong>wachtwoord</strong>.
          </li>
        </ol>
        <p className="text-xs text-faint">
          Zie je geen &quot;Application Passwords&quot;? Dan moet je site op https draaien (dat
          hoort standaard aan te staan sinds WordPress 5.6). Bij twijfel: vraag je
          websitebeheerder of hostingpartij.
        </p>
      </HelpBox>
    );
  }

  if (provider === "shopify") {
    return (
      <HelpBox title="Hoe koppel ik Shopify? (stap voor stap)" defaultOpen={defaultOpen}>
        <p>
          Je maakt in Shopify een eigen &quot;custom app&quot; aan en kopieert het
          toegangstoken daarvan.
        </p>
        <ol className="list-decimal space-y-1.5 pl-4">
          <li>
            Ga in je Shopify-beheer naar <strong>Settings → Apps and sales channels</strong>.
          </li>
          <li>
            Klik rechtsboven op <strong>Develop apps</strong> →{" "}
            <strong>Create an app</strong>. Geef hem een naam, bijv.{" "}
            <em>BennAI Blog Studio</em>.
          </li>
          <li>
            Open het tabblad <strong>Configuration</strong> → bij{" "}
            <strong>Admin API integration</strong> klik je <strong>Configure</strong>.
          </li>
          <li>
            Vink de scopes <code>write_content</code> en <code>read_content</code> aan en{" "}
            <strong>Save</strong>.
          </li>
          <li>
            Ga naar tabblad <strong>API credentials</strong> → klik{" "}
            <strong>Install app</strong>.
          </li>
          <li>
            Kopieer het <strong>Admin API access token</strong> (begint met{" "}
            <code>shpat_</code>). <strong>Let op:</strong> je ziet het maar één keer.
          </li>
          <li>
            Vul hierboven je winkeldomein (<code>jouwwinkel.myshopify.com</code>) en dit token
            in.
          </li>
        </ol>
        <p className="text-xs text-faint">
          Je hebt al een blog nodig in Shopify (Online Store → Blog posts). Het blog-ID mag je
          leeg laten — dan gebruikt de app automatisch je eerste blog.
        </p>
      </HelpBox>
    );
  }

  if (provider === "custom") {
    return (
      <HelpBox title="Wat is 'Ander systeem'?" defaultOpen={defaultOpen}>
        <p>
          Voor een eigen blog-API: een endpoint dat je zelf (of je ontwikkelaar) hebt gebouwd,
          bijv. een Supabase/Lovable edge function. Gebruik dit alleen als je zo&apos;n
          endpoint hebt.
        </p>
        <ol className="list-decimal space-y-1.5 pl-4">
          <li>
            <strong>Publish-URL</strong>: de volledige URL van je endpoint (die op{" "}
            <code>POST</code> een post aanmaakt en op <code>GET</code> de lijst teruggeeft).
          </li>
          <li>
            <strong>API-sleutel</strong>: wordt meegestuurd als header{" "}
            <code>x-api-key</code>.
          </li>
          <li>
            <strong>Image-upload-URL</strong> (optioneel): een endpoint dat een afbeelding
            opslaat en een publieke URL teruggeeft. Leeg laten? Dan sturen we het beeld als
            data-URI mee.
          </li>
        </ol>
        <p className="text-xs text-faint">
          Gebruik je WordPress of Shopify? Kies dan die optie — dat is veel makkelijker en werkt
          zonder eigen code.
        </p>
      </HelpBox>
    );
  }

  return null;
}

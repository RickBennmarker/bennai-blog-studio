/**
 * Compacte Markdown → HTML converter, zonder externe dependency.
 *
 * De blogs die onze eigen writer produceert gebruiken standaard Markdown:
 * koppen, alinea's, vet/cursief, links, lijsten, blockquotes en code. WordPress
 * en Shopify verwachten HTML (`content`/`body_html`), dus zetten we het hier om.
 * De custom blog-API rendert Markdown zelf, dus die gebruikt dit niet.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Inline-opmaak binnen een tekstregel: links, vet, cursief, inline-code. */
function inline(text: string): string {
  let out = escapeHtml(text);
  // Inline code eerst (beschermt de inhoud tegen verdere opmaak is lastig na
  // escapen; voor onze content volstaat deze simpele volgorde ruimschoots).
  out = out.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  // Links [tekst](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (_, label, href) => `<a href="${href}">${label}</a>`
  );
  // Vet (**...**) vóór cursief (*...*)
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return out;
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");

    // Codeblok ```
    if (/^```/.test(line.trim())) {
      if (inCodeBlock) {
        html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushParagraph();
        closeList();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(raw);
      continue;
    }

    // Lege regel = einde alinea/lijst
    if (line.trim() === "") {
      flushParagraph();
      closeList();
      continue;
    }

    // Kop
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    // Horizontale lijn
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushParagraph();
      closeList();
      html.push("<hr />");
      continue;
    }

    // Blockquote
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeList();
      html.push(`<blockquote><p>${inline(quote[1])}</p></blockquote>`);
      continue;
    }

    // Lijstitems
    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    const unordered = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ordered || unordered) {
      flushParagraph();
      const type = ordered ? "ol" : "ul";
      if (listType !== type) {
        closeList();
        html.push(`<${type}>`);
        listType = type;
      }
      html.push(`<li>${inline((ordered ?? unordered)![1])}</li>`);
      continue;
    }

    // Gewone tekstregel → onderdeel van een alinea
    closeList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();
  if (inCodeBlock) {
    html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }

  return html.join("\n");
}

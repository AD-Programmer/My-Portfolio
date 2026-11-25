/* ============================================================
   build/content.js — writing + outside proof, for build.js.
   node:fs only, like the rest of the build.

   WRITING   writing/*.md  →  dist/writing/<slug>.html
             + the /writing index, the home "Latest writing" strip,
               dist/feed.xml (RSS) and sitemap entries.
   PROOF     config.js → photo, testimonials, appRatings.
             Each renders only when it has real values. An empty
             slot hides its whole block, it never shows a filler.

   Nothing here invents content. A testimonial without a source
   link, or a rating without an "as of" date, fails the build.
   ============================================================ */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const humanDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const rfc822 = (iso) => new Date(iso + "T00:00:00Z").toUTCString();

/* ---------- markdown, the small subset posts need ----------
   ## / ### headings, paragraphs, - and 1. lists, > quotes,
   ``` fenced code, `code`, **bold**, *italic*, [text](url).
   Raw HTML is escaped, never passed through.                  */
function inline(text) {
  const codes = [];
  let s = esc(text).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
      const ext = /^https?:\/\//.test(url);
      return ext
        ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : `<a href="${url}">${label}</a>`;
    });
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}

function markdown(src) {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0;
  const isBlockStart = (l) => /^(#{2,4}\s|```|>\s?|[-*]\s|\d+\.\s)/.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const body = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      i++; // closing fence
      const cls = lang ? ` class="lang-${esc(lang)}"` : "";
      out.push(`<pre><code${cls}>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }

    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const id = h[2].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      out.push(`<h${level} id="${id}">${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${markdown(body.join("\n"))}</blockquote>`);
      continue;
    }

    const list = line.match(/^([-*]|\d+\.)\s/);
    if (list) {
      const ordered = /\d/.test(list[1]);
      const re = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        let item = lines[i++].replace(re, "");
        // indented continuation lines belong to the same item
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) item += " " + lines[i++].trim();
        items.push(`<li>${inline(item)}</li>`);
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) para.push(lines[i++].trim());
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return out.join("\n");
}

/* ---------- posts ---------- */
function parseFrontMatter(raw, file) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing --- front matter ---`);
  const meta = {};
  m[1].split("\n").forEach((l) => {
    const kv = l.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].replace(/^"(.*)"$/, "$1").trim();
  });
  return { meta, body: m[2] };
}

function loadPosts(dir, { drafts = false } = {}) {
  if (!fs.existsSync(dir)) return { posts: [], errors: [], skipped: [] };
  const errors = [];
  const skipped = [];
  const posts = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8").replace(/\r\n?/g, "\n");
    let parsed;
    try { parsed = parseFrontMatter(raw, file); } catch (e) { errors.push(e.message); continue; }
    const { meta, body } = parsed;
    const slug = file.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
    for (const k of ["title", "date", "description"]) {
      if (!meta[k]) errors.push(`writing/${file}: front matter needs "${k}"`);
    }
    if (meta.date && !ISO_DAY.test(meta.date)) errors.push(`writing/${file}: date must be YYYY-MM-DD`);
    if (meta.updated && !ISO_DAY.test(meta.updated)) errors.push(`writing/${file}: updated must be YYYY-MM-DD`);
    if (meta.draft === "true" && !drafts) { skipped.push(`writing/${file}`); continue; }
    const words = body.split(/\s+/).filter(Boolean).length;
    posts.push({
      file, slug,
      title: meta.title || slug,
      date: meta.date || "1970-01-01",
      updated: meta.updated || "",
      description: meta.description || "",
      tags: (meta.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
      draft: meta.draft === "true",
      minutes: Math.max(1, Math.round(words / 220)),
      html: markdown(body),
    });
  }
  const seen = new Set();
  posts.forEach((p) => { if (seen.has(p.slug)) errors.push(`writing: two posts share the slug "${p.slug}"`); seen.add(p.slug); });
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { posts, errors, skipped };
}

function postListHtml(posts, { limit } = {}) {
  return posts
    .slice(0, limit || posts.length)
    .map(
      (p) =>
        `<li class="post-item">` +
        `<a class="post-item__link" href="/writing/${p.slug}">` +
        `<time class="post-item__date" datetime="${p.date}">${humanDate(p.date)}</time>` +
        `<span class="post-item__title">${esc(p.title)}</span>` +
        `<span class="post-item__desc">${esc(p.description)}</span>` +
        `<span class="post-item__meta">${p.minutes} min read${p.tags.length ? " · " + p.tags.map(esc).join(" · ") : ""}</span>` +
        `</a></li>`
    )
    .join("");
}

function postTokens(p) {
  return {
    post_slug: p.slug,
    post_title: esc(p.title),
    post_desc: esc(p.description),
    post_date: p.date,
    post_date_human: humanDate(p.date),
    post_updated: p.updated
      ? ` · updated <time datetime="${p.updated}">${humanDate(p.updated)}</time>`
      : "",
    post_modified: p.updated || p.date,
    post_minutes: String(p.minutes),
    post_tags: p.tags.map((t) => `<span class="stack-tag">${esc(t)}</span>`).join(""),
    post_body: p.html,
    post_draft: p.draft ? `<p class="note"><strong>Draft.</strong> Built with --drafts; this post is not published.</p>` : "",
  };
}

function feedXml(posts, cfg) {
  const site = cfg.siteUrl.replace(/\/$/, "");
  const items = posts
    .map(
      (p) =>
        `  <item>\n` +
        `    <title>${esc(p.title)}</title>\n` +
        `    <link>${site}/writing/${p.slug}</link>\n` +
        `    <guid isPermaLink="true">${site}/writing/${p.slug}</guid>\n` +
        `    <pubDate>${rfc822(p.date)}</pubDate>\n` +
        `    <description>${esc(p.description)}</description>\n` +
        `  </item>`
    )
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n` +
    `  <title>${esc(cfg.name)} — Writing</title>\n` +
    `  <link>${site}/writing</link>\n` +
    `  <atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml"/>\n` +
    `  <description>Notes on offline-first mobile architecture and .NET MAUI, from ${esc(cfg.name)}.</description>\n` +
    `  <language>en</language>\n` +
    (posts[0] ? `  <lastBuildDate>${rfc822(posts[0].updated || posts[0].date)}</lastBuildDate>\n` : "") +
    `${items}\n</channel>\n</rss>\n`
  );
}

/* ---------- outside proof ---------- */
const isHttps = (u) => typeof u === "string" && /^https:\/\/[^\s]+$/.test(u);
const isPlaceholder = (v) => typeof v === "string" && v.charAt(0) === "[" && v.charAt(v.length - 1) === "]";

function checkProof(cfg, srcDir) {
  const errors = [];
  (cfg.testimonials || []).forEach((t, i) => {
    const at = `testimonials[${i}]`;
    ["quote", "name", "title", "relation", "source"].forEach((k) => {
      if (!t[k] || isPlaceholder(t[k])) errors.push(`${at}.${k} is missing`);
    });
    if (t.source && !isHttps(t.source)) errors.push(`${at}.source must be an https link to the original (e.g. the LinkedIn recommendation)`);
  });
  (cfg.appRatings || []).forEach((r, i) => {
    const at = `appRatings[${i}]`;
    if (!cfg[r.app] || !cfg[r.app + "_name"]) errors.push(`${at}.app "${r.app}" has no store link + name in config`);
    const n = Number(r.rating);
    if (!(n >= 1 && n <= 5)) errors.push(`${at}.rating must be the App Store number, 1 to 5`);
    if (!/^\d+$/.test(String(r.count || ""))) errors.push(`${at}.count must be the number of ratings`);
    if (!ISO_DAY.test(r.asOf || "")) errors.push(`${at}.asOf must be the YYYY-MM-DD you read it`);
  });
  if (cfg.photo) {
    if (!fs.existsSync(path.join(srcDir, cfg.photo))) errors.push(`photo: ${cfg.photo} does not exist`);
    if (!cfg.photoAlt) errors.push(`photoAlt: describe the photo`);
  }
  return errors;
}

function staleRatings(cfg, today) {
  return (cfg.appRatings || [])
    .filter((r) => ISO_DAY.test(r.asOf || ""))
    .filter((r) => (new Date(today) - new Date(r.asOf)) / 864e5 > 180)
    .map((r) => `appRatings ${r.app}: read on ${r.asOf}, over 6 months ago — re-check with node scripts/app-ratings.js`);
}

function testimonialsHtml(cfg) {
  return (cfg.testimonials || [])
    .map(
      (t) =>
        `<figure class="quote">` +
        `<blockquote><p>${esc(t.quote)}</p></blockquote>` +
        `<figcaption>` +
        `<span class="quote__name">${esc(t.name)}</span>` +
        `<span class="quote__title">${esc(t.title)}</span>` +
        `<span class="quote__rel">${esc(t.relation)}</span>` +
        `<a class="quote__src" href="${esc(t.source)}" target="_blank" rel="noopener noreferrer">${esc(t.sourceLabel || "Read the original")} ↗</a>` +
        `</figcaption></figure>`
    )
    .join("");
}

function ratingsHtml(cfg) {
  return (cfg.appRatings || [])
    .map((r) => {
      const n = Number(r.rating).toFixed(1);
      const count = Number(r.count).toLocaleString("en-US");
      return (
        `<a class="rating" href="${esc(cfg[r.app])}" target="_blank" rel="noopener noreferrer">` +
        `<span class="rating__app">${esc(cfg[r.app + "_name"])}</span>` +
        `<span class="rating__score"><span aria-hidden="true">★</span> ${n}<span class="sr-only"> out of 5</span></span>` +
        `<span class="rating__count">${count} ratings · App Store ${esc(r.store || "US")} · as of ${humanDate(r.asOf)}</span>` +
        `</a>`
      );
    })
    .join("");
}

function photoHtml(cfg, cls) {
  if (!cfg.photo) return "";
  return `<img class="${cls}" src="/${esc(cfg.photo)}" width="480" height="480" decoding="async" alt="${esc(cfg.photoAlt)}">`;
}

/* ---------- slots ----------
   <!-- if:name --> … <!-- /if:name -->  is kept when slots[name] has
   content and removed whole when it doesn't. {{slot_name}} inside it
   resolves to the content. <!-- ifnot:name --> is the reverse.       */
function applySlots(html, slots) {
  return html
    .replace(/<!-- if:([a-zA-Z_]+) -->([\s\S]*?)<!-- \/if:\1 -->/g, (_, k, inner) => (slots[k] ? inner : ""))
    .replace(/<!-- ifnot:([a-zA-Z_]+) -->([\s\S]*?)<!-- \/ifnot:\1 -->/g, (_, k, inner) => (slots[k] ? "" : inner))
    .replace(/\{\{slot_([a-zA-Z_]+)\}\}/g, (whole, k) => (k in slots ? slots[k] : whole));
}

module.exports = {
  markdown, loadPosts, postListHtml, postTokens, feedXml, humanDate,
  checkProof, staleRatings, testimonialsHtml, ratingsHtml, photoHtml, applySlots,
};

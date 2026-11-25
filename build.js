/* ============================================================
   build.js — resolves {{tokens}} into static HTML.
   No framework, no dependencies, node:fs only.

     node build.js      # writes dist/ , exits 1 if any
                        # [BRACKET] placeholder is still unset
     node build.js --drafts   # also builds posts marked draft: true

   Deploy dist/, never the project root. config.js is the source
   of truth at build time and is NOT copied to the output, so it
   is never publicly readable.
   ============================================================ */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const content = require("./build/content.js");

const SRC = __dirname;
const OUT = path.join(SRC, "dist");
const DRAFTS = process.argv.includes("--drafts");   // local preview of draft posts

/* ---------- 1. load config without a parser ---------- */
// config.js assigns window.SITE — hand it a fake window and read it back.
const w = {};
new Function("window", fs.readFileSync(path.join(SRC, "assets/js/config.js"), "utf8"))(w);
const CFG = w.SITE;

const TOKEN = /\{\{([a-zA-Z0-9_]+)\}\}/g;
const has = (k) => Object.prototype.hasOwnProperty.call(CFG, k);
const isPlaceholder = (v) =>
  typeof v === "string" && v.charAt(0) === "[" && v.charAt(v.length - 1) === "]";

const resolve = (str) => str.replace(TOKEN, (whole, key) => (has(key) ? CFG[key] : whole));

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );

/* ---------- 2. personal projects strip ---------- */
// Mirrors renderProjects() from the old site.js, as a string.
function projectsHtml() {
  const list = CFG.projects || [];
  return list
    .map((p) => {
      const chip = (v) => (isPlaceholder(v) ? `<span class="ph">${esc(v)}</span>` : esc(v));
      const stack = (p.stack || [])
        .map((s) => `<span class="stack-tag">${esc(s)}</span>`)
        .join("");
      const links = [["repo", "Source ↗"], ["live", "Live ↗"]]
        .map(([k, label]) => {
          const url = p[k];
          if (!url) return "";
          if (isPlaceholder(url)) return `<span class="ph">${esc(url)}</span>`;
          return `<a class="proj__link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
        })
        .join("");
      return (
        `<div class="proj">` +
        `<div class="proj__head"><h3>${chip(p.name)}</h3>` +
        `<span class="proj__type">${esc(p.type || "project")}</span></div>` +
        `<p>${chip(p.blurb || "")}</p>` +
        (stack ? `<div class="proj__stack">${stack}</div>` : "") +
        (links ? `<div class="proj__links">${links}</div>` : "") +
        `</div>`
      );
    })
    .join("");
}

/* ---------- 3. build ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const pages = fs.readdirSync(SRC).filter((f) => f.endsWith(".html"));
const projects = projectsHtml();

// writing + outside proof (build/content.js). Each slot is "" when empty,
// and an empty slot removes its whole <!-- if:name --> block.
const { posts, errors: postErrors, skipped: draftPosts } = content.loadPosts(path.join(SRC, "writing"), { drafts: DRAFTS });
const proofErrors = content.checkProof(CFG, SRC);
const slots = {
  posts: content.postListHtml(posts),
  latest_posts: content.postListHtml(posts, { limit: 3 }),
  testimonials: content.testimonialsHtml(CFG),
  ratings: content.ratingsHtml(CFG),
  photo: content.photoHtml(CFG, "person__photo"),
  author_photo: content.photoHtml(CFG, "author__photo"),
};
slots.proof = slots.testimonials || slots.ratings;

for (const page of pages) {
  let html = fs.readFileSync(path.join(SRC, page), "utf8");

  // projects strip: inject, or drop the whole section when the array is empty
  if (html.includes("data-projects")) {
    html = projects
      ? html.replace(/(<div class="[^"]*" data-projects>)(<\/div>)/, `$1${projects}$2`)
      : html.replace(/<section\b[^>]*>(?:(?!<\/section>)[\s\S])*data-projects[\s\S]*?<\/section>/, "");
  }

  fs.writeFileSync(path.join(OUT, page), resolve(content.applySlots(html, slots)));
}

// one page per post, from templates/post.html
const postTpl = fs.readFileSync(path.join(SRC, "templates/post.html"), "utf8");
fs.mkdirSync(path.join(OUT, "writing"), { recursive: true });
for (const p of posts) {
  const t = content.postTokens(p);
  const html = content.applySlots(postTpl, slots).replace(TOKEN, (whole, key) => (key in t ? t[key] : whole));
  fs.writeFileSync(path.join(OUT, "writing", p.slug + ".html"), resolve(html));
}
fs.writeFileSync(path.join(OUT, "feed.xml"), content.feedXml(posts, CFG));

/* ---------- 4. copy what belongs (never config.js / README / .DS_Store) ---------- */
const ASSETS = [
  "assets/css/main.css",
  "assets/js/site.js",
  "assets/js/theme.js",
  "assets/og.png",
  "assets/favicon.svg",
  "assets/resume.pdf",
  "robots.txt",
  "_headers",
  "vercel.json",
];
if (CFG.photo) ASSETS.push(CFG.photo);
for (const rel of ASSETS) {
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(SRC, rel), dest);
}
// Screenshots are a whole directory, so they can't go in the ASSETS list above.
// filter: never let .DS_Store (or any dotfile) ride along into the deploy.
fs.cpSync(path.join(SRC, "assets/shots"), path.join(OUT, "assets/shots"), {
  recursive: true,
  filter: (src) => !path.basename(src).startsWith("."),
});

/* ---------- 5. sitemap with lastmod from source mtime ---------- */
const sitemap = fs
  .readFileSync(path.join(SRC, "sitemap.xml"), "utf8")
  .replace(/<loc>([^<]+)<\/loc>/g, (whole, loc) => {
    const slug = loc.replace(/^https?:\/\/[^/]+\//, "") || "";
    const sourceFile = slug ? slug + ".html" : "index.html";
    const file = path.join(SRC, sourceFile);
    if (!fs.existsSync(file)) return whole;
    const day = fs.statSync(file).mtime.toISOString().slice(0, 10);
    return `${whole}<lastmod>${day}</lastmod>`;
  })
  .replace(
    "</urlset>",
    posts
      .map((p) => `  <url><loc>${CFG.siteUrl}/writing/${p.slug}</loc><lastmod>${p.updated || p.date}</lastmod><priority>0.7</priority></url>\n`)
      .join("") + "</urlset>"
  );
fs.writeFileSync(path.join(OUT, "sitemap.xml"), sitemap);

/* ---------- 6. gate: nothing unverified ships ---------- */
const pending = Object.keys(CFG).filter((k) => isPlaceholder(CFG[k]));
(CFG.projects || []).forEach((p, i) =>
  ["name", "blurb", "repo", "live"].forEach((k) => {
    if (isPlaceholder(p[k])) pending.push(`projects[${i}].${k}`);
  })
);

const unresolved = new Set();
const builtPages = [
  ...fs.readdirSync(OUT).filter((f) => f.endsWith(".html")),
  ...fs.readdirSync(path.join(OUT, "writing")).map((f) => "writing/" + f),
];
for (const page of builtPages) {
  const m = fs.readFileSync(path.join(OUT, page), "utf8").match(TOKEN);
  if (m) m.forEach((t) => unresolved.add(`${t} (${page})`));
}

console.log(`built ${pages.length} pages + ${posts.length} post(s) -> dist/`);
if (draftPosts.length) console.log(`skipped ${draftPosts.length} draft(s): ${draftPosts.join(", ")}  (preview with: node build.js --drafts)`);

// not errors: what the site is still missing that only a real person can supply
const missing = [];
if (!CFG.photo) missing.push("photo (config.js → photo)");
if (!(CFG.testimonials || []).length) missing.push("testimonials (config.js → testimonials)");
if (!(CFG.appRatings || []).length) missing.push("App Store ratings (node scripts/app-ratings.js)");
if (!posts.length) missing.push("a published post (writing/*.md)");
if (missing.length) console.log(`proof still to add, hidden until it exists: ${missing.join("; ")}`);
content.staleRatings(CFG, new Date().toISOString().slice(0, 10)).forEach((w) => console.warn("WARN: " + w));

const contentErrors = [...postErrors, ...proofErrors];
if (contentErrors.length) {
  console.error(`\nERROR: ${contentErrors.length} writing / proof problem(s):`);
  contentErrors.forEach((e) => console.error("  " + e));
}
if (unresolved.size) {
  console.error(`\nERROR: ${unresolved.size} token(s) have no value in config.js:`);
  unresolved.forEach((t) => console.error("  " + t));
}
if (pending.length) {
  console.error(`\nERROR: ${pending.length} placeholder value(s) still unset in assets/js/config.js:`);
  pending.forEach((k) => console.error("  " + k));
}
if (unresolved.size || pending.length || contentErrors.length) {
  console.error("\ndist/ was written for local preview, but this build must not deploy.");
  process.exit(1);
}
console.log("no placeholders, no unresolved tokens — safe to deploy dist/");

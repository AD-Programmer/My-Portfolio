/* ============================================================
   scripts/app-ratings.js — read the App Store's own rating for
   every app linked in config.js, and print appRatings lines to
   paste into config.js. Nothing is written for you: you check
   the numbers, then you decide whether to show them.

     node scripts/app-ratings.js            # US store
     node scripts/app-ratings.js gb         # another storefront

   Uses Apple's public iTunes Lookup API. Node 18+ (global fetch).
   Not part of the build, so deploys never depend on the network.
   ============================================================ */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const w = {};
new Function("window", fs.readFileSync(path.join(__dirname, "../assets/js/config.js"), "utf8"))(w);
const CFG = w.SITE;
const country = (process.argv[2] || "us").toLowerCase();

const apps = Object.keys(CFG)
  .filter((k) => /_live\d*$/.test(k) && typeof CFG[k] === "string")
  .map((k) => ({ key: k, name: CFG[k + "_name"], id: (CFG[k].match(/\/id(\d+)/) || [])[1] }))
  .filter((a) => a.id);

(async () => {
  const url = `https://itunes.apple.com/lookup?country=${country}&id=${apps.map((a) => a.id).join(",")}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`App Store lookup failed: HTTP ${res.status}`);
  const { results } = await res.json();
  const today = new Date().toISOString().slice(0, 10);

  console.log(`App Store (${country.toUpperCase()}), read ${today}\n`);
  const lines = [];
  for (const a of apps) {
    const r = results.find((x) => String(x.trackId) === a.id);
    if (!r) { console.log(`  ${a.name}: not found in the ${country.toUpperCase()} store`); continue; }
    const rating = r.averageUserRating;
    const count = r.userRatingCount || 0;
    console.log(`  ${a.name}: ${rating ? rating.toFixed(2) : "no rating"} from ${count} ratings`);
    if (rating && count) {
      lines.push(`    { app: "${a.key}", rating: "${rating.toFixed(1)}", count: "${count}", asOf: "${today}", store: "${country.toUpperCase()}" },`);
    }
  }
  if (lines.length) {
    console.log(`\nPaste the ones you want to show into appRatings in assets/js/config.js:\n`);
    console.log(lines.join("\n"));
  }
  console.log(`\nA small count says little. Showing nothing is better than showing 3.2 from 9 ratings.`);
})().catch((e) => { console.error(e.message); process.exit(1); });

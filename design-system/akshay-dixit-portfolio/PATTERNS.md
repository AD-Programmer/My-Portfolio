# What makes the top-rated portfolios read as a person's site

The benchmark scored this site 6/10. The sites that scored 8 or 9 were James Montemagno,
Antoine van der Lee, Marc Lou, Brittany Chiang, Lee Robinson, Donny Wals, Tony Dinh and
Jake Wharton. They look nothing alike, but they share a short list of layout and type
habits. The old design broke most of them. This file lists them and says how the
redesign applies each one. We copy the patterns, not any one site.

These notes come from what those sites are known for. Nobody re-crawled them for this
pass, so check against the live sites before relying on a detail.

| # | Pattern on the 8–9 sites | What this site did before | What it does now |
|---|---|---|---|
| 1 | **The person comes first.** Name as the first heading, a real photo next to it (Montemagno, van der Lee, Wals, Marc Lou, Tony Dinh). | Tagline as H1. No photo. Mono "Akshay Dixit / mobile architecture" brand. | H1 is the name, with a portrait and role line beside it. A small avatar and the name in the nav. Set `photo` in `config.js`. Until then it shows initials. |
| 2 | **Plain type, one accent.** System or a single sans, solid colours, no gradient text, no glow (Wharton, Robinson, Chiang). | Gradient headline, radial glows, a grid backdrop, amber plus cyan plus blue. | Gradient text, glows and grid are gone. Amber is the only accent, used for small marks: the availability rule, bullets, the current nav item. |
| 3 | **Sentence-case labels, no "eyebrow" chrome.** Dates and metadata are quiet muted text (Chiang's experience list). | Uppercase, letter-spaced mono eyebrows with a rule, and mono labels everywhere. | Labels are sentence-case sans. Mono is kept only for code and the architecture diagrams, where it means something. |
| 4 | **No status pill.** Availability is a sentence, not a badge with a pulsing dot. | Pill badge with a pulsing dot, plus a pulsing dot in the nav. | One plain line with an amber left rule. Nothing animates. |
| 5 | **Show the work, large, near the top.** Product screenshots or logos are the proof (Marc Lou, Tony Dinh, van der Lee's apps). | First screenshot about 1,900px down on desktop and about 4.5 screens down on mobile, at 188px wide in a dark frame. | Desktop: a full-height phone beside the intro, then a full-width 4-up row. Mobile: a swipeable strip directly under the headline, in the first screen. Every case study opens with a 3-up gallery. |
| 6 | **A list of work, not a bento of cards.** Each item gets an image, a title, a date line, two sentences and a link (Chiang). | Gradient cards with pill tags, and no images. | Work rows: two real screenshots on a neutral panel, then the date, title, role, description, tags as plain text, and the case-study and App Store links. |
| 7 | **A narrow reading column.** About 65–70 characters, with images allowed wider than the text (Robinson, Wharton, Wals). | 1240px container, and text up to 78ch. | 1120px container, prose capped at 68ch, galleries at full container width. |
| 8 | **Links look like links, with one primary button.** | Every action was a mono-font button, three or four per row. | Inline underlined links. One dark primary button per section, a secondary outline button, and the rest are text links. |
| 9 | **Flat surfaces.** 1px borders, no gradients on cards, small radii. | Gradient tiles with hover glows and lift. | Flat `--bg-1` tiles with a 1px border. Hover only changes the border colour. |
| 10 | **Mobile is the same page, narrower.** No hidden content, and nothing pushed to the bottom. | Mobile stacked desktop content, so the work sat at the bottom. | Mobile puts the work in the first screen and uses swipeable galleries instead of 4,000px of stacked phones. |

## Rules for future changes

- New sections use `.section-head` (sentence-case `.eyebrow`, H2, one paragraph) and
  either `.work-list` or plain prose. Don't add new tile grids to the home page.
- Screenshots go in `.gallery` (or `.work-item__media`), never in `.blueprint`. Keep
  `.blueprint` for architecture diagrams.
- No gradient text, animated dots or uppercase letter-spaced labels.
- Keep one primary button per section.

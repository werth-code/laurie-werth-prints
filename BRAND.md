# Laurie Werth Fine Art — Brand Guide

> *"Light and texture emerge naturally from controlled chaos."*

A brand system for an established fine artist. The work is the hero; everything
else is a quiet, confident frame around it.

---

## 1. Brand Strategy

**Concept — "Controlled Chaos."**
Every piece is the meeting of two forces: the *structure* of classical PAFA
training (the ink line, the drawing) and the *spontaneity* of salt and water
(the bloom, the chance). The brand lives in that tension — disciplined and
fluid at once.

**Positioning.** A collectible, exhibited fine artist — not a craft shop.
Botanical ink/watercolor/salt works, oil animal portraits, and landscapes,
available as one-of-a-kind originals, archival prints, and commissions.

**Audience.** Collectors and design-literate buyers; pet owners seeking a
keepsake portrait; interior designers sourcing original work.

**Personality.** Quiet · assured · poetic · precise · reverent toward nature.

**Promise.** Museum-grade work and presentation, made personal.

**Voice.** Spare, literary, sensory. Lowercase restraint in labels. Lead with
Laurie's own words ("a quiet celebration of wild nature," "controlled chaos,"
"caught between movement and stillness"). Never salesy. Captions read like a
gallery wall, not a storefront.

---

## 2. Logo & Marks

- **Signature mark** — Laurie's actual "L. Werth" signature inside a hand-drawn
  circle. Primary mark. `assets/brand/signature-white.png` (dark grounds),
  `assets/brand/signature-ink.png` (light grounds). Generous clear space; never
  recolor beyond ink/white; never stretch.
- **Wordmark** — "Laurie Werth" set in Fraunces, with "Fine Art" in lighter
  weight. Used in the header on light grounds and anywhere the signature would
  be too small to read.
- **Monogram** — "LW" in Fraunces for favicons and tight spaces.

---

## 3. Color — "Ink on Paper"

The palette is drawn straight from the materials: sumi-dark ink, warm rag
paper, the salt-white bloom, the dusty blue of *Blue Lace*, and the rust flecks
that scatter through the washes.

| Token        | Hex       | Role |
|--------------|-----------|------|
| `--ink`      | `#1b1e26` | Primary dark — text, dark sections, primary buttons |
| `--ink-soft` | `#2a2f3a` | Raised surfaces within dark sections |
| `--paper`    | `#f5f0e7` | Primary background (warm bone) |
| `--paper-warm`| `#ece4d6`| Alternate section background |
| `--salt`     | `#fdfbf6` | Cards, highlights, near-white |
| `--slate`    | `#6f8498` | Primary accent (dusty blue) |
| `--slate-deep`| `#51677b`| Accent hover / links on light |
| `--rust`     | `#a8623f` | Secondary accent — used *sparingly* |
| `--stone`    | `#8c8579` | Secondary / muted text |

Dominant by area: paper + ink. Slate is the one consistent accent; rust is a
rare punctuation (a single flecked detail), never a fill.

---

## 4. Typography

- **Display — Fraunces.** High-contrast modern old-style with art-directed
  italics. Headlines, wordmark, section indices, large numerals. Weights
  300–500. Italic carries emphasis ("Wild *Nature*").
- **Text/UI — Hanken Grotesk.** Warm, modern grotesque. Body, navigation,
  labels, buttons, prices, captions. Weights 300–600.
- **Labels/eyebrows.** Hanken, uppercase, ~0.18em letter-spacing, small, in
  stone or slate.

Rhythm: large headlines, generous leading, lots of air. Numerals as section
indices (Fraunces italic: *01 / 02 / 03*).

---

## 5. Layout & Motion

- **Editorial & gallery-quiet.** Generous whitespace; the art floats with soft,
  low shadows and breathing margins. Asymmetry over symmetry.
- **Hairline system.** 1px ink rules at low opacity organize the page; a small
  `✦` node punctuates them.
- **Museum captions.** Each work shows title + medium ("ink, watercolor & salt")
  the way a gallery label would.
- **Motion.** Slow and intentional: staggered fade-up on scroll, image hover
  with a subtle scale + caption reveal, underline-grow nav links. Honor
  `prefers-reduced-motion`.

---

## 6. Review of the previous design

What worked: clean structure, working cart/modal, real sections, SEO.
What undercut "established artist":
- Generic earthy linen/moss/clay palette that ignored Laurie's actual (moody,
  inky) work.
- Cormorant + DM Sans — pleasant but common; not distinctive.
- Emoji process icons and a 🎨 empty-cart icon read as un-premium.
- Storefront-style copy and a busy 4-up collection grid.
- No real brand mark; placeholder studio imagery.

This system replaces all of the above: her real signature mark, an "ink on
paper" palette pulled from the work, Fraunces/Hanken typography, museum-style
captions, section indices, a dramatic ink "Process" section, and her real
exhibition history — so the site reads like a represented artist's, not a shop.

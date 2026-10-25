# Design System Specification — My Med History

*Generated according to Google Stitch Design Specifications (`.agents/skills/stitch`).*

---

## 1. Visual Theme and Atmosphere

My Med History operates across two calibrated visual modes to satisfy distinct patient psychological contexts:

- **Clinical Clarity & High-Density Verification (Dark Surfaces `#09090b` / `#000000`):**
  - High contrast, dark neutral foundation designed for evidence comparison (split-screen OCR review, dosage timelines, and anatomical mapping).
  - Eliminates visual fatigue during prolonged reading, providing an auditable, cockpit-like precision environment.
- **Empathetic Calma & Mindful Health (Warm Light Surfaces `#FAF8F5` / `#FAF7F2`):**
  - Warm organic paper base with gentle terracotta and sage botanical accents.
  - Mitigates patient anxiety during convalescence, transforming cold medical orders into humane routines.

---

## 2. Color Palette and Semantic Roles

### Foundation & Neutrals
- **Surface Dark Ground:** `#09090b` (Deep Zinc Black) — Main canvas for analytical workbench & spatial dashboards.
- **Surface Dark Card:** `#18181b` (Subtle Zinc Charcoal) — Layered elevation for modules, tables, and dialogs.
- **Surface Warm Paper:** `#FAF8F5` (Alabaster Warm Linen) — Calming journal surface for the patient check-in.
- **Border Subtle Dark:** `#27272a` (Zinc 800) — 1px crisp borders providing tactile component separation.
- **Border Subtle Warm:** `#E8DCCF` (Warm Stone) — Gentle separation on paper backgrounds.

### Interactive & Health Accents
- **Clinical Blue (Primary Interactive):** `#2563EB` / `#3B82F6` — Action buttons, verified extraction highlights, and primary focus states.
- **Emerald Vital (Safe / Verified):** `#10B981` / `#059669` — Confirmed doctor instructions, adherence completion, and normal status.
- **Amber Caution (Missing / Review Needed):** `#F59E0B` / `#D97706` — Unread fields, ambiguous handwriting, and drug conflict warnings.
- **Terracotta Warm (Human Touch):** `#C86D51` — Primary accents for mindful journal and patient questions.
- **Purple Neural (Respiratory / Sensory):** `#A855F7` / `#9333EA` — Secondary physiological system indicators.

---

## 3. Typography Hierarchy

The system employs a tri-font pairing to communicate purpose instantly:
1. **Swiss / UI Sans (`Inter`):** Clean, objective, high-legibility sans-serif for forms, navigation, and badges.
2. **Auditing Mono (`JetBrains Mono`):** Tabular numbers, time stamps, CMP doctor license numbers, and OCR confidence scores.
3. **Editorial Serif (`Georgia` / `Newsreader`):** Humanistic serif for reflective moments, symptom journals, and questions for the doctor.

### Scale
- **Display Hero:** `28px` / `32px` — SemiBold / Regular, tracking `-0.02em`.
- **Section Heading (`h2`):** `20px` / `24px` — Bold / SemiBold.
- **Card Title (`h3`):** `14px` / `16px` — SemiBold / Medium.
- **Body Text:** `13px` / `18px` — Regular, tracking `0`.
- **Micro Labels / Badges:** `10px` / `12px` — Mono / Medium, uppercase tracking `+0.05em`.

---

## 4. Component Stylings

### Medical Prescription Canvas
- **Style:** Authentic Peruvian clinical paper background (`#FFFDF9`) with subtle clinic header, doctor CMP credentials, and interactive SVG bounding boxes.
- **States:** Hover highlights line item; active selection pulses with OCR confidence score and direct bidirectional binding to the structured form.

### Anatomical Body Map
- **Style:** Vector silhouette with pulsing bioluminescent SVG hotspots at `Mandíbula / Molar`, `Vías Aéreas`, and `Estómago`.
- **States:** Interactive tap filters all treatments and scheduled pills to the active body region.

### Circadian 24-Hour Itinerary Card
- **Style:** 12px rounded cards with requirement badges:
  - `⚡ En ayunas` (amber accent)
  - `🍽️ Con alimentos copiosos` (emerald accent)
  - `💧 Abundante agua` (cyan accent)
  - `🌙 Antes de dormir` (indigo accent)
- **Check Action:** Instant tactile strikethrough updating daily adherence percentage.

---

## 5. Layout Principles

- **Grid:** Responsive 12-column layout on desktop; single-column card stack on mobile.
- **Base Spacing:** `4px` base unit with `12px`, `16px`, `24px`, and `32px` rhythm steps.
- **Container Max-Widths:**
  - Mobile Shell: `440px` (Cupertino simulation).
  - Standard Dashboard: `896px` (Bento / Chrono).
  - Clinical Workbench / Cockpit: `1152px` (Dual-pane desktop workspace).

---

## 6. Stitch Generation Notes & Keywords

When generating new screens or variants using Google Stitch (`stitch generate screen`), use the following style descriptors:

```text
Atmosphere: "Modern clinical precision meets empathetic patient care, clean swiss grid with dark zinc mode and warm linen paper alternative, high accessibility contrast, zero medical hallucination, clear provenance tags"
Keywords: "medical dashboard, anatomical body map, prescription audit, drug schedule, dark zinc palette #09090b, clinical blue #2563EB, emerald status #10B981, amber warning #F59E0B, clean typography Inter and JetBrains Mono"
```

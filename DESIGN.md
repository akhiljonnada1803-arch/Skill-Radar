---
name: Field Survey Expedition Log
colors:
  surface: '#fff9eb'
  surface-dim: '#dfdacc'
  surface-bright: '#fff9eb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f9f3e5'
  surface-container: '#f3eddf'
  surface-container-high: '#eee8da'
  surface-container-highest: '#e8e2d4'
  on-surface: '#1d1c13'
  on-surface-variant: '#5b403a'
  inverse-surface: '#333027'
  inverse-on-surface: '#f6f0e2'
  outline: '#8f7069'
  outline-variant: '#e3beb6'
  surface-tint: '#b52703'
  primary: '#b12401'
  on-primary: '#ffffff'
  primary-container: '#d53e1b'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4a3'
  secondary: '#605e5a'
  on-secondary: '#ffffff'
  secondary-container: '#e6e2dc'
  on-secondary-container: '#666460'
  tertiary: '#476343'
  on-tertiary: '#ffffff'
  tertiary-container: '#5f7c5a'
  on-tertiary-container: '#f7fff0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad2'
  primary-fixed-dim: '#ffb4a3'
  on-primary-fixed: '#3d0600'
  on-primary-fixed-variant: '#8b1a00'
  secondary-fixed: '#e6e2dc'
  secondary-fixed-dim: '#cac6c1'
  on-secondary-fixed: '#1d1b18'
  on-secondary-fixed-variant: '#484743'
  tertiary-fixed: '#cbebc2'
  tertiary-fixed-dim: '#b0cfa7'
  on-tertiary-fixed: '#072107'
  on-tertiary-fixed-variant: '#334d2f'
  background: '#fff9eb'
  on-background: '#1d1c13'
  surface-variant: '#e8e2d4'
typography:
  headline-xl:
    fontFamily: Newsreader
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Newsreader
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0em
  body-lg:
    fontFamily: Newsreader
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Newsreader
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Newsreader
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Space Mono
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-md:
    fontFamily: Space Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.1em
  label-sm:
    fontFamily: Space Mono
    fontSize: 9px
    fontWeight: '400'
    lineHeight: 12px
    letterSpacing: 0.12em
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system translates the discipline of technical skill acquisition into an archival scientific expedition. Built specifically for ambitious tech students, the system reimagines skill diagnostics, learning milestones, and competency charting as entries within an analog, printed field-survey notebook.

The aesthetic rests firmly at the intersection of **Tactile / Skeuomorphic** print techniques and utilitarian **Brutalist** editorial structure. It discards modern polished glass, glowing gradients, and pill-shaped app chrome in favor of heavy-ink printing, Risograph mechanical misregistration, manual rubber stamping, and weathered paper stocks.

### Emotional Tone & Aesthetics
- **Tactile & Scholarly:** Evokes heavy-weight archival paper, field manuals, library accession cards, and cartographic reports.
- **Physical Imperfection:** Embraces manual print anomalies—offset registration crosses (`+`), hard ink drop shadows, visible halftone screens, and deliberate 1° to 2° stamped rotations.
- **No-Nonsense Rigor:** Communicates deep academic substance through disciplined monospaced labels and classic literary book typography, ensuring student progress feels earned, documented, and cataloged.

## Colors

The palette is strictly physical, simulating natural paper bases and dense spot-color inks. Modern digital primaries (electric blues, purple tints, blurred glows) are forbidden. 

### Palette Definition
- **Base Canvas (`#F1EBDD`):** Unbleached rag paper stock. Acts as the global ground across all viewports.
- **Card Surface (`#F7F2E7`):** Calendered light specimen slip paper. Provides subtle distinction from the ground canvas.
- **Solid Carbon Ink (`#1B1A17`):** Primary structural ink used for all body text, vector borders, corner crop marks, and hard offset shadows.
- **Signal Vermilion (`#D9411E`):** Primary spot ink. Reserved strictly for primary action stamps, critical radar blips, active indicators, and high-priority notices.
- **Field Moss (`#4F6B4A`):** Archival verifier ink. Denotes mastered competencies, verified skills, and completed field logs.
- **Expedition Ochre (`#C99A2E`):** Marginalia ink. Applied to draft status indicators, theoretical skill tags, and highlight markers.
- **Faded Rule (`#CFC6B0`):** Ruled notebook guidelines, faint gridlines, and section tick marks.

### Color Rules & Application
- Pure blacks (`#000000`) and pure whites (`#FFFFFF`) are strictly prohibited; all elements interact as physical pigments laid onto tinted paper.
- Halftone stippling patterns must be rendered in `#1B1A17` or `#D9411E` at fractional opacities (20%–40%), never blended via digital opacity gradients.
- Color cannot exist without ink containment: colored indicators must be enclosed by solid borders or framed inside archival stamp outlines.

## Typography

The typographic hierarchy juxtaposes formal, literary editorial serifs with the sterile, mechanical precision of field-instrument monospacing. Generic sans-serif typefaces are deliberately omitted.

### Typeface Roles
- **Headlines & Narrative Body (`Newsreader`):** Provides authentic book-work proportions, sturdy serifs, and high editorial gravitas. Display headlines leverage tight line spacing to simulate vintage newspaper or academic paper mastheads.
- **Labels, Metadata, & Stamps (`Space Mono`):** Acts as the mechanical field counterweight. Used in all-caps or small-caps for specimen accession codes, coordinates, date stamps, data keys, and metric values.

### Typographic Rules
- All `label-*` tokens must be transformed to uppercase (`text-transform: uppercase`).
- Paragraphs in body text should prioritize justified or clean ragged-right settings with indented first lines in prolonged logs rather than excessive paragraph spacing.
- Numerals in data tables and radar scoreboards must use monospaced figures to ensure vertical alignment across survey metrics.

## Layout & Spacing

Layouts follow a calibrated field-journal grid aligned to 4px and 8px baselines. The screen behaves like a bounded physical page sheet with tactile margins and printed registration landmarks.

### Layout Model
- **Mobile First Structure:** Single-column notebook page layout framed by permanent 16px outer margins (`margin`).
- **Ruled Paper Ledger Lines:** Background content areas utilize horizontal ruled guidelines spaced at 22px intervals rendered in `#CFC6B0`, anchoring text baseline heights.
- **Corner Crop Marks:** Outer viewport boundaries and key structural cards feature mechanical registration crosshairs (`+`) set 4px outside card perimeters or in the outer margin corners.
- **Adaptive Breakpoints:**
  - **Phone (up to 599px):** 1-column layout; gutter `0.75rem`; margins `1rem`. Specimen cards stack vertically with offset shadows intact.
  - **Tablet (600px to 1023px):** 2-column split-page journal; gutter `1.25rem`; margins `1.5rem`. Left column handles overarching taxonomy/radar dials; right column houses specimen feed.
  - **Desktop (1024px+):** Fixed 3-column binder layout bounded to 1200px max width; gutter `1.5rem`; margins `2rem`. Emulates a dual-page spread with an indexed catalog rail.

## Elevation & Depth

Depth in this system is strictly mechanical and planar—it does not mimic light through glass or air, but instead mirrors the physical thickness of stacked heavy paper stock and cardboards on a field desk.

### Stacking Rules
- **No Soft Diffuse Shadows:** Blurs are banned (`box-shadow: ... blur > 0` is strictly illegal). All depth is achieved with sharp, zero-blur ink cuts.
- **Hard Offset Ink Cast:** Structural components, actionable buttons, and floating dialog slips cast a crisp projection: `box-shadow: 3px 3px 0px #1B1A17`.
- **Primary Elevation (Active/Pressed):** When an interactive specimen or button is engaged, the hard shadow shifts to `0px 0px 0px #1B1A17`, with an accompanying translation of `translate(3px, 3px)` to emulate a mechanical key or physical stamp depress.
- **Secondary Ink Outline:** Every elevated card must retain a `1px solid #1B1A17` perimeter line, ensuring the boundaries of the paper layer are always mechanically separated from the ground paper.

## Shapes

The geometry of the system is sharp, architectural, and guillotine-cut. 

### Geometric Standards
- **Zero Radius Default:** All containers, buttons, cards, tags, and form fields use a strict `0px` radius. Rounded pill elements (`rounded-full`), smooth circular floating buttons, and iOS/Material style rounded rectangles are expressly prohibited.
- **Guillotine Clipped Corners:** Selected high-priority accession badges and specimen headers may feature angled 45-degree corner notches (`polygon` chamfers of 4px to 6px) to emulate notched punch cards and paper index tags.
- **Registration Crosses:** Precision survey marks (`+`) are positioned at 90-degree intersection vertices to reinforce the printed editorial drafting aesthetic.

## Components

### Specimen Cards
- **Construction:** Paper surface `#F7F2E7`, `1px solid #1B1A17` border, `box-shadow: 3px 3px 0px #1B1A17`. Corner registration marks placed at top-left and bottom-right corners.
- **Header:** Features an accession identification line in `label-sm` (e.g., `SPECIMEN #042-AI // CORE ARCHITECTURE`).
- **Footer:** Contains taxonomy metadata tags and a source citation signature line separated by a `1px solid #CFC6B0` rule.

### Buttons & Interactive Controls
- **Primary Action (Field Stamp Button):** Background `#D9411E`, foreground `#F7F2E7`, `1px solid #1B1A17` border, `box-shadow: 3px 3px 0px #1B1A17`. Text set in `label-lg` uppercase. Hover creates a -0.5deg tilt; active press removes shadow via `translate(3px, 3px)`.
- **Secondary Action (Paper Slip Button):** Background `#F7F2E7`, foreground `#1B1A17`, `1px solid #1B1A17` border, `box-shadow: 2px 2px 0px #1B1A17`.
- **Tertiary Action (Ruled Link):** Monospaced ink text with a persistent `1px solid #D9411E` dotted underline.

### Rubber-Stamp Badges
- **Visuals:** Framed inside a double border (`3px solid` outer, `1px solid` inner with 1px space) using `#D9411E` (In-Progress/Priority), `#4F6B4A` (Verified/Mastered), or `#C99A2E` (Provisional).
- **Physical Rotation:** Displayed with an inherent `-1.5deg` or `+1.5deg` rotational skew (`transform: rotate(-1.5deg)`) to simulate hand-stamped ink impressions.
- **Texture:** Halftone mask or textured knock-out effect revealing the underlying card paper.

### Form Inputs & Checkboxes
- **Text Inputs:** Flat paper background `#F1EBDD`, inset `1px solid #1B1A17` border. Focus state removes typical browser halos and applies a solid `2px solid #D9411E` border with an immediate `2px 2px 0px #1B1A17` hard shadow.
- **Checkboxes:** Square boxes (`16px x 16px`) with `1px solid #1B1A17`. Checked state displays a hand-inked `X` mark or solid filled vermilion square (`#D9411E`), never a rounded modern vector checkmark.
- **Radio Buttons:** Square outer box containing a nested centered square (`8px x 8px`) when selected.

### Navigation Strip
- **Bottom/Top Bar:** Bounded paper strip (`#F7F2E7`) defined by a solid `2px solid #1B1A17` border line separating it from the viewport.
- **Active Navigation Indicator:** Selected destination is designated by an active `3px solid #D9411E` continuous underline and high-contrast ink icon, while inactive tabs render with muted ink (`#1B1A17` at 60% opacity) and no underline.

### Radar Skill Charting & Data Displays
- **Polygonal Radar Grid:** Drawn with concentric web polygons in `1px solid #CFC6B0`. Radial axes end with precise `+` tick marks.
- **Data Polygon:** Filled with a 20% opacity `#D9411E` halftone stipple pattern, bound by a crisp `2px solid #D9411E` perimeter stroke.
- **Axis Nodes:** Labelled with `label-sm` monospace identifiers accompanied by current proficiency percentages.

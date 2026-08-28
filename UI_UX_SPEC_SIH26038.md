# UI/UX Specification — SIH26038 DR Screening System
**Companion to:** `PRD_SIH26038_DR_Screening.md` · **Paired with:** `TECH_STACK_SIH26038.md`

Written as ground truth for a code assistant. Every color, font, spacing value, and copy string below is a decision — if something's missing, that's a gap to flag, not a default to invent.

---

## 1. Design Direction & Rationale

Two real personas drive two different layout modes — this isn't a stylistic choice, it's functional:

- **Field capture mode** (ASHA worker / technician): outdoor or bright primary-health-center lighting, tablet or phone, non-technical user, needs large touch targets and near-zero reading. **A dark UI is wrong here** — it's illegible in sunlight — so the whole app uses a light, high-contrast base.
- **Clinical review mode** (ophthalmologist): desktop, indoors, data-dense, wants to scan and decide fast — closer to a radiology reading workstation than a consumer app.

**Signature element:** the Grad-CAM evidence view is treated like a clinician annotating a scan on a lightbox — a circular vignette echoing the fundus camera's own circular field of view, with lesion markers as pinned leader-line labels rather than a flat heatmap dump. This visual motif recurs on the result screen, the review screen, and the PDF report, so it's the one consistent "signature" across the whole product.

Typography is chosen for a concrete reason: **IBM Plex Sans has a matching IBM Plex Sans Devanagari companion**, so Hindi and English can share one true type family instead of an awkward mismatched fallback — directly serving the multilingual requirement, not decoration.

---

## 2. Design Tokens

### 2.1 Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#F7F8F6` | App background — cool pale sage-white, not warm cream |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-ink` | `#1A1F1D` | Primary text — warm charcoal, not pure black |
| `--color-ink-muted` | `#5B635E` | Secondary text, captions |
| `--color-border` | `#D8DCD8` | Dividers, input borders |
| `--color-primary` | `#A6672A` | "Optic Amber" — primary actions, active nav, brand accent |
| `--color-primary-hover` | `#8C5623` | Hover/active state of primary |
| `--color-trust` | `#1B4B4A` | "Vessel Teal" — data viz, secondary emphasis, links |
| `--color-danger` | `#B3261E` | "Hemorrhage Red" — reserved *only* for referable-DR flags and real errors |
| `--color-success` | `#2F6B4F` | "Healthy Green" — reserved *only* for confidently-normal results |
| `--color-warning` | `#B8860B` | Uncertain/needs-review state |
| `--color-focus-ring` | `#1B4B4A` | Keyboard focus outline, 2px, all interactive elements |

Semantic rule the code must not violate: **red and green are status colors, not decoration.** They only ever appear tied to a clinical confidence band or an error state — never used for generic UI accents.

### 2.2 Typography

| Role | Family | Fallback stack | Notes |
|---|---|---|---|
| Display / headings | IBM Plex Serif | `"IBM Plex Serif", Georgia, serif` | Editorial/clinical-report character, used for screen titles and the PDF report headline only |
| Body / UI | IBM Plex Sans | `"IBM Plex Sans", "IBM Plex Sans Devanagari", -apple-system, sans-serif` | All UI text, both languages, one family |
| Data / numeric / IDs | IBM Plex Mono | `"IBM Plex Mono", ui-monospace, monospace` | Case IDs, confidence %, timestamps, coordinates |

**Type scale** (rem, base 16px):
| Token | Size | Weight | Line height | Use |
|---|---|---|---|---|
| `--text-display` | 2.25rem | 600 | 1.2 | Screen H1 |
| `--text-h2` | 1.5rem | 600 | 1.3 | Section headers |
| `--text-h3` | 1.125rem | 600 | 1.4 | Card titles |
| `--text-body` | 1rem | 400 | 1.5 | Default body |
| `--text-small` | 0.875rem | 400 | 1.4 | Captions, helper text |
| `--text-mono` | 0.875rem | 500 | 1.4 | IDs, data values |

### 2.3 Spacing Scale (4px base unit)
`--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;`

### 2.4 Radius & Elevation
- `--radius-sm: 6px` (inputs, small buttons)
- `--radius-md: 12px` (cards, modals)
- `--radius-full: 9999px` (status badges, the circular fundus-image vignette only — not general buttons)
- `--shadow-card: 0 1px 3px rgba(26,31,29,0.08), 0 1px 2px rgba(26,31,29,0.04)` — single restrained elevation level, no heavier shadows anywhere

### 2.5 Breakpoints
| Name | Width | Primary use |
|---|---|---|
| `mobile` | 375–428px | Field capture mode |
| `tablet` | 768–1023px | Field capture mode, larger devices |
| `desktop` | 1024–1439px | Clinical review mode |
| `wide` | ≥1440px | Clinical review mode, dashboard |

---

## 3. Information Architecture (Routes)

| Route | Screen | Persona |
|---|---|---|
| `/` | Role selector (Field Worker / Reviewer / Admin) | All |
| `/capture` | Upload/capture screen | Field worker |
| `/capture/:caseId/quality` | Quality feedback screen | Field worker |
| `/capture/:caseId/processing` | Processing/loading screen | Field worker |
| `/capture/:caseId/result` | Case result / explainability report | Field worker + reviewer |
| `/queue` | Reviewer queue dashboard | Reviewer |
| `/queue/:caseId` | Case detail review screen | Reviewer |
| `/simulate` | Resource simulation dashboard | Admin |
| `/reports/:caseId` | PDF report preview/download | Reviewer, admin |
| `/settings` | Language toggle, about | All |

No login/auth screen for the hackathon prototype — role selection is a simple unauthenticated choice, per Tech Stack §10.

---

## 4. Screen-by-Screen Specification

### Screen 1 — Role Selector (`/`)
- **Purpose:** route the user into the right mode.
- **Layout:** centered card, three large buttons: "Field Worker", "Reviewer", "Admin". Mobile-first single column.
- **Components:** `Button` (primary variant ×3), `LanguageToggle` in top-right corner.
- **States:** static, no loading/error.
- **Copy:** H1 "DR Screening" · subtitle "Choose how you're using this today."

### Screen 2 — Upload/Capture (`/capture`)
- **Purpose:** field worker uploads or captures a fundus image.
- **Layout (mobile-first):** full-width `ImageDropzone` (large, icon-forward, tap-to-capture or drag-drop on tablet), optional `patient_ref` text input below, primary "Upload & Check" button.
- **Components:** `ImageDropzone`, `TextInput`, `Button`.
- **States:**
  - *Empty:* dropzone shows camera icon + "Tap to capture or choose a photo."
  - *File selected:* thumbnail preview + "Upload & Check" enabled.
  - *Uploading:* button shows `Spinner` + "Checking image…"
  - *Error (upload failed):* inline `ErrorBanner`, copy: "Couldn't upload the image. Check your connection and try again." (never a raw error code shown to the field worker)
- **Interaction:** on success, navigate to `/capture/:caseId/quality`.

### Screen 3 — Quality Feedback (`/capture/:caseId/quality`)
- **Purpose:** show pass/fail from `POST /cases/upload`'s quality result, immediately actionable.
- **Layout:** large status icon + headline, image thumbnail, reasons list if rejected.
- **States:**
  - *Passed:* green `StatusBadge` "Image accepted" + "Continue" button → triggers `/analyze`, navigates to Screen 4.
  - *Rejected:* amber/red `StatusBadge` "Retake needed" + bullet list of plain-language reasons (map `reject_reasons` codes to copy: `blur` → "Image is blurry", `underexposed` → "Image is too dark", `overexposed` → "Image is too bright", `incomplete_fov` → "Retina isn't fully in frame") + "Retake Photo" button → back to Screen 2.
- **Copy tone:** direct, instructional, no blame — "Retake needed" not "Upload failed."

### Screen 4 — Processing (`/capture/:caseId/processing`)
- **Purpose:** hold the user during `/analyze` execution; poll `/result` every 1.5s.
- **Layout:** centered `Spinner` + progress copy that changes with elapsed time (not a fake progress bar): 0–3s "Analyzing retinal structures…", 3–6s "Grading severity…", 6s+ "Almost done…"
- **States:** *processing* (as above); on `status: "graded"` from poll, auto-navigate to Screen 5. On error, show `ErrorBanner` with "Analysis failed. Please try again." + retry button.

### Screen 5 — Case Result / Explainability Report (`/capture/:caseId/result`)
- **Purpose:** the core explainability deliverable — shown to both field worker (simplified) and reviewer (full detail), same route, detail level controlled by role stored in app state.
- **Layout:**
  - Header: grade badge (`GradeBadge` — large, color-coded by `confidence_band`: green/`confident_normal`, red/`confident_referable`, amber/`uncertain_review`) + `grade_label` + calibrated confidence %.
  - **Signature element:** `RetinalEvidenceViewer` — the fundus image inside a circular vignette frame, Grad-CAM heatmap as a toggleable overlay (switch: "Show AI evidence"), lesion markers as pinned dots with leader-line labels on hover/tap showing `type` + `confidence`.
  - Below: `summary_text` as a plain-language sentence, then a structured `LesionList` (type, location quadrant, confidence, as a simple table/list — not just prose).
  - Action row: "Send to Reviewer" (field worker view) or "Confirm / Override" (reviewer view — see Screen 7 for the full version).
- **States:** *loaded* (above), *no-lesions-detected* (still show the viewer, empty `LesionList` with copy "No lesions detected above the confidence threshold" rather than a blank space).

### Screen 6 — Reviewer Queue Dashboard (`/queue`)
- **Purpose:** ophthalmologist's worklist, triaged by confidence band (this is where the confidence-triage differentiation idea becomes visible UI).
- **Layout (desktop-first, dense):** three-column kanban-style grouping — "Needs Review" (`uncertain_review`, sorted first/most prominent), "Referable — Confirmed High Confidence" (`confident_referable`), "Normal — Confirmed High Confidence" (`confident_normal`). Each card: thumbnail, `grade_label`, confidence %, time since upload.
- **Components:** `CaseCard` (×N), `FilterBar` (status, date range), `EmptyState`.
- **States:**
  - *Empty queue:* illustration + "No cases waiting. New screenings will appear here."
  - *Loaded:* cards as above, click → Screen 7.
- **Interaction:** clicking a `CaseCard` navigates to `/queue/:caseId`.

### Screen 7 — Case Detail Review (`/queue/:caseId`)
- **Purpose:** full review + final decision, reuses the `RetinalEvidenceViewer` and `LesionList` from Screen 5, adds a decision panel.
- **Layout:** two-column desktop layout — left: `RetinalEvidenceViewer` + `LesionList` (as Screen 5); right: sticky decision panel with `radio` (Confirm AI Grade / Override) → if override, `Select` for corrected grade 0–4, `Textarea` for notes, "Submit Review" `Button`.
- **States:** *submitting* (button spinner, disabled form), *submitted* (success toast "Review saved." + auto-navigate back to `/queue`), *error* (inline error, form stays editable, no data loss).

### Screen 8 — Resource Simulation Dashboard (`/simulate`)
- **Purpose:** the Simulink-workflow-model output, made explorable.
- **Layout:** left panel of `Slider`/`NumberInput` controls (num_cameras, num_reviewers, bandwidth_mbps, images_per_day_per_camera) mapped 1:1 to the `/simulate` request fields in Tech Stack §5.7; right panel: `LineChart` (Recharts) of backlog-over-time, a `StatCard` row (annual_capacity, bottleneck, recommendation).
- **States:** *default* (loaded with sensible starting values matching Tech Stack §7 defaults), *recalculating* (chart area shows subtle loading overlay, not a full-screen spinner — this is meant to feel exploratory/live), *error* (inline banner, previous chart stays visible rather than disappearing).
- **Copy for `bottleneck` values:** map enum to plain language — `bandwidth` → "Network bandwidth is the limiting factor", `processing` → "AI processing speed is the limiting factor", `review_capacity` → "Reviewer availability is the limiting factor", `none` → "No bottleneck at this scale."

### Screen 9 — PDF Report Preview (`/reports/:caseId`)
- **Purpose:** preview before download/print, matches the actual PDF layout (see §7 for report-specific spec).
- **Layout:** embedded PDF viewer (or styled HTML mirror if embedding is complex) + "Download PDF" button.
- **States:** *loading*, *loaded*, *error* ("Report couldn't be generated. Try again.").

### Screen 10 — Settings (`/settings`)
- **Purpose:** language toggle (English/Hindi), about/version info.
- **Layout:** simple form, `RadioGroup` for language, static text block for app version + team/PS credit.

---

## 5. Component Library

Given as TypeScript-style prop interfaces — exact enough that a code assistant can implement directly without guessing prop names.

```typescript
// Button.tsx
interface ButtonProps {
  variant: "primary" | "secondary" | "danger" | "ghost";
  size: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

// StatusBadge.tsx
interface StatusBadgeProps {
  band: "confident_normal" | "confident_referable" | "uncertain_review" | "pending";
  label: string; // e.g. "Moderate DR"
}

// ImageDropzone.tsx
interface ImageDropzoneProps {
  onFileSelected: (file: File) => void;
  maxSizeMb: number; // from VITE config, default 15
  accept: string[]; // [".jpg", ".jpeg", ".png"]
}

// RetinalEvidenceViewer.tsx  — the signature component
interface Lesion {
  type: "microaneurysm" | "exudate" | "hemorrhage" | "neovascularization";
  bbox: [number, number, number, number]; // normalized x,y,w,h
  confidence: number;
}
interface RetinalEvidenceViewerProps {
  imageUrl: string;
  gradcamOverlayUrl: string;
  lesions: Lesion[];
  showOverlay: boolean;
  onToggleOverlay: (show: boolean) => void;
}

// LesionList.tsx
interface LesionListProps {
  lesions: Lesion[];
  emptyStateText: string; // "No lesions detected above the confidence threshold"
}

// CaseCard.tsx
interface CaseCardProps {
  caseId: string;
  thumbnailUrl: string;
  gradeLabel: string;
  confidenceBand: StatusBadgeProps["band"];
  createdAt: string; // ISO date, rendered as relative time
  onClick: (caseId: string) => void;
}

// SimulationControls.tsx
interface SimulationControlsProps {
  numCameras: number;
  numReviewers: number;
  bandwidthMbps: number;
  imagesPerDayPerCamera: number;
  onChange: (field: string, value: number) => void;
}

// ErrorBanner.tsx
interface ErrorBannerProps {
  message: string;      // plain-language, never a raw error code
  onRetry?: () => void;
}

// LanguageToggle.tsx
interface LanguageToggleProps {
  current: "en" | "hi";
  onChange: (lang: "en" | "hi") => void;
}
```

---

## 6. Accessibility Requirements

- Minimum contrast ratio 4.5:1 for body text against its background — verify `--color-ink` (`#1A1F1D`) on `--color-bg` (`#F7F8F6`) and all status-badge text/background pairs.
- Every interactive element gets a visible `--color-focus-ring` on keyboard focus — never `outline: none` without a replacement.
- All images (`RetinalEvidenceViewer`, thumbnails) require descriptive `alt` text — for clinical images, describe grade + finding, not just "retina image", e.g. `alt="Fundus image, graded Moderate DR, 2 lesions detected"`.
- `ImageDropzone` and all form controls fully operable via keyboard (tab order, Enter/Space to activate).
- Respect `prefers-reduced-motion` — the processing-screen copy changes (Screen 4) should not rely on animation to convey progress; motion is a nicety, not the only signal.

---

## 7. Multilingual (i18n) Approach

- `react-i18next`, two locale files: `frontend/src/i18n/en.json`, `frontend/src/i18n/hi.json`, flat key structure namespaced by screen, e.g. `"capture.dropzone.empty"`, `"quality.rejected.blur"`.
- All user-facing copy in this document (§4, §8) is the **source English copy** — Hindi translations should be produced by the team once English strings are locked, not invented ad hoc by a code assistant mid-build.
- Language toggle persists in local component state for the demo (no backend user-preference storage needed at this scope) — default from `VITE_DEFAULT_LANGUAGE`.
- PDF report (Screen 9 / §... in Tech Stack) should also respect the selected language at generation time — pass `lang` as a parameter to `report_service.py`.

---

## 8. Micro-copy Guidelines & Reference Strings

Per the design principle: active voice, tell the user what happened and what to do, never a generic "Oops."

| Situation | Copy |
|---|---|
| Upload error | "Couldn't upload the image. Check your connection and try again." |
| Quality: blur | "Image is blurry. Hold steady and retake." |
| Quality: underexposed | "Image is too dark. Retake in better lighting." |
| Quality: overexposed | "Image is too bright. Reduce glare and retake." |
| Quality: incomplete FOV | "Retina isn't fully in frame. Recenter and retake." |
| Analysis failure | "Analysis failed. Please try again." |
| Empty reviewer queue | "No cases waiting. New screenings will appear here." |
| No lesions detected | "No lesions detected above the confidence threshold." |
| Review submitted | "Review saved." |
| Report generation failure | "Report couldn't be generated. Try again." |
| Simulation bottleneck: bandwidth | "Network bandwidth is the limiting factor." |
| Simulation bottleneck: processing | "AI processing speed is the limiting factor." |
| Simulation bottleneck: review capacity | "Reviewer availability is the limiting factor." |
| Simulation bottleneck: none | "No bottleneck at this scale." |

A control's label never changes meaning across a flow — "Retake Photo" always returns to Screen 2; "Confirm" on Screen 7 always means "accept the AI grade as-is."

---

## 9. Responsive Behavior Summary

- **Field capture screens (2, 3, 4, 5-field-view)**: single column at all breakpoints up to `tablet`; at `desktop` width, cap content at 480px centered (this flow is never meant to be used on a wide desktop, but shouldn't break if it is).
- **Clinical review screens (6, 7, 8)**: single column below `desktop`; multi-column (kanban / two-panel / controls+chart) only from `desktop` up. Below `desktop`, Screen 6's kanban collapses to a single filterable list, Screen 7's two-column becomes stacked (viewer above, decision panel below).

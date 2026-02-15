# Claude Code Context - History Line

## 1) Project Intent (from `History Line (3).pdf`)

Source used: `C:\Users\renat\iCloudDrive\Downloads\History Line (3).pdf`

Core concept:
- Player controls a family lineage ("family spirit"), not just one character.
- Main goal is long-term survival and prestige across generations (starting around year 1500 and progressing into modern/future eras).

Design pillars:
- Era-based rules: available jobs, social systems, dangers, laws, and inheritance behavior change by time period.
- Generational consequences: ancestor actions affect descendant opportunities and penalties.
- Data-driven events: event selection should be tag/condition based (era, class, location, wealth, relationships), not hardcoded logic per event.
- Living social layer: relationships with family/NPCs should produce persistent consequences.
- Long-term economy: inflation/devaluation and asset classes should matter over centuries.

Practical content strategy from the PDF:
- Build reusable event templates + tags to scale content volume.
- Keep logic engine in code, keep most narrative in data files (JSON/TS data structures).
- Mix universal events (high %) + regional/era-specific events (lower %) for variety.

Roadmap direction in the PDF (high level):
- MVP: core loop + UK/US style progression + base systems.
- Later expansions: region packs / era packs (ex: France update, paid DLC style content like Shogunate/Vikings concepts).

## 2) Current Codebase Snapshot

Main runtime file:
- `App.tsx` contains the primary game loop, state orchestration, dashboard UI, modal/event flow, and navigation between views.

Key feature modules:
- `src/components/OccupationView.tsx`
- `src/components/RelationshipsView.tsx`
- `src/components/FooterMenu.tsx`
- `src/components/EventModal.tsx`
- `src/components/SheetHeader.tsx`
- `src/context/ViewContext.tsx`
- `src/data/*` and `constants/*` for content and era/event systems

Navigation model (current):
- View context values: `DASHBOARD`, `RELATIONSHIPS`, `OCCUPATION`, `ASSETS`, `ACTIVITIES`.
- `FooterMenu` triggers view changes and age progression.

## 3) Recent UI/UX Changes Implemented

Goal implemented:
- Bottom tabs open a floating sheet over dashboard.
- Dashboard remains visible in background (dim/blur backdrop).
- Sheet can close via back button, close button, backdrop tap, and swipe-down.

Files changed for this:
- `App.tsx`
- `src/components/SheetHeader.tsx`
- `src/components/OccupationView.tsx`
- `src/components/RelationshipsView.tsx`

Implementation details:
- Added bottom-sheet-like overlay in `App.tsx` using:
  - `Animated`
  - `PanResponder`
  - backdrop with web blur style
- Dashboard now always renders as base layer.
- Non-dashboard views render inside `sheetContainer`.
- Added compact themed back arrow in `SheetHeader`.

Important bug fixed:
- Hook order error ("Rendered more hooks than during previous render") was fixed by ensuring sheet hooks are initialized before the early `if (!character) return`.

Android-specific adjustments:
- `sheetContainer` switched to fixed height (`88%`) instead of content-driven max height.
- Added `nestedScrollEnabled` to key `ScrollView`s and reduced eager gesture capture in sheet pan responder.

## 4) Known Runtime/Tooling Notes

Install/toolchain notes observed:
- For this dependency set, `@types/react` needed to align with React Native 0.81.x expectations (`^19.x`).
- Windows PowerShell may block `npm.ps1`; use `npm.cmd` if needed.
- Android local build requires working Java/Gradle setup (`JAVA_HOME` set, emulator/device available).

Lint/TS notes:
- Repo currently has pre-existing TypeScript/ESLint issues unrelated to the sheet changes.
- Do not treat current `tsc --noEmit` output as a clean gate without addressing broader existing errors first.

## 5) Suggested Next Engineering Steps

1. Stabilize sheet scroll behavior on Android:
- If any tab still does not scroll reliably, introduce a dedicated scroll wrapper per sheet tab and limit pan gesture activation to a top drag-handle region only.

2. Formalize event architecture:
- Move toward a strict data-driven event schema with reusable tags and condition filters (era/class/wealth/location/relationship).

3. Separate product docs:
- Keep this file as "current implementation context".
- Keep `INSTRUÇÕES_CLAUDE_CODE.md` for specific content-generation tasks.

4. Add regression checks:
- Basic interaction checklist for web + Android:
  - Open each bottom-tab sheet
  - Scroll to end
  - Swipe down to close
  - Back arrow close
  - Backdrop close

## 6) Context Files To Read First (for future sessions)

1. `CLAUDE_CODE_CONTEXT.md` (this file)
2. `INSTRUÇÕES_CLAUDE_CODE.md` (task instructions for childhood events expansion)
3. `App.tsx` (main UI/flow orchestration)
4. `src/context/ViewContext.tsx` (view state model)
5. `src/data/childhoodEventsByClass.ts` and `src/data/*` (content/event data)

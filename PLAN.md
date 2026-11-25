# WonderMap — Plan and status

Living document: what has been **done**, what is **left**, and why things are the way they are.
Update it whenever the scope changes.

Legend: ✅ done · 🚧 in progress · ⬜ planned · 💡 idea

## 1. Vision and roadmap

A game-like, web-based fantasy map painter (Inkarnate / Wonderdraft style) for D&D worlds.

| Version | Scope | Status |
|---------|-------|--------|
| **v0.1** | **World map editor**: paint land and sea, stamp symbols, draw paths, name places, add canvas, export an image | ✅ done (this release) |
| v0.2 | **Settlement maps**: zoom into a town, city or castle and paint its streets, houses, markets, farms and walls | ⬜ planned ([§4.3](#43-v02--settlement-maps)) |
| v0.3 | **Dungeon maps** | ⬜ planned ([§4.4](#44-v03--dungeon-maps)) |

## 2. The original brief, item by item (v0.1)

| Requested | What ships |
|-----------|------------|
| Land: green, brown, red, gray | Terrains **Grassland**, **Brown earth**, **Red lands**, **Gray rock** |
| Beaches | Automatic sandy beach wherever land meets the sea (setting *Beaches*), plus the **Beach sand** terrain |
| Sea | The base of every map, with depth shading, ripples and a *Sea* brush mode that turns land back into water |
| Mountains | 51 mountain and hill symbols (brown, snow-capped, gray, dark, red, mossy, ranges, hills) and 16 scatter brushes |
| Forests or individual trees | 13 tree symbols (oak, dark oak, autumn, blossom, pine, snowy pine, palm, dead tree, groves) and 10 forest brushes |
| Deserts | **Desert** and **Beach sand** terrains, 18 desert symbols (cacti, dunes, mesas, pyramids, oasis…), 5 brushes |
| Different kinds of vegetation | 50 vegetation symbols (ferns, flowers, bushes, mushrooms, crops, vines, logs…), 13 brushes, **Jungle floor** and **Tundra** terrains |
| Rocky mountains | Crags, plateaus, spires, boulders, rock stacks and arches in gray, brown and red, with brushes |
| Volcanoes | Active, erupting, dormant and snow-capped volcanoes, ash cone, caldera, lava flows and pools, **Volcanic ash** terrain |
| Caverns | Cave entrance, hill cave, crystal cave, mine entrance, ice cave, sinkhole and chasm |
| Wrecked shipyards | **Wrecked Shipyard**, Ship Graveyard, Shipwreck, Small Wreck, Beached Wreck, Broken Mast, Ruined Dock |
| Castles | Castle, Fortress, Dark Castle, Castle Ruins, Fortified Tower, Fort |
| Towns and cities | Hamlet, Village, Town, Walled Town, Ruined Town, City, Capital |
| Ports and shipyards | Port, Wooden Pier, Shipyard |
| Swamps | **Swamp** terrain, 13 swamp symbols, 4 brushes |
| Ice environments | **Snow**, **Glacial ice** and **Tundra** terrains, 14 ice symbols (iceberg, glacier, igloo, ice cave…), 5 brushes |
| Others | Landmarks (lighthouse, windmill, towers, temples, standing stones, bridges), ships, sea creatures (sea serpents, kraken, whale), map decor (compass rose, scale bar, clouds, banners), rivers, roads, trails, borders and sea routes |
| Names over places | Text tool: 12 lettering styles, 7 fantasy fonts, curved text |
| More canvas | **Add canvas** dialog and the **+** handles on the map edges; undoable |
| Export the whole map as an image | Export dialog: PNG, JPEG or WebP at ×0.5 to ×4 |
| Art generated and kept apart from the code | Everything is drawn by code in the `illustrations/` workspace; new files are auto-discovered |
| Vite + React, Bootstrap, Node.js backend | ✅ (React 19, Bootstrap 5.3, Express 5) |
| README.md, PLAN.md, TECH.md; clean, ordered code | ✅ plus `illustrations/README.md`; one concept per file |
| Feels like a game, easy to add things | Tool rail, thumbnail palettes, scatter brushes, brush cursors, undo/redo, keyboard shortcuts, autosave |
| Town, city and castle interiors | Deliberately **later** (v0.2) |

## 3. v0.1 — what was done

### Foundation
- ✅ npm-workspaces monorepo: `illustrations`, `client`, `server`, plus `e2e` and `tools`
- ✅ TypeScript (strict, `erasableSyntaxOnly`), oxlint with the React hooks rules, scripts for dev, build, test and lint
- ✅ Docs: `README.md`, `PLAN.md`, `TECH.md`, `illustrations/README.md`
- ✅ Dev tooling: headless screenshot helper (`npm run shot`), art bounds checker (`npm run check:art`), art gallery page (`#/gallery`)
- ✅ Removed the placeholder files the IDE generated (`src/index.ts`, root `tsconfig.json`); they did not fit the workspace layout

### Illustrations (`illustrations/`)
- ✅ Drawing kit: seeded RNG, value noise and fBm, colour math, shapes, hatching and stippling, gradients, seamless-texture helpers
- ✅ 66 shared drawing parts (trees, peaks, buildings, ships, relief, sea, settlements…)
- ✅ Auto-discovery catalog (`import.meta.glob`) that validates ids, categories, brush items and frames
- ✅ 12 terrains with seamless tiling textures
- ✅ 239 symbols in 11 categories and 63 scatter brushes
- ✅ 5 path styles, 12 label styles, 7 fonts, 2 themes (*Wonder*, *Parchment*), 3 frames
- ✅ Art gallery page for visual checks, with a debug overlay for design boxes and anchors
- ✅ Sprite overdraw margin so soft shadows and rough edges are not cut flat

### Editor engine (`client/src/engine`, `client/src/model`, `client/src/store`)
- ✅ Document model with immutable operations; the terrain is a raster grid saved as run-length encoded text
- ✅ Undo/redo history: whole-document snapshots with structural sharing, capped by depth and memory
- ✅ Terrain renderer: organic coasts, shallow water, ripples, automatic beaches, ink outline; painted in 256 px chunks, time-sliced, at several detail levels
- ✅ Sprite cache (per symbol, variant, theme and detail level) with a pixel budget
- ✅ One scene composer shared by the editor view and the export, so the picture matches the screen
- ✅ Paths (freehand, simplified and smoothed; tapered rivers), labels (straight and curved)
- ✅ Camera: wheel zoom at the pointer, pinch, pan, fit
- ✅ Whole-map export to PNG, JPEG and WebP with progress and cancel
- ✅ Add canvas on any side

### Editor interface (`client/src`)
- ✅ Title screen with the map library, thumbnails, New world dialog (size presets, look), project file import, sample world
- ✅ Tool rail: Select, Pan, Land, Stamp, Paths, Text, Eraser, each with its own panel
- ✅ Palettes with generated thumbnails, search and category tabs
- ✅ Inspector for the selection (size, rotation, flip, look, text options, layering)
- ✅ Dialogs: Export, Add canvas, Style
- ✅ Keyboard shortcuts, status bar, brush cursors and gesture previews
- ✅ Autosave with retry, thumbnails and an unsaved-changes guard; project files (`.wondermap.json`)
- ✅ Sample world **Aldoria** (487 things) painted with the editor's own tools

### Backend (`server/`)
- ✅ Express API: list, get, save and delete maps; atomic file writes with a lock per map; input validation
- ✅ Serves the production build with a single-page-app fallback
- ✅ API tests

### Quality
- ✅ Unit, API and end-to-end tests, strict type-checking and lint (see the [verification log](#6-verification-log))
- ✅ Visual checks of every category in the gallery and of whole maps against `map_examples/`

## 4. What is left

### 4.1 Polish and known issues (small)
- ⬜ The Inspector can cover the **+** chip on the right edge of the map
- ⬜ The workspace colour behind the map (`#262b33`) is slightly bluish; a neutral dark would suit the parchment theme better
- ⬜ Town names are small when the map is fully zoomed out
- ⬜ Art that deserves another pass: the **Wizard Tower** draws a green base even on snow; **Ice Mountain** streaks look like drips; **Rock Arch** has a heavy outline; **Glacier** is pill-shaped; the fin variants (5 and 6) of **Sandstone Spires**
- ⬜ Symbols that would round out the set but are not drawn yet: fishing village, camp, graveyard, dragon lair, ruined columns, signpost, battlefield, flying dragon
- ⬜ Split the JavaScript bundle (1.06 MB, 354 kB gzipped): load the gallery and dialogs on demand

### 4.2 Improvements to consider
- 💡 **Random world generator** ("Random world" on the title screen): noise-based continents painted into the terrain layer, then seeded forests, ranges and names. Left out of v0.1 on purpose; the terrain layer and the scatter brushes are the building blocks
- 💡 Layers panel with lock and opacity, and a transform box for multi-selections
- 💡 Text along rivers and roads
- 💡 Optional hex grid and a distance ruler
- 💡 Tile-based terrain rendering for very large maps (> 40 megapixels)
- 💡 Authentication and per-user libraries (the server has no login today)
- 💡 Community art packs: a plug-in format for illustration folders
- 💡 More creature packs (sea serpents, a kraken and a whale already exist)

### 4.3 v0.2 — Settlement maps
Zoom into a town, city or castle symbol and open a linked **settlement map**.

- ⬜ **Model:** `MapDocument.kind` becomes `'world' | 'settlement'`; symbols get an optional link to a map; schema version 2 with a migration in `parseDocument`; the server list endpoint reports `kind` and parent
- ⬜ **Editor:** *Open town map* in the Inspector of a settlement symbol (creates the linked map from a template), breadcrumb back to the world map, a settlement size preset
- ⬜ **Art** (new categories in `illustrations/`): houses with several roofs, streets and paths, trees and vegetation (reuse), merchants and market stalls, ports and docks, people, carts and wheels, commerce, farms, animals and livestock, sellers, stone walls with gates and towers, fences, wells, bridges
- ⬜ **Terrain:** cobblestone, dirt and grass terrains for the same layer engine; streets as path styles
- ⬜ **Optional:** a generator for the first street layout

### 4.4 v0.3 — Dungeon maps
- ⬜ Grid-based rooms, corridors, doors, stairs, traps and props
- ⬜ A renderer that suits a grid; fog-of-war export for virtual tabletops

## 5. Decisions log

| Decision | Reason |
|----------|--------|
| Canvas 2D, no SVG, DOM nodes or WebGL | Thousands of symbols must draw and export quickly; no heavy dependency; the export reuses the live drawing code |
| All art is code, one file per illustration, in its own workspace package that never imports app code | The brief asks for it; new art is discovered by folder, so adding Sea Serpents later touches no other file |
| Terrain is a **raster grid** (4 px cells, run-length encoded on disk), not a list of brush strokes | Undo is a snapshot swap, a stroke costs the same however long the history, expanding the canvas is a copy, and loading never replays thousands of strokes |
| Undo history = whole-document snapshots with structural sharing | Simple and robust; unchanged item arrays are shared; terrain copies are capped at 160 MB |
| Terrain painted in 256 px chunks, time-sliced, at several detail levels | The window stays responsive on big maps, and only the visible area is painted |
| Sprites carry an overdraw margin beyond their design box | Soft shadows and rough strokes are not cut flat; `npm run check:art` flags art that spills further |
| One editor store (Zustand); tools are closures behind a small `Tool` interface | Tools outside React can read the state; easy to test; no class hierarchy |
| Hash router (one small file, `utils/router.ts`) | No dependency and no server routing rules; there are only three pages (title screen, editor, art gallery) |
| Files under `/assets` are cached for a year, everything else is revalidated | Vite puts a content hash in every asset name, so a new build is picked up on the next load and nobody is served a stale app shell |
| The server treats a map as opaque JSON | The client owns the schema and its migrations; the backend stays small and stable |
| Fonts from `@fontsource` | Bundled, offline, SIL Open Font License |
| oxlint instead of ESLint | Fast and zero-config, and it ships the React hooks rules |
| End-to-end tests run on the installed Edge | No browser download is needed on a Windows development machine |
| No random generator in v0.1 | The brief is about painting; it is listed as an idea above |

## 6. Verification log

Last full run, on the final code of v0.1:

| Check | Result |
|-------|--------|
| `npm run build` | ✅ client bundle 1,061 kB (354 kB gzipped), styles 351 kB (61 kB gzipped) |
| `npm run typecheck` (illustrations, client, server, e2e) | ✅ no errors |
| `npm run lint` (oxlint, 293 files) | ✅ no errors, no warnings |
| `npm test` | ✅ illustrations 22, client 260 (13 files), server 13 (2 files) |
| `npm run test:e2e` (real Edge, production build) | ✅ 15 of 15 |
| Browser console while using every tool | ✅ no errors or warnings |
| Visual checks | ✅ gallery, whole sample map, exported PNG, compared with `map_examples/example_02.jpg` |

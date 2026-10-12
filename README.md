# SwimCoach PWA

SwimCoach is a local-first Progressive Web App for swimming coaches. It imports weekly training plans from Excel, lets coaches select exercise rows, runs a group-start stopwatch with swimmer switching, stores split results, supports timing corrections, tracks training zones, and exports results to CSV.

The app is designed primarily for **tablet use in landscape mode** at poolside.

## Current status

This README describes the application after the completed work through:

- Initial PWA/static app setup
- Excel plan parser and plan viewer
- Stopwatch/results workflow
- Athlete management
- Zone tracking
- Plan management

The app is still local-first. It does **not** currently include cloud sync, real user accounts, authentication, server-side storage, or multi-device collaboration.

## Core concept

The app is built around this coaching workflow:

```text
Import weekly plan
Select day and session
Select exact exercise row
Run a Live Training session
Switch swimmers while one global stopwatch runs
Take splits for each swimmer
Correct mistakes
Finish exercise
Review/export results
Track zone completion
```

## Project structure

```text
.
├── index.html              # Main HTML shell
├── style.css               # Application styles
├── app.js                  # Main application logic
├── backup.js               # Backup format validation
├── vendor/sheetjs/          # Pinned Excel parser and license
├── tests/                  # Node regression tests
├── manifest.json           # PWA metadata
├── sw.js                   # Service Worker cache logic
├── vercel.json             # Vercel headers for Service Worker/app updates
└── README.md               # Project documentation
```

## PWA installation

### Android / Chrome

1. Open the deployed app URL.
2. Open Chrome menu.
3. Select **Adicionar ao ecrã inicial** or **Instalar app**.
4. Launch the installed app.
5. Use the tablet in landscape mode.
6. Load the plan before poolside use.

### Important PWA note

The app ships SheetJS Community Edition **0.20.3** locally in `vendor/sheetjs/`. It includes the fixes for CVE-2023-30533 and CVE-2024-22363. The service worker caches the parser and backup code with the application, so spreadsheet imports work offline after a successful initial load/cache. There is no runtime XLSX CDN dependency.

See [vendor provenance and upgrade instructions](vendor/sheetjs/README.md). First-time loading of the app still needs a connection. Installed-PWA update activation and physical-tablet testing remain follow-up work.

## Browser storage model

All app data is stored locally in the browser using `localStorage`.

Stored data includes:

- athletes;
- imported weekly plan;
- selected exercise;
- active Live session;
- saved results;
- zone logs;
- plan metadata.

This means:

- data is private to the browser/device;
- data does not automatically sync between tablets;
- clearing browser data can delete the app state;
- reinstalling the PWA or changing browser profile may lose local data;
- full JSON backup/restore is available in **Gerir plano**; CSV exports results for spreadsheets.

## Excel import format

The parser expects the SwimCoach training-plan spreadsheet layout.

| Field | Column | Notes |
|---|---:|---|
| Day header | A | Example: `SEGUNDA-FEIRA`, `TERÇA-FEIRA` |
| Pool | B | Example: `P25` or `P50` |
| Morning zone/block | C | Zone or block header |
| Morning description | D | Exercise description |
| Morning cycle/rest | L | Cycle / rest interval |
| Morning meters | O | Exercise meters |
| Afternoon zone/block | S | Zone or block header |
| Afternoon description | T | Exercise description |
| Afternoon cycle/rest | AB | Cycle / rest interval |
| Afternoon meters | AE | Exercise meters |

Supported day headers:

```text
SEGUNDA-FEIRA
TERÇA-FEIRA / TERCA-FEIRA
QUARTA-FEIRA
QUINTA-FEIRA
SEXTA-FEIRA
SÁBADO / SABADO
DOMINGO
```

Supported zones:

```text
TT, A1, A2, A3, M.AER, LAN, M.ANA, VEL, PML, TL
```

Supported block headers:

```text
AQUECIMENTO
TAREFA 1
TAREFA 2
TAREFA 3
RECUPERAÇÃO / RECUPERACAO
FOLGA
```

## Screens

### Plano

The Plan screen is used to inspect and manage the imported training plan.

It supports:

- importing `.xlsx` / `.xls` weekly plans;
- switching between days;
- switching between **Manhã** and **Tarde**;
- viewing exercise blocks and exact exercise rows;
- selecting an exact exercise row;
- displaying the selected-exercise banner;
- manually adding blocks/exercises;
- opening **Gerir plano**.

Selecting an exercise row makes it the active exercise for **Cronómetro** and **Live**.

### Live

The Live screen is the main poolside workflow.

It supports:

- two-column tablet-landscape layout;
- plan/exercise list on the left;
- selected exercise and timing tools on the right;
- exact exercise selection;
- one global stopwatch per exercise;
- swimmer chips;
- swimmer switching while the stopwatch keeps running;
- swimmer-specific split button, for example `Split João`;
- per-swimmer split lists;
- active-session autosave;
- finishing an exercise and saving all swimmers with splits.

The Live screen is designed for the common case where swimmers start together, but the coach times one swimmer at a time.

### Cronómetro

The Cronómetro screen is a simpler stopwatch workflow connected to the selected exercise.

It is useful for simple timing, but the Live screen should be treated as the main coaching interface for group-start training.

### Zonas

The Zonas screen compares planned vs completed training volume by zone.

It supports:

- planned meters from the imported plan;
- completed meters from manual entry;
- automatic completed-zone logging when a Live exercise is finished;
- progress bars by zone;
- total planned/completed meters;
- clearing individual zone logs.

Important behaviour:

```text
When a Live exercise is finished, the exercise meters are added to Zonas once.
```

Example:

```text
Exercise: A2, 800m
Timed swimmers: João, Marta, Rui
Zone log: A2 +800m
```

It does **not** add `800m` per swimmer. Zonas represent training-plan completion, not total athlete-volume.

### Atletas

The Athletes screen supports:

- adding swimmers;
- assigning an optional group label;
- removing swimmers;
- using swimmer names as chips in Live Training;
- attaching saved results to swimmers.

### Resultados

The Results screen supports reviewing, correcting, deleting, and exporting saved results.

It includes:

- result cards grouped by saved result/session;
- athlete, exercise, day/session, block, zone, pool, split distance, and target metadata;
- split rows with cumulative time, lap time, repetition/distance marker, and target delta;
- correction indicators for edited splits;
- CSV export.

## Plan management

The app includes a **Gerir plano** flow.

### Carregar/substituir plano

Use this when the wrong plan was imported or a corrected weekly plan is available.

Keeps:

- athletes;
- saved results.

Replaces or updates:

- weekly plan;
- zone plan;
- selected exercise;
- plan-related state.

### Limpar plano atual

Use this when the week ends or when the current plan should be removed.

Clears:

- weekly plan;
- planned zones;
- logged zones;
- selected exercise;
- inactive Live session state;
- week label.

Keeps:

- athletes;
- saved results.

### Apagar todos os dados

Dangerous full reset.

Clears:

- plan;
- athletes;
- results;
- zones;
- selected exercise;
- active session.

Requires typing:

```text
APAGAR
```

## Timing model

The Live Training screen uses one global stopwatch per selected exercise.

Each split is attached to:

- exercise snapshot;
- active swimmer;
- global cumulative timestamp;
- swimmer-specific lap time;
- split distance;
- calculated split number;
- repetition and distance marker when possible;
- target comparison when possible.

Swimmer split sequences are independent.

Example:

```text
João has 3 splits
Marta has 1 split
Marta's next split is still her own split 2, not the global split 4
```

Lap time is calculated per swimmer:

```text
lap = current cumulative time - previous cumulative time for the same swimmer
```

## Reliable records and recovery

Finished Live sessions are read-only. Use **Resultados** to correct saved splits; the original cumulative time, correction marker, and latest correction timestamp survive finishing and CSV export. Choose **Iniciar próximo exercício** before starting another Live session.

Plans and exercises now have persistent identities. Replacing a week cannot silently attach old results to new rows. The result editor defaults to **Manter exercício atual**; choose another exercise explicitly to reassign it. Existing data is migrated automatically, preserving historical snapshots and active sessions. Historical results whose original plan cannot be identified stay detached until explicitly reassigned.

If local storage fails, a persistent warning offers **Tentar guardar** and CSV export. Keep the page open until saving succeeds or a full backup has been downloaded. Changes remain in memory, but closing the page can lose them. Use **Descarregar cópia** in the warning to preserve all current in-memory data, including unfinished splits. CSV still exports result records only.

CSV now handles quotes, commas and multiline text correctly. Formula-leading text is prefixed with an apostrophe for spreadsheet safety, and the final `CorrigidoEm` column contains the latest correction timestamp when available. Older correction metadata that was already lost cannot be reconstructed.

## Development and checks

Serve this directory with a static HTTP server, for example:

```sh
python3 -m http.server 8000
```

There is no application dependency installation or build step. Run regression tests with Node 24:

```sh
node --check app.js
node --check backup.js
node --check sw.js
node --test tests/*.test.cjs
```

Pull requests run these checks in GitHub Actions. The tests cover record reliability, import validation, XLSX/XLS reading, backup round trips, invalid restores, storage failures, and vendored-library integrity. App tests use simulated browser APIs; workbook tests read actual generated binary workbooks. Real tablet and offline-update testing remains necessary before deployment.

See [the phased implementation plan](docs/implementation-plan.md) for migration details, validation scope, and the completed import/recovery work and remaining offline-update, timer and accessibility work.


## Safe plan imports

Import `.xlsx` or `.xls` files up to **10 MB**, with no more than **10,000 rows / 256 columns** on the first worksheet. Only the first worksheet is used, with the column layout above. Files without recognized exercises or explicit `FOLGA` entries are rejected before replacing a plan. Rest-day-only plans are valid.

Repeated headers for the same day append exercises in spreadsheet order, with a warning in the import preview. Conflicting pool sizes for one day reject the import; accumulation with an existing plan also rejects conflicting pools. Planned zone totals are recalculated from the resulting exercise rows, excluding block headers. Invalid/negative distances are rejected. Importing or restoring cannot replace an active Live session with times.

## Full backup and restore

In **Plano → Gerir plano**, choose **Descarregar cópia de segurança** to download a JSON backup. It includes athletes, the full plan and IDs, zone totals/logs, results and correction metadata, selected exercise/athlete, and any Live session with unfinished splits. It reads current memory, so it can preserve changes even when local storage is full.

A running timer continues on the original page. The backup captures its elapsed time and restores the session **paused**; time spent away from the app is not added. Resume timing explicitly after restoring.

Choose **Restaurar cópia de segurança**, select the JSON file, review its counts, and type **RESTAURAR**. This replaces all local data, rather than merging it. The preview offers a download of the current data first. Cancel leaves data unchanged. Validation and a successful single local-storage write precede replacement; if storage is full or unavailable, the current data stays intact.

Backups use the versioned `swimcoach-backup` format, version **1**, and are limited to **10 MB**. Unknown versions, malformed structures, duplicate IDs and unsafe identifiers are rejected. Raw localStorage dumps and CSV files are not restore formats. Backups are unencrypted files containing athlete names and training data; store them appropriately. They do not include cached app code or recover data already lost before export.

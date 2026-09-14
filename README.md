# Common Ground volunteer training

Local-only, reusable volunteer-training prototype. Working identity, original content. No account, backend, public deployment, official certificate issuance or operational policy.

## Run

`npm start` serves `dist` at http://127.0.0.1:4173. Requires Python 3. Keep this process running while testing. `npm run check` checks JavaScript syntax; `npm test` runs the state/scoring tests with Node.js. No install or compilation step is needed.

## Included

- Responsive library with six core modules and two future role modules. One module is available.
- Working with leaders and each other: six sequential theory sections with examples and reflections. Each next section unlocks only after “Mark as read & continue”.
- A separate test-ready screen, then eight applied questions shown one at a time with a persistent 10-minute timer.
- Pass rule: at least six correct (75%). One unsuccessful first attempt allows one retake; a second failure resets theory progress and locks the test until all six sections are completed again.
- Feedback, related theory, retry limits, a complete local test-attempt history, profile progress and refresh persistence.
- Overall certificate requirements and disabled download. It cannot unlock while five required modules are unavailable.
- Local browser storage only (`common-ground-training-v1`). About page includes an optional reset with confirmation. This is not a trusted or tamper-resistant training record. Different hostnames/browsers have separate progress.

## Content boundaries

All activity coordinator roles are explicitly illustrative. Local contacts, escalation arrangements, policies and readiness must be agreed by each organisation before use. Content is a prototype requiring organisational review. Completion is separate from role authorisation.

Public NCVO role guidance informed the principles of clear responsibilities and support. All lesson and test wording is original. Uxcel homepage and public course catalog were visually inspected: white surfaces, dark type, purple actions, rounded light-border cards and compact metadata. Uxcel login was accessible, but signed-in learning screens were not; this is not a pixel-exact recreation or affiliated product.

## Files

- `dist/content.js`: lessons, questions, scoring and persistence validation
- `dist/app.js`: learner views, routing and events
- `dist/styles.css`: responsive presentation
- `tests/progress.test.js`: deterministic state and scoring checks
- `TEST-REPORT.md`: actual validation and remaining limits

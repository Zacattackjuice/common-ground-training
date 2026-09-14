# Validation — 13 September 2026

The flow was revised after the original report. Current checks cover sequential section locking, separate module/test actions, a test-ready screen, one-question test pages, a 10-minute timer, full local test history and the two-failure theory reset.

## Passed automated checks

- JavaScript syntax: app.js and content.js.
- Six Node test cases: all 256 correct/incorrect combinations; exact passing boundary and theory requirement; timer/attempt constants; active-test JSON roundtrip; forged future-section bounds; invalid/old state reset.
- No framework/build dependencies; authored static files are the deliverable.

## Passed real browser checks (Codex in-app browser)

- Direct assessment link before theory shows an explicit gate.
- Confirmed a direct URL to section 6 resolves to the first unread section, with one available section and five visibly locked.
- Confirmed the library uses separate Module and Test actions: Module opens the overview, Test opens the preparation screen only after theory completion, and Test is muted again after the lockout reset.
- Completed all six theory sections through the required “Mark as read” buttons.
- Confirmed the final theory button opens a separate “Ready for your final test?” screen rather than entering the test.
- Refresh after three sections retained read count and current lesson.
- Incomplete assessment submission did not proceed.
- Confirmed the test presents one question at a time, advances only after an answer, and does not expose a back control.
- Confirmed the timer starts at 10:00 and retains its countdown and question position through refresh.
- Two consecutive failed attempts exhaust the initial attempt plus one retake; the second resets theory progress to 0/6 and returns the learner to section 1.
- Completing all six sections again restores two attempts.
- Confirmed both failed submissions appear as separate, timestamped 3/8 records in Test history and both remain after refresh.
- Profile showed 1/6 core modules complete, 6/6 theory, best score 6/8.
- Certificate after pass remained disabled and explicitly showed five upcoming core requirements.
- Subsequent failed retry retained the earlier pass and explained this.
- Keyboard ArrowRight selected the next radio answer with visible focus treatment.
- Skip link focuses main content without changing the current route (bug found and fixed).
- At 320 px all seven view types had document width equal to viewport width, with no horizontal overflow. At 390 px library and assessment were visually inspected. At 768 px library had no overflow.
- Desktop lesson view visually inspected; desktop catalog reviewed separately.
- Console log check returned no warning/error entries during the tested flow.

## Limitations

- Not an exhaustive browser/device or assistive-technology certification. No screen-reader audio audit or physical phone test.
- Storage access failures are caught and shown as warnings; blocked-storage environment was not simulated in the UI. Malformed state handling was unit tested.
- Reset confirmation interaction was affected by browser tool state changes; do not claim a completed cancel-path check. The final browser state was fresh with zero progress.
- One complete module only; overall certificate intentionally unavailable. No administrator interface, authentication or server-verified record.
- Each organisation should review wording and establish real support/reporting routes before operational rollout.
- The 10-minute expiry branch is implemented as automatic submission but was not tested by waiting the full ten minutes in the browser.
- Uxcel signed-in lesson/test UI was inaccessible without login. Fidelity is to the public catalog’s visual language, with original typographic course tiles rather than copied illustrations.

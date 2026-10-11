# Contributing

## Principles

- Keep platform-specific logic inside `src/content/platforms.js`
- Prefer adding a new extraction strategy before changing existing fallbacks
- Add or update a fixture test for every adapter change
- Do not merge selector-only fixes without a failing test or fixture update
- Live structure drift is detected against committed baselines in `tests/baselines/`:
  the daily live-smoke run compares strategy, source, authors, and message count per
  target and reports `DRIFT` when the live page shape changes. A drift failure means a
  selector fix is needed; re-record a baseline only after confirming the new shape is
  correct (`SMOKE_RECORD_BASELINE=1`). Prefer public share URLs for baselines where the
  platform serves them anonymously (ChatGPT `/share/`); cookie-authenticated URLs need
  the repo secrets.

## Development

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Run `npm test`.
4. Load the extension as unpacked in a Chromium-based browser.

## Pull requests

- Describe which platform changed
- Include the extraction strategy affected
- Mention the fixture or real page shape the change covers
- Keep unrelated formatting or refactors out of the patch
- If the change affects export quality, include before/after output snippets

## Compatibility checks

- `CI` runs on every push and pull request
- `Daily Compatibility` runs on a daily schedule and opens an issue if the suite fails

# Pocket Miles agent handoff

This is the continuation guide for developing Pocket Miles on another machine. Start with current repository state and the user's next request. The project is a standalone, installable web app with a public static frontend and private, profile-scoped data service. It is independent of ChatGPT hosting.

Prepared **6 November 2026**. The companion [new-device setup guide](new-device-setup.md) lists clone commands, access requirements and optional local files to transfer.

## Repositories and checkpoint

| Repository | Responsibility | Starting branch |
| --- | --- | --- |
| [joellimrl/pocket-miles](https://github.com/joellimrl/pocket-miles) | Public frontend, rules, static references, tests and Pages publishing | `main` |
| [joellimrl/streetBot](https://github.com/joellimrl/streetBot) | Private shared backend: Express, Grammy Telegram bot, credentials and MongoDB | `main` |
| [joellimrl/spendingsReport](https://github.com/joellimrl/spendingsReport) | Optional transaction-history source for manually prepared baseline files | `main` |

Clone as sibling folders if convenient. The portfolio repo `joellimrl.github.io` and old prototype folders are not required. Do not copy an old `streetbot-pocket` checkout over current StreetBot: unrelated backend work has continued since the original integration.

At this checkpoint:

- Frontend release: **v3.8.1**, published on 27 October 2026. [PR #14](https://github.com/joellimrl/pocket-miles/pull/14) merged as `315fca72ab1a232201ce418add083726132d4dca`.
- Its [Pages deployment](https://github.com/joellimrl/pocket-miles/actions/runs/40516106747) succeeded. All 78 frontend tests passed at that release; browser layout was checked at 320px and 390px. These are historical checks, not a substitute for validating new changes.
- StreetBot remote `main` inspected on 6 November was `c51a5e8d6375241c4bc7e1a49101ab96b20cf4ab`. This is a source checkpoint, not a pinned dependency or proof of the current Fly revision.
- No unfinished application change is being handed over. This handoff adds documentation only; the next task is whatever the user requests.
- Re-check remote heads, pending PRs and local changes before starting. Work from current `main`, not the historical release hashes.

Some older backend prose still says the components are undeployed or describes an earlier rollout. The app is live; consult current code and workflows for operations. `package.json`'s `0.3.0` is not the UI release label; the UI and service worker currently identify v3.8.1.

## Product requirements to preserve

The primary action is: select cards once, type a merchant, then see the best card for each applicable payment method at a glance. Keep the interface compact and focused on the user's wallet.

1. Show every selected wallet card in rows. Columns appear together, without an extra-methods disclosure, in this order:
   - Google / Apple Pay tap
   - Google / Apple Pay online
   - Online direct card
   - Physical card tap
   - Physical card insert
2. Keep the online-wallet and direct-card routes distinct. Phone and physical-card tap share contactless calculations, but online wallet checkout has its own flag and may earn differently.
3. Preserve applicable-route filtering: online-only merchants show the two online columns; SimplyGo shows phone/card taps; taxi terminals also allow insert. These are heuristics, not verified merchant acceptance data.
4. Rank included options by miles and highlight each column's top pick. With an amount, include modelled caps and rounding. Row order uses the highest available miles across methods. Fees are shown separately and only break ties; this is not a net-value optimiser.
5. **Amaze + Citi appears only for foreign-currency payments**, when enabled and Citi is selected. Never restore it as an SGD recommendation merely because it earns more miles. Keep the saved pairing setting so changing currency restores the foreign option.
6. One-off checks default to not saving. Saving is explicit. The 500-entry limit applies to saved merchants per profile, not searches or one-off checks.
7. Owner and spouse have separate wallets, merchants, revisions and device connections. No public signup; the owner creates profiles through Telegram.
8. Keep the quick guide separate from the detailed sheet. They are public reference tools and do not load or update the user's saved wallet.

The supported catalogue is HSBC Revolution, Citi Rewards, KrisFlyer UOB and Trust Freedom, plus optional Amaze/Citi pairing. Personal card selections and qualification settings live in the notebook; do not hardcode a user's settings into public code.

## Architecture and data flow

```text
GitHub Pages: static app shell and rules
  Browser / home-screen app
    merchant search + saved wallet -> local recommendation engine -> comparison
    explicit save / load -> signed HTTPS request
      StreetBot on Fly: authenticate device and derive profile
        validate notebook and expected revision
          MongoDB: pocketMiles + existing apiAuthKeys credential collection

Owner's private Telegram chat
  /pocket commands -> short-lived setup key -> browser pairing
```

Live addresses:

- [App](https://joellimrl.github.io/pocket-miles/)
- [Quick guide](https://joellimrl.github.io/pocket-miles/quick.html)
- [Detailed sheet](https://joellimrl.github.io/pocket-miles/detailed.html)
- [App updater](https://joellimrl.github.io/pocket-miles/update.html)
- API base: `https://streetbot.fly.dev`

The browser calculates recommendations. StreetBot validates and stores notebooks; it does not calculate rewards, fetch live MCCs or call an LLM for searches. Typing an amount does not record a purchase or consume an allowance.

The service worker caches the static app shell. After a successful load, a separate credential-bound local cache supports offline lookups. Saving requires a connection; there is no offline write queue. Notebook PUTs replace the whole notebook with an expected revision. Conflicts return 409 and require refresh/review rather than overwriting another device's change.

## Code map

Paths in this table are relative to their repository.

| Repo and path | Purpose |
| --- | --- |
| `pocket-miles/public/app.js`, `index.html`, `style.css` | Pay, Places and Wallet UI; card comparison rendering |
| `pocket-miles/public/payments.js` | Shared five-route definitions, ordering and applicable methods |
| `pocket-miles/public/rules.js`, `recommend.js` | Categories, sources, rates, eligibility, caps, rounding and ranking |
| `pocket-miles/public/merchants.js` | Notebook/settings/merchant validation and search helpers |
| `pocket-miles/public/store.js`, `device.js` | Sync, profile-bound cache, credentials and browser signatures |
| `pocket-miles/public/quick.*` | Static quick reference; update affected cells when rules change |
| `pocket-miles/public/detailed-model.js`, `detailed.js`, `detailed.html`, `detailed.css` | Public interactive detailed sheet using the shared engine |
| `pocket-miles/public/baseline.js`, `baseline-ui.js` | Review and import prepared merchant suggestions |
| `pocket-miles/public/sw.js`, `update.html`, `update.js`, `updater.js` | Offline shell version and credential-preserving update flow |
| `pocket-miles/scripts/preview.mjs` | Loopback-only preview and isolated local notebook |
| `pocket-miles/scripts/build.mjs` | Explicit public-asset allowlist copied to `dist/` |
| `streetBot/feat/pocketMiles/index.js` | Routes, notebook operations and owner Telegram commands |
| `streetBot/feat/pocketMiles/devices.js`, `profiles.js` | Device binding/proofs and profile resolution |
| `streetBot/feat/pocketMiles/shared/*.mjs` | Copies of frontend validation dependencies |
| `streetBot/feat/server/auth/config.js`, `streetBot/feat/server/auth/credentialStore.js`, `streetBot/feat/server/expressAuth.js` | Endpoint policies, credential registry and middleware |
| `streetBot/app.js`, `db.js` | Existing shared application wiring and database helpers |

Read [backend.md](backend.md) for the fuller contract and migration history. Read the actual current modules before edits; historical test counts in older prose may be stale.

## Authentication and profiles

- `POST /pocket-miles/device` pairs a browser. `GET` and `PUT /pocket-miles/notebook` load/save its profile.
- `/pocket` issues an owner setup key valid for 15 minutes. The browser generates a non-extractable ECDSA P-256 private key in IndexedDB, proves possession during pairing and receives a connection without automatic expiry.
- Requests carry the opaque `X-Auth` credential plus an `Authorization: PocketDevice ...` proof covering request method, route, timestamp, nonce and body digest. Preserve replay checks and the 90-second timestamp window.
- The credential registry stores a secret hash and public key; the browser retains its private key and credential. This is browser-storage binding, not hardware attestation. Copying the setup key alone cannot transfer access.
- The server derives the profile from the credential. Clients cannot select another profile through request parameters. The existing owner document remains `_id: owner`; other notebooks use `_id: profile:<id>` in `pocketMiles`.
- Commands: `/pocket`, `/pocket create spouse`, `/pocket connect spouse`, `/pocket profiles`, `/pocket devices`, `/pocket devices spouse`. Creation, connection issuance and revocation stay owner-only in a private chat.
- Each browser/profile holds one connection. Another computer or separate iOS home-screen storage needs a fresh pairing. JSON backups omit access credentials.
- Disconnect removes local access/cache; Telegram revocation removes server access. Preserve separation between profiles, including delayed responses and other tabs.

## Local development and safe validation

For the frontend, use Node >=22.9.0 (CI currently pins 22.9.0):

```sh
cd pocket-miles
npm ci --ignore-scripts
npm test
npm run build
npm run dev
```

Preview: `http://127.0.0.1:8741/pocket-miles/`. It stores only ignored `data/preview.json` and needs no production key. In PowerShell, an alternate port is `$env:PORT='8742'` before `npm run dev`; in a POSIX shell use `PORT=8742 npm run dev`. Stop it when done. Do not mistake preview data for the synced wallet.

Before any backend work, read `streetBot/AGENTS.md`. In particular:

- Never read, print, commit or modify `.env`.
- Do not run `npm start` as a smoke test: it can start Telegram polling, cron jobs and MongoDB operations.
- Do not use the backend's `npm test` placeholder or run arbitrary `tests/` scripts; some are live integration scripts. Read the chosen tests first.
- Preserve existing auth scopes, protected collections and unrelated bot integrations.

The Pocket Miles workflow currently uses these targeted offline tests (in `streetBot`):

```sh
node --test tests/pocketMiles.test.js tests/pocketDevices.test.js tests/pocketProfiles.test.js tests/authConfig.test.js tests/authKeyRevocation.test.js
```

They use injected/mock boundaries. Also syntax-check changed JavaScript files with `node --check path/to/file.js`. Follow current workflow requirements for broader backend changes; new-device setup itself requires no live service startup or secret retrieval.

## Rules and schema maintenance

The rules snapshot is **23 October 2026**; the quick guide's sources were marked checked **25 October 2026**. The handoff date is not a new verification of bank terms. Before changing rewards, verify current primary bank/issuer terms, eligibility, caps, exclusions, rounding and effective dates. Do not treat stored merchant categories as confirmed MCCs without evidence.

The stored merchant method has only `tap`, `online` and `insert`, plus a separate boolean `onlineWallet`; the five comparison routes map onto those existing fields. Currency is `sgd` or `foreign`. Notebook version is currently 1. Avoid introducing five persisted method values just because the UI shows five columns.

Frontend `rules.js`, `recommend.js` and `merchants.js` have corresponding backend copies in `feat/pocketMiles/shared/`, using `.mjs` import extensions. New card/category/schema values must be accepted by the backend before the frontend saves them. Pure rate changes affect browser calculations, but still require checking the static quick guide, detailed sheet, sources and boundary tests for consistency.

No automatic bank rule updates, live MCC lookup, transaction feed or automatic cap ledger exists.

## History baseline and private data

`spendingsReport/data.csv` was used to prepare merchant suggestions, not a live integration. Places → Add from history accepts `format: "pocket-miles-merchant-baseline"`, `version: 1`, a `profileId`, `source`, `asOf` and candidate list. The user reviews selections before saving. Import skips existing matches, preserves wallet settings and keeps categories unconfirmed; a different profile's baseline is rejected.

Personal baseline JSON, analysis and the one-off generator were kept outside both application repos. Their old task-relative paths are `outputs/pocket-miles-baseline.json`, `outputs/baseline-analysis.json` and `work/build-merchant-baseline.py`. A fresh clone does not contain them. They are optional; already imported merchants are in the live notebook. If regenerating, inspect the script's hardcoded input/output paths and date before use; it was not packaged as a portable app command.

Keep raw history, private exports, credentials and generated personal data out of the public frontend repository and `dist/`. Public quick/detailed pages contain catalogue assumptions, not authenticated wallet data.

## Releases and rollback

Frontend:

1. Start a branch from current `main`, implement and review the focused change.
2. Run appropriate tests and `npm run build`. Inspect UI changes at phone widths and verify payment-route order, online-only merchants, amount/cap behaviour and foreign/SGD Amaze visibility when relevant.
3. For a runtime release, update UI version labels and the cache name in `public/sw.js` together. Documentation-only edits need neither a version bump nor Pages publication.
4. Open a PR, wait for its checks and merge after review.
5. To publish a runtime change, manually run `.github/workflows/pages.yml` (**Publish Pocket Miles**) on `main`. Merging alone does not deploy. Only the allowlisted `dist/` assets are published.
6. Confirm the workflow succeeds and live assets match the build. Use the app's Update app entry; do not clear browser storage to fix a stale shell, as that removes pairing data.

Backend:

- `.github/workflows/fly.yml` deploys on pushes to StreetBot `main`, including merges. It runs Pocket Miles/auth checks and other shared-service checks before deploying the existing `streetbot` Fly app in Singapore.
- Treat merging backend changes as a production deployment affecting the shared bot. The clone does not require a new Fly app, MongoDB database, Telegram bot or production secrets.
- For coordinated schema changes, deploy compatible backend support before the frontend. Current shared-service workflow files are authoritative.
- Before reverting to code that lacks profile isolation, revoke all non-owner credentials. Before reverting to code that lacks browser-proof enforcement, revoke all paired Pocket Miles credentials. Old handlers could otherwise weaken access controls. Preserve notebook data.

## First steps for the next agent

Read this handoff, the frontend README, and applicable repo instructions. Check both repos' current branch/status and fetch current `main` without overwriting local work. Establish the user's next requested change, use the safe frontend preview, and limit backend work to the features it needs. Keep personal data and device keys out of commits. Do not recreate the already deployed infrastructure merely because this is a new machine.

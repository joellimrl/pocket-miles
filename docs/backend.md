# Pocket Miles backend changes

This document describes the proposed Streetbot changes in [backend PR #1](https://github.com/joellimrl/streetBot/pull/1). They remain undeployed while under review.

## Responsibilities

The standalone [pocket-miles repository](https://github.com/joellimrl/pocket-miles) owns the interface, installable PWA, merchant matching and card-recommendation rules. GitHub Pages serves its public files at https://joellimrl.github.io/pocket-miles/.

Streetbot remains the private data service running on Fly. It authenticates devices, validates the notebook, and reads/writes the existing MongoDB database. It does not calculate the best card, look up a bank account, fetch live MCCs or call an LLM when a merchant is typed.

The project-site URL is the same as the originally proposed portfolio subdirectory. The API URL and allowed browser origin therefore stay the same. A standalone repository gives the frontend separate ownership and releases; it does not create a second Fly service.

## Exact code changes

| File | Change |
| --- | --- |
| app.js | Imports the feature module, registers the /pocket bot command, and mounts its two Express routes. |
| db.js | Adds pocketMiles to the existing internal/protected collection registry. Reuses the existing MongoDB client. |
| feat/server/auth/config.js | Adds the pocket-miles consumer plus read/write endpoint policies, scopes and rate limits. The existing policy-derived CORS methods then include PUT. |
| feat/pocketMiles/index.js | New route handlers, revision checking and owner-only connection-key command. |
| feat/pocketMiles/shared/merchants.mjs | Shared notebook/merchant/settings validation. |
| feat/pocketMiles/shared/recommend.mjs | Card identifiers and empty-wallet defaults used by validation. |
| feat/pocketMiles/shared/rules.mjs | Category identifiers and settings dependencies for that shared model. The backend does not invoke recommendations. |
| tests/pocketMiles.test.js | Nine isolated tests of the new handlers, access configuration and connection command. |
| .github/workflows/fly.yml | Runs syntax checks and 16 targeted offline tests before the existing Fly deployment step. |
| feat/pocketMiles/README.md | Setup, deployment, rollback and validation notes. |

The credential registry, scrypt implementation, key revocation handler, rate limiter, CORS machinery and cleanup job already exist and are reused. Their implementation is not replaced by this feature.

## Connecting a device

1. The owner sends /pocket in a private Telegram chat with Streetbot.
2. The command checks that both the chat ID and sender ID match the configured owner. Other users and group chats cannot issue keys.
3. Streetbot generates a random registry key. A salted scrypt hash is saved in the existing apiAuthKeys collection; the full secret is not stored there.
4. The saved record contains the key ID, pocket-miles consumer, device name, endpoint grants, scopes, active/revoked status, creation/expiry dates and normal registry usage metadata.
5. The bot replies with the copyable key, app URL, 90-day lifetime and an individual revoke button.
6. Paste it into the app once on that device. The browser checks it against the notebook endpoint before remembering it.
7. Repeat /pocket for another device. Each key can be revoked independently, but all keys access the same owner notebook.

The key is a reusable bearer credential, not a one-use code. The browser retains it in localStorage and sends it over HTTPS in the X-Auth header. Possession of a valid key allows reading and replacing this notebook, so it is not something to share with other people. It is not put in URLs, public source or JSON backups.

The existing middleware verifies the secret, active status, expiry, allowed consumer, endpoint grant and scope on requests. Registry credentials issued earlier do not automatically gain the new grants. Existing master/legacy wildcard credentials keep their existing administrative semantics.

If creating the key fails, the command returns a generic retry message. If delivery of the secret fails, it attempts to revoke that newly created key. Logs do not contain the secret or notebook contents.

The new key permits only:
- pocketMiles.read with pocket-miles:read
- pocketMiles.write with pocket-miles:write

It cannot call Spotify, calendar, generic storage, Telegram-send or LLM endpoints through those grants.

Revocation uses the existing owner-only callback. Expired/revoked credentials fail subsequent authenticated requests; existing cleanup can remove old records. Disconnecting in the browser removes that browser's key and cache without deleting the server notebook. Revocation cannot remotely erase an offline device's existing cache; after the app receives an online authentication rejection, it clears that device's cached access/data.

## API contract

The base address is https://streetbot.fly.dev.

| Request | Result |
| --- | --- |
| GET /pocket-miles/notebook | Returns the complete saved notebook and its revision. An uninitialised notebook returns empty defaults at revision 0. |
| PUT /pocket-miles/notebook | Accepts the entire replacement notebook plus the revision the device last read. Validates it, saves conditionally, and returns the new revision. |

Request/response shape:

    {
      "data": {
        "version": 1,
        "settings": { "...": "wallet settings" },
        "merchants": []
      },
      "revision": 4
    }

Both routes use the existing Express authentication middleware and send Cache-Control: private, no-store. The frontend service worker caches static app assets, not these API responses.

Invalid payloads/revisions return 400; authentication and access checks return 401/403; stale revisions return 409; the existing limiter returns 429 when blocked. Handler storage failures return 503 with a retry/refresh message. A failed PUT response is treated as unconfirmed, so the browser reloads before another save rather than assuming the write never happened.

Limits are per credential and endpoint in the existing rolling 60-second limiter: read requests block at request 121 and writes at request 61. Pocket Miles disables the optional Telegram warning notification for these endpoints. The existing JSON request-body limit is 1 MB.

CORS already permits https://joellimrl.github.io and the X-Auth header. Moving to a separate repository under that same GitHub account does not require a new origin. CORS is a browser access policy; the credential checks remain the actual authorization.

## MongoDB data

A new protected collection named pocketMiles sits inside the existing StreetBot database. It stores one document:

    {
      "_id": "owner",
      "data": {
        "version": 1,
        "settings": { "...": "selected cards and reward settings" },
        "merchants": [ "...saved merchant entries..." ]
      },
      "revision": 4,
      "updatedAt": "...MongoDB date..."
    }

Wallet settings include selected card IDs; Amaze usage; HSBC/Citi remaining allowances and their timestamps; Citi reset date; UOB qualification and membership-year information; Trust Miles mode; and a settings save timestamp.

Each merchant has an ID, name, branch/route label, category, payment method, currency choice, UOB/online-wallet exception flags, confirmation status, notes and creation/update timestamps. The model limits the book to 500 entries and validates lengths, known card/category values, booleans, dates and allowance ranges. Duplicate IDs or duplicate name/label/method/currency entries are rejected. Unknown fields are stripped.

No card numbers, CVVs, bank login details or bank transaction feeds are stored. Typing an amount is a calculation input, not a recorded purchase. The app does not maintain a spending ledger or automatically consume bonus allowances.

The collection is added to the existing protected collection registry, so the generic collection-reading endpoint cannot expose it. The first GET does not create a notebook document. Existing authentication bookkeeping may update the key's lastUsedAt metadata. The first successful PUT creates the notebook.

## Sync and conflict handling

The app loads the notebook when connecting/opening and refreshes on explicit refresh, eligible focus/reconnection events, or saves. It does not run a background polling loop or send keystrokes to the server.

Example: phone and computer both load revision 4. The phone saves revision 5. The computer's later attempt to save based on revision 4 is rejected with 409. The app asks for a refresh/review instead of overwriting the phone's changes.

MongoDB updates match both the fixed document ID and expected revision, then increment the revision atomically. Initial creation uses the unique _id to allow only one competing first save. Each save replaces the complete notebook; this is not per-merchant patching or automatic conflict merging.

After a successful load the browser keeps a local copy for offline recommendations. Offline edits are not queued; saving requires reconnection. This model is intentionally a single-owner notebook, not multiple isolated user accounts.

## Impact and deployment

This extends the existing Streetbot process. No additional Fly app, MongoDB connection, runtime dependency, environment variable, cron job, bank integration or AI service is introduced. Deploying the backend uses the existing Fly workflow and restarts/rolls out the Streetbot application, so it shares that service's availability.

There is no destructive migration or backfill. Collection creation occurs on the first save. Existing jobs and integrations retain their implementation. Existing credential records remain in their registry.

Recommended order after review:
1. Merge and deploy backend PR #1.
2. Check health and that unauthenticated notebook access is rejected.
3. Merge the standalone app PR and manually run its Publish Pocket Miles workflow.
4. The owner requests device keys and verifies saving on one device and reading on another.

Rollback is a code revert and redeployment. Notebook data is left in MongoDB. Revoke app keys before removing the feature if continued access should stop. There is no new server-side revision history or automatic notebook backup; the app provides a manual JSON export, and any existing MongoDB backup policy remains separate.

## Maintenance and validation

Bank rewards and merchant recognition remain frontend-maintained rules. Keeping merchant data does not automatically detect bank changes. Shared card/category/schema values also exist in the backend validator, so new supported values must be deployed to the backend before a frontend starts saving them.

The backend's 16 targeted tests are nine new feature tests plus seven existing auth configuration/revocation tests. They use local injected storage and Telegram boundaries and check that live db.js was not loaded. They cover first reads/saves, stale versions, concurrent first writes, malformed data, scoped policies, owner-only issuance, hashing/expiry and failed message delivery.

The standalone app has 28 isolated recommendation, validation, sync/store and DOM tests. None are proof of production Telegram/MongoDB wiring or actual phone installation; those are post-deployment checks. Tests do not start the bot or its jobs.

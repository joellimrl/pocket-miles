# Pocket Miles backend changes

This document describes the proposed Streetbot changes in [backend PR #1](https://github.com/joellimrl/streetBot/pull/1). They remain undeployed while under review.

## Responsibilities

The standalone [pocket-miles repository](https://github.com/joellimrl/pocket-miles) owns the interface, installable PWA, merchant matching and card-recommendation rules. GitHub Pages serves its public files at https://joellimrl.github.io/pocket-miles/.

Streetbot remains the private data service running on Fly. It authenticates devices, validates the notebook, and reads/writes the existing MongoDB database. It does not calculate the best card, look up a bank account, fetch live MCCs or call an LLM when a merchant is typed.

The project-site URL is the same as the originally proposed portfolio subdirectory. The API URL and allowed browser origin therefore stay the same. A standalone repository gives the frontend separate ownership and releases; it does not create a second Fly service.

## Exact code changes

| File | Change |
| --- | --- |
| app.js | Imports the feature module, registers the /pocket bot command, and mounts its three Express routes. |
| db.js | Adds pocketMiles to the existing internal/protected collection registry. Reuses the existing MongoDB client. |
| feat/server/auth/config.js | Adds the pocket-miles consumer plus pairing/read/write endpoint policies, scopes and rate limits. The existing policy-derived CORS methods then include PUT. |
| feat/pocketMiles/index.js | Notebook handlers, revision checking, owner-only setup-key issuance and device listing. |
| feat/pocketMiles/devices.js | Atomic browser pairing, public-key proof verification and replay protection using the existing credential collection. |
| feat/pocketMiles/shared/merchants.mjs | Shared notebook/merchant/settings validation. |
| feat/pocketMiles/shared/recommend.mjs | Card identifiers and empty-wallet defaults used by validation. |
| feat/pocketMiles/shared/rules.mjs | Category identifiers and settings dependencies for that shared model. The backend does not invoke recommendations. |
| tests/pocketMiles.test.js | Nine isolated tests of the new handlers, access configuration and connection command. |
| tests/pocketDevices.test.js | Eight offline tests of browser binding, expiry, replay, revocation, scopes and Telegram listing. |
| .github/workflows/fly.yml | Runs syntax checks and 24 targeted offline tests before the existing Fly deployment step. |
| feat/pocketMiles/README.md | Setup, deployment, rollback and validation notes. |

The credential registry, scrypt implementation, key revocation handler, rate limiter, CORS machinery and cleanup job already exist and are reused. Their implementation is not replaced by this feature.

## Connecting a browser permanently

1. The owner sends /pocket in a private Telegram chat. Both sender and chat IDs must match the configured owner.
2. Streetbot creates a setup credential with a 15-minute expiry. Only a salted scrypt hash of its secret is saved in apiAuthKeys. The Telegram reply contains the full setup key and the existing revoke button.
3. In the app, the owner names the browser (for example, iPhone Safari) and pastes the setup key. The browser generates an ECDSA P-256 key pair using Web Crypto. Its private key is non-extractable and is saved as a CryptoKey in IndexedDB before contacting the backend.
4. POST /pocket-miles/device presents the setup credential, public key, browser name and a signature proving possession of the private key. An atomic update binds the credential to the first successful browser, records its public key/fingerprint/name/pairing date, and sets expiresAt to null.
5. The connection now has no automatic expiry. Another browser cannot rebind it or use a copied setup credential alone. Retrying pairing from the original browser is safe after a lost response. The paired credential continues to use the same opaque secret in X-Auth, now combined with a required browser signature.
6. The owner repeats /pocket for another browser. All paired browsers use the same notebook and can be revoked independently. /pocket devices lists active paired/pending connections, each with its own revoke action.

A notebook request has both X-Auth and Authorization: PocketDevice <timestamp>.<nonce>.<signature>. The signature covers a versioned purpose, credential ID, HTTP method, route, timestamp, random nonce and SHA-256 digest of the JSON body (null for GET). Signatures use ECDSA with SHA-256 and IEEE P1363 encoding. Proofs outside a 90-second clock window are rejected. An atomic per-credential nonce claim prevents replay across concurrent requests and Fly instances; old proof records are pruned on subsequent requests. This is an application-specific proof format, not an implementation of the DPoP standard.

The existing Express middleware still validates the secret, active status, expiry, consumer, endpoint grant and scope before the feature checks the browser signature. Newly issued Pocket Miles credentials allow only pairing plus notebook reads/writes. Unpaired credentials cannot access the notebook. Other authorised admin/legacy integrations retain their existing semantics.

Raw setup secrets and private signing keys never enter MongoDB, URLs, public source or backups. The opaque credential is remembered in localStorage; its signing key and browser label live in IndexedDB. The backend stores only the public signing key. These are browser-profile credentials, not hardware attestation or a guarantee against device/profile cloning. Non-extractability prevents JavaScript key export, but same-origin code can still ask the key to sign. All pages on joellimrl.github.io share an origin; a separate custom origin would provide stronger separation from other projects. Browser data deletion/eviction, a new browser profile or an installation with separate storage requires pairing again. See the [Web Crypto key-storage specification](https://www.w3.org/TR/WebCryptoAPI/#key-storage).

The command attempts to revoke any newly issued setup credential whose Telegram delivery fails. Logs contain neither credentials nor notebook contents. Device names are escaped in Telegram HTML.

The grants are:
- pocketMiles.pair with pocket-miles:pair
- pocketMiles.read with pocket-miles:read
- pocketMiles.write with pocket-miles:write

They do not grant Spotify, calendar, generic storage, Telegram-send or LLM access.

Revocation uses the existing owner-only callback and stops future server access by that credential. Expired pending keys and revoked connections are handled by the existing cleanup job; a paired expiresAt:null credential does not expire. Disconnecting in the app removes that browser's local credential, signing key and cache; use /pocket devices to revoke the server record too. Revocation cannot remotely erase an offline cache. An online 401/403 clears the browser's cached access/data.

## API contract

The base address is https://streetbot.fly.dev.

| Request | Result |
| --- | --- |
| POST /pocket-miles/device | Accepts {publicKey, name} with setup credential and browser proof; returns {name, keyId, expiresAt:null}. First binding is atomic; same-key retry is idempotent. |
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

All three routes use the existing Express authentication middleware and send Cache-Control: private, no-store. The frontend service worker caches static app assets, not these API responses.

Invalid payloads/revisions or stale proof timestamps return 400; authentication and access checks return 401/403; stale revisions or replayed proofs return 409; the existing limiter returns 429 when blocked. Handler storage failures return 503 with a retry/refresh message. A failed PUT response is treated as unconfirmed, so the browser reloads before another save rather than assuming the write never happened.

Limits are per credential and endpoint in the existing rolling 60-second limiter: pairing requests block at request 11, reads at request 121 and writes at request 61. Pocket Miles disables the optional Telegram warning notification for these endpoints. The existing JSON request-body limit is 1 MB.

CORS already permits https://joellimrl.github.io and the X-Auth/Authorization headers. No new CORS header is needed. Moving to a separate repository under that same GitHub account does not require a new origin. CORS is a browser access policy; the credential checks remain the actual authorization.

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

Each merchant has an ID, name, branch/route label, category, payment method, currency choice, UOB/online-wallet exception flags, confirmation status, notes and creation/update timestamps. The model limits the book to 500 explicitly saved entries and validates lengths, known card/category values, booleans, dates and allowance ranges. Duplicate IDs or duplicate name/label/method/currency entries are rejected. Unknown fields are stripped. The limit does not count searches or one-off purchase checks. Those checks run only in the browser and make no notebook request. The Save to my places option is required to persist new payment details; no backend change or collection migration is needed for one-off checks.

No card numbers, CVVs, bank login details or bank transaction feeds are stored. Typing an amount is a calculation input, not a recorded purchase. The app does not maintain a spending ledger or automatically consume bonus allowances.

The collection is added to the existing protected collection registry, so the generic collection-reading endpoint cannot expose it. The first GET does not create a notebook document. Authentication bookkeeping can update lastUsedAt; browser proof verification also writes replay-protection metadata to apiAuthKeys even on a GET. The first successful PUT creates the notebook.

## Sync and conflict handling

The app loads the notebook when connecting/opening and refreshes on explicit refresh, eligible focus/reconnection events, or saves. It does not run a background polling loop or send keystrokes to the server.

Example: phone and computer both load revision 4. The phone saves revision 5. The computer's later attempt to save based on revision 4 is rejected with 409. The app asks for a refresh/review instead of overwriting the phone's changes.

MongoDB updates match both the fixed document ID and expected revision, then increment the revision atomically. Initial creation uses the unique _id to allow only one competing first save. Each save replaces the complete notebook; this is not per-merchant patching or automatic conflict merging.

After a successful load the browser keeps a local copy for offline recommendations. Offline edits are not queued; saving requires reconnection. This model is intentionally a single-owner notebook, not multiple isolated user accounts.

## Impact and deployment

This extends the existing Streetbot process. No additional Fly app, MongoDB connection, runtime dependency, environment variable, cron job, bank integration or AI service is introduced. Deploying the backend uses the existing Fly workflow and restarts/rolls out the Streetbot application, so it shares that service's availability.

Migration is additive and on demand: successful pairing adds device:{publicKey,fingerprint,name,pairedAt,proofs} to that Pocket Miles credential and changes its expiresAt to null. No other credential is rewritten. Older Pocket Miles credentials without the pairing grant require a fresh /pocket setup key; grants are never expanded automatically. Notebook schema/data are unchanged by device pairing. The pocketMiles collection is created on first notebook save. Existing jobs and integrations retain their implementation.

Recommended order after review:
1. Merge and deploy backend PR #1.
2. Check health and that unauthenticated notebook access is rejected.
3. Merge the standalone app PR and manually run its Publish Pocket Miles workflow.
4. The owner requests device keys and verifies saving on one device and reading on another.

Before rolling back to code that does not enforce browser signatures, revoke all paired Pocket Miles credentials: they have null expiry and older code would treat them as reusable bearer keys. Rollback is then a code revert and redeployment. Notebook data is left in MongoDB. Revoke app keys before removing the feature if continued access should stop. There is no new server-side revision history or automatic notebook backup; the app provides a manual JSON export, and any existing MongoDB backup policy remains separate.

## Maintenance and validation

Bank rewards and merchant recognition remain frontend-maintained rules. Keeping merchant data does not automatically detect bank changes. Shared card/category/schema values also exist in the backend validator, so new supported values must be deployed to the backend before a frontend starts saving them.

The backend's 24 targeted tests cover nine notebook/command cases, eight browser-identity cases and seven existing auth configuration/revocation cases. They use local injected storage and Telegram boundaries and check that live db.js was not loaded. They cover first reads/saves, stale versions, concurrent first writes, malformed data, scoped policies, owner-only issuance, hashing/expiry, pairing races, copied setup keys, signed request tampering/replay, connection revocation, escaped device names and failed message delivery.

The standalone app has 39 isolated recommendation, validation, sync/store, browser-key storage and DOM tests. Real Web Crypto signing is exercised with mocked IndexedDB persistence; it is not a Safari/Chrome installation test. None are proof of production Telegram/MongoDB wiring or actual phone installation; those are post-deployment checks. Tests do not start the bot or its jobs.

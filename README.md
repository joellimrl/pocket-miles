# Pocket Miles

A personal Singapore credit-card companion with its own repository and GitHub Pages release. Save your cards, then type a merchant name for a recommendation. Check one-off purchases without saving; keep the merchants you want to reuse. Install it on your phone’s home screen.

**Status:** app and backend are live. Further app releases use the manual Pages workflow.

- Repository: https://github.com/joellimrl/pocket-miles
- App address: https://joellimrl.github.io/pocket-miles/
- Backend review: https://github.com/joellimrl/streetBot/pull/1
- [Full backend explanation](docs/backend.md)

The browser app is independent of ChatGPT and the portfolio repository. Its private data service remains inside the existing Streetbot/Fly backend and MongoDB. Public source code contains no device credentials, saved card selection or merchant records.

## Local preview

Node 22.9 or newer:

    npm ci --ignore-scripts
    npm test
    npm run dev

Open http://127.0.0.1:8741/pocket-miles/. Set PORT if that port is in use. The loopback-only preview stores data in ignored data/preview.json, needs no connection key, and does not contact Streetbot, Telegram or MongoDB.

## Production setup after review

1. Merge and deploy the backend PR using Streetbot’s existing Fly workflow.
2. Merge the app PR here.
3. In this repository, run **Actions → Publish Pocket Miles → Run workflow**, selecting main. Publication is manual; pushes and merges alone do not deploy the app.
4. Send /pocket in the owner’s private Streetbot chat and name the browser and paste the setup key into the app within 15 minutes. Pair in the browser/home-screen installation you intend to use.
5. Select your cards in Wallet and save your regular merchants.
6. Connect another device with a second /pocket key to load the same notebook.
7. Add the HTTPS app to your home screen using Safari’s Share menu or Chrome’s Install/Add to home screen option.

Paired browser connections have no automatic expiry. The 15-minute setup key can pair only one browser identity; subsequent requests require its locally stored signing key as well. Use /pocket devices in Telegram to list and revoke connections individually. Disconnecting clears the local credential, signing key and cached notebook; revoke the server connection in Telegram too. Clearing browser data, changing browser/profile or moving to an installation with separate storage requires a new pairing. This binds access to browser storage, not physically to the hardware.

## What is included

- Pay, Places and Wallet screens; optional amount for more precise estimates.
- A Charged in selector on Pay switches this purchase between SGD and foreign currency without changing the saved place. Save through the merchant editor to retain a currency change.
- Recommendations for tap/phone, online/app and inserted-card payments shown together for stores and restaurants. Online platforms such as Shopee, Lazada and GrabFood show online only; SimplyGo shows tap only, and taxi terminals show tap and insert. Amount and wallet changes recalculate every displayed method.
- HSBC Revolution, Citi Rewards, KrisFlyer UOB and Trust Freedom, with optional Amaze routing.
- Every card in the saved wallet is visible for each checkout, including Amaze + Citi when enabled. Lists sort by miles per dollar without an amount, or estimated total miles after rounding and allowances with an amount. Excluded cards and disabled miles mode stay visible at zero; unmodelled routes are marked not estimated and appear last. Fees remain visible separately. SGD Amaze costs are shown as 1% with a S$0.50 minimum until an amount is supplied.
- One-off purchase checks with an optional Save to my places checkbox. New purchase checks default to not saving; explicit Add/Save actions and editing a saved place default to saving.
- Saved merchant category, branch/route, payment method, currency, notes and confirmation status.
- Separate branch and online entries; ambiguous matches require selection.
- JSON export/import and cached offline lookups after a successful connection.
- Sync on load, eligible refresh/focus/reconnection, and save. Searches run locally. Saves require a live connection and conflicting revisions are rejected.

Rules are a snapshot dated 23 October 2026, with sources linked inside the app. They are not automatically updated. Suggestions for new merchants are assumptions, not live MCC lookup. Checkout methods are suggested from the merchant name and category, not live acceptance data. Each comparison reuses the selected category, currency and exclusions; a merchant can code differently online, so save a separate route if you have confirmed different details. Saved payment preferences do not hide other applicable comparisons, and viewing comparisons never writes extra merchant entries. The online-wallet exception applies only to online checkout, not tapping a phone. Bonus allowances are manual and searches do not deduct spending. Both SGD and foreign-currency comparisons rank all selected cards by estimated miles, including the enabled Amaze + Citi Rewards Mastercard pairing. Costs never hide or demote a higher-mile card. Caps, exclusions and rounding can change the order; this is not a net-value calculation. Equal miles favour no added fee, then the disclosed Amaze spread over an unmodelled bank FX charge. Transfer fees, merchant surcharges, fuel discounts and promotional targets are outside the ranking.

This is a single-owner app, with up to 500 explicitly saved merchant entries. The limit does not count searches or one-off checks. One-off details live only in page memory: they are not written to the notebook, local cache or backup, and disappear when the page is reloaded or another merchant is selected. A full saved list still allows one-off checks and edits to existing entries. After a successful wallet load, one-off checks also work offline; saving requires a connection. It has no bank account connection and never needs card numbers.

## Source and builds

- public/: browser application and service worker.
- scripts/preview.mjs: local-only development server.
- scripts/build.mjs: explicit public-asset allowlist copied to dist/.
- tests/: isolated recommendation, schema, store and DOM tests.
- .github/workflows/checks.yml: tests and builds pull requests.
- .github/workflows/pages.yml: publishes only when manually run on main.

Only dist/ is uploaded to Pages. Tooling, tests, node_modules, local data and documentation are excluded. Relative asset URLs and the manifest scope support the /pocket-miles/ project path. Use Update app in the footer, or open https://joellimrl.github.io/pocket-miles/update.html to load a new release. This uncached entry updates and activates the app's service worker, then returns to Pay; it never clears device credentials, IndexedDB or the notebook. Shell downloads bypass the browser HTTP cache. App v3.3.3 is shown in the footer. Existing tabs are not forcibly reloaded; reopen them after saving any forms.

## Maintaining card rules

Edit public/rules.js and its source links/date, then update boundary tests in tests/rules.test.mjs. Selection and quick comparisons are in public/recommend.js; notebook validation is in public/merchants.js.

For a new card, category or schema value, also update the corresponding Streetbot feat/pocketMiles/shared modules. They are copies of these three browser modules with their relative import extensions changed from .js to .mjs. Pure reward-rate changes affect browser recommendations; schema additions need the matching backend deployed first.

Tests use local mocks and a DOM harness, including payment-method comparisons and checks that one-off purchases do not persist, work offline and still work at the saved-place limit. Actual phone installation and authenticated cross-device MongoDB sync still require post-deployment checks.

GitHub Pages uses the documented [custom workflow deployment](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

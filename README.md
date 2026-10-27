# Pocket Miles

A private-profile Singapore credit-card companion with its own repository and GitHub Pages release. Save your cards, then type a merchant name for a recommendation. Check one-off purchases without saving; keep the merchants you want to reuse. Install it on your phone’s home screen.

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

## Separate spouse profile

1. Update the app to v3.5.0 and open it online once. Existing owner keys and the owner notebook stay valid; the old unbound offline cache is replaced after this online load.
2. In your private Streetbot chat, send `/pocket create spouse`. This creates an empty wallet and returns a setup key valid for 15 minutes.
3. Share that setup key with your spouse. They open the same app URL, name their browser and paste it, then select their own cards. Wallet and the sync status identify the profile.
4. Use `/pocket connect spouse` for another browser or an expired invitation. It never resets the wallet. `/pocket` still pairs your owner wallet.
5. Use `/pocket devices spouse` to revoke an individual connection. Neither person needs a separate site or Fly deployment.

One browser profile has one active Pocket Miles connection. Disconnect before pairing a different profile, or use separate browser profiles. Offline caches are bound to the credential ID; they cannot be reused by another connection. Export/import is an explicit manual copy into the currently connected profile. Backups do not contain profile access credentials.

Deploy the profile-aware backend before this frontend. Never roll the backend back to the old single-owner handlers while spouse credentials remain active: those handlers would direct them to the owner notebook. Revoke all non-owner credentials before such a rollback.

## What is included

- Pay, Places and Wallet screens; optional amount for more precise estimates.
- A Charged in selector on Pay switches this purchase between SGD and foreign currency without changing the saved place. Save through the merchant editor to retain a currency change.
- A compact comparison table puts cards in rows and all applicable methods in one table, ordered Google/Apple Pay tap, Google/Apple Pay online, direct online card, physical card tap and insert. No payment methods require expanding a disclosure. Phone and physical-card tap share the contactless calculation. Each column highlights its highest-mile pick. Online platforms such as Shopee, Lazada and GrabFood show direct online and online-wallet routes only; SimplyGo shows phone and physical-card tap, and taxi terminals add card insert. Amount and wallet changes recalculate every displayed method.
- HSBC Revolution, Citi Rewards, KrisFlyer UOB and Trust Freedom, with optional Amaze routing for foreign-currency payments.
- Quick guide (`quick.html`), linked from the header, is a compact public four-card reference with all five payment columns in the same order, transport and travel defaults, fee trade-offs, caps and sources checked 25 October 2026. It assumes standard HSBC rewards, Trust Miles mode and UOB annual qualifying spend met; it does not read a profile or current allowances. No transaction history or credentials are embedded. The guide is cached with the app shell and also opens without signing in. Its local defaults avoid extra payment-route fees; the existing personalised picker continues ranking by miles.
- Detailed sheet (`detailed.html`) is a separate public page linked from the quick guide and its category labels. It includes all 26 supported categories and all four cards, plus Amaze for foreign-currency payments, using the existing recommendation engine. All five routes appear side by side where applicable, in the same order as Pay. Both pages use the shared route definitions in payments.js. Category filters, SGD/foreign scenarios, optional amounts, manual bonus allowances and UOB qualification inputs update the sheet without reading or writing the private wallet. Category notes, per-card explanations, fees, rounding, caps and sources remain available. Foreign links retain their currency, including offline through the cached public HTML. The quick guide stays compact.
- Every saved wallet card has one row, including Amaze + Citi for foreign-currency payments when enabled. Rows sort by the highest available miles per dollar across methods, or highest estimated total miles after rounding and allowances when an amount is entered. Each method retains its own independent top pick. Excluded cards and disabled miles mode stay visible at zero; unmodelled routes show a dash. Compact fee labels and cap-status badges stay in the grid. Full calculation explanations and assumptions live under Fees & details. The search screen removes the hero and repeated instructional paragraphs; recent places and starter categories hide while searching.
- One-off purchase checks with an optional Save to my places checkbox. New purchase checks default to not saving; explicit Add/Save actions and editing a saved place default to saving.
- Saved merchant category, branch/route, payment method, currency, notes and confirmation status.
- Separate branch and online entries; ambiguous matches require selection.
- JSON export/import and cached offline lookups after a successful connection.
- Places → Add from history accepts a prepared merchant-baseline JSON file. Review the checkboxes, category, default method and charged currency before adding anything. The preview is local; only selected merchant records are saved to the connected profile. Existing merchants and wallet settings are preserved. Repeated imports skip matching record IDs, routes, names and supplied aliases. All imported history suggestions remain unconfirmed.
- Sync on load, eligible refresh/focus/reconnection, and save. Searches run locally. Saves require a live connection and conflicting revisions are rejected.

Rules are a snapshot dated 23 October 2026, with sources linked inside the app. They are not automatically updated. Suggestions for new merchants are assumptions, not live MCC lookup. Checkout methods are suggested from the merchant name and category, not live acceptance data. Each comparison reuses the selected category, currency and exclusions, while explicitly setting its payment method and online-wallet flag; a merchant can code differently online, so save a separate route if you have confirmed different details. Saved payment preferences do not hide other applicable comparisons, and viewing comparisons never writes extra merchant entries. The online-wallet exception applies only to online checkout, not tapping a phone. Bonus allowances are manual and searches do not deduct spending. Both SGD and foreign-currency comparisons rank selected cards by estimated miles. The enabled Amaze + Citi Rewards Mastercard pairing appears only for foreign-currency payments; SGD comparisons omit it because of its 1% fee (minimum S$0.50). The saved pairing remains enabled, so changing the purchase currency restores it without changing the wallet. Included routes are ranked by miles, with costs used only to break ties. Caps, exclusions and rounding can change the order; this is not a net-value calculation. Equal miles favour no added fee, then the disclosed Amaze spread over an unmodelled bank FX charge. Transfer fees, merchant surcharges, fuel discounts and promotional targets are outside the ranking.

Profiles are invite-only: the bot owner creates a separate wallet with /pocket create spouse, then shares that profile’s setup key. /pocket connect spouse issues another key for the same wallet. /pocket profiles lists profiles, and /pocket devices spouse lists its connections. Only the owner manages profiles and revocation in Telegram. Each credential accesses one profile; its cards, allowances, saved merchants, revisions and device connections are independent. The owner remains the service administrator. There is no profile selector in API requests or public self-registration. Each profile has up to 500 explicitly saved merchant entries. The limit does not count searches or one-off checks. One-off details live only in page memory: they are not written to the notebook, local cache or backup, and disappear when the page is reloaded or another merchant is selected. A full saved list still allows one-off checks and edits to existing entries. After a successful wallet load, one-off checks also work offline; saving requires a connection. It has no bank account connection and never needs card numbers.

## Source and builds

History files use `format: "pocket-miles-merchant-baseline"`, `version: 1`, a required `profileId`, `source`, `asOf` date and `candidates`. Each candidate contains a schema-valid `merchant`, history-entry `count`, `lastSeen` date, `suggested` checkbox default and `aliases` used only to detect existing saved names. A file for a different profile is rejected. This is a local-file merge workflow, not an automatic CSV feed or transaction tracker. The browser does not infer charged currency, MCC or payment channel from spending labels. Raw CSVs, personal baseline files and generation outputs must remain outside this repository and the published `dist/` directory. The existing protected notebook endpoint and schema handle the selected records; no backend deployment or database migration is needed.

- public/: browser application and service worker.
- scripts/preview.mjs: local-only development server.
- scripts/build.mjs: explicit public-asset allowlist copied to dist/.
- tests/: isolated recommendation, schema, store and DOM tests.
- .github/workflows/checks.yml: tests and builds pull requests.
- .github/workflows/pages.yml: publishes only when manually run on main.

Only dist/ is uploaded to Pages. Tooling, tests, node_modules, local data and documentation are excluded. Relative asset URLs and the manifest scope support the /pocket-miles/ project path. Use Update app in the footer, or open https://joellimrl.github.io/pocket-miles/update.html to load a new release. This uncached entry updates and activates the app's service worker, then returns to Pay; it never clears device credentials, IndexedDB or the notebook. Shell downloads bypass the browser HTTP cache. App v3.8.1 is shown in the footer. Existing tabs are not forcibly reloaded; reopen them after saving any forms.

## Maintaining card rules

Edit public/rules.js and its source links/date, then update boundary tests in tests/rules.test.mjs. Keep the static reference in public/quick.html and its checked date aligned with any affected rules. Selection and quick comparisons are in public/recommend.js; notebook validation is in public/merchants.js.

For a new card, category or schema value, also update the corresponding Streetbot feat/pocketMiles/shared modules. They are copies of these three browser modules with their relative import extensions changed from .js to .mjs. Pure reward-rate changes affect browser recommendations; schema additions need the matching backend deployed first.

Tests use local mocks and a DOM harness, including payment-method comparisons and checks that one-off purchases do not persist, work offline and still work at the saved-place limit. Profile tests also cover credential-bound cache reuse, account changes in another tab, delayed responses, mismatched profiles and clearing previous wallet forms. Actual phone installation and authenticated cross-device MongoDB sync still require post-deployment checks.

GitHub Pages uses the documented [custom workflow deployment](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

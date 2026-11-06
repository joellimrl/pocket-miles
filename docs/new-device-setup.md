# Pocket Miles setup on another computer

You can work on Pocket Miles from another computer by cloning its app repository. Clone StreetBot as well if you want the agent to work on syncing, device connections or profiles. The live app and your saved wallet keep running independently of this computer.

Prepared 6 November 2026. For the technical handoff, give your agent [agent-handoff.md](agent-handoff.md).

## Repositories to download

| Repository | When you need it |
| --- | --- |
| [joellimrl/pocket-miles](https://github.com/joellimrl/pocket-miles) | Required for app development: screens, card rules, merchant matching, quick guide, detailed sheet and GitHub Pages. |
| [joellimrl/streetBot](https://github.com/joellimrl/streetBot) | Recommended for the full system; needed for backend changes. Private repo: sign in with an account that has access. Contains Telegram pairing, profile separation and MongoDB sync. |
| [joellimrl/spendingsReport](https://github.com/joellimrl/spendingsReport) | Optional. Previous transaction data used to prepare merchant suggestions. No dependency on it when the app runs. |

You do not need `joellimrl.github.io`, the old ChatGPT-hosted site, or the earlier prototype folders. Pocket Miles has its own repository and Pages deployment.

## Set up the development copy

Install Git and Node.js with npm. The project requires Node **22.9.0 or newer**; CI currently uses 22.9.0. GitHub CLI (`gh`) is convenient for signing in and opening pull requests, but optional if you use GitHub Desktop or another Git client.

Run these commands in a parent folder where you keep projects. If using GitHub CLI, sign in first with `gh auth login`, then `gh auth setup-git` so Git can access the private backend.

```sh
git clone https://github.com/joellimrl/pocket-miles.git
git clone https://github.com/joellimrl/streetBot.git
cd pocket-miles
npm ci --ignore-scripts
npm test
npm run dev
```

Open [the local app](http://127.0.0.1:8741/pocket-miles/). This preview uses a separate local wallet, needs no setup key and does not connect to your live MongoDB or Telegram bot. Leave the terminal running while you use it; Ctrl+C stops it. You do not need to start StreetBot to develop the frontend.

For optional history work, clone this from the same parent folder:

```sh
git clone https://github.com/joellimrl/spendingsReport.git
```

The intended folder layout is:

```text
projects/
  pocket-miles/
  streetBot/
  spendingsReport/   (optional)
```

## Give the next agent this starting message

> Continue Pocket Miles. Read `pocket-miles/docs/agent-handoff.md` and the repositories' current instructions first. The frontend is in `pocket-miles`; the private backend is in the sibling `streetBot` folder. Check current branches and changes before editing. Use the local frontend preview for development. Keep the five payment columns in their documented order and keep Amaze + Citi out of SGD recommendations. My next task is: [describe the change here].

## Connect your actual wallet on the new device

Use the [live app](https://joellimrl.github.io/pocket-miles/) for your real cards and saved places. A development clone does not download that data.

1. In your private Streetbot Telegram chat, send `/pocket` for your owner wallet.
2. Open the live app on the new device, name the browser and paste the setup key within 15 minutes.
3. Once paired, that browser's connection has no automatic expiry and loads the existing wallet.
4. For an existing spouse profile, use `/pocket connect spouse` instead. Do not create another profile just to connect another device.

Each browser/profile or installation with separate storage needs its own pairing. On iPhone/iPad, open the home-screen app and pair inside it if Safari's connection does not carry over. Copying an old setup key alone will not transfer the original browser's signing key.

## What does and does not need transferring

| Item | What to do |
| --- | --- |
| Committed code and these handoffs | Clone the repos or pull their latest `main`. |
| Live wallet and saved merchants | Pair the new browser; they remain in MongoDB. |
| Optional wallet backup | Export JSON from the app and store it privately. It contains wallet data, not device credentials. |
| Unsaved local code changes | Commit/push them or copy a patch before leaving the old computer. |
| Local preview wallet | Optional: privately copy `pocket-miles/data/preview.json`. It is ignored by Git and separate from the live wallet. |
| Original merchant baseline | Optional: privately transfer `outputs/pocket-miles-baseline.json` from the old task workspace if you want to review/import it again. Already saved merchants sync normally. |
| Original baseline analysis and generator | Optional: `outputs/baseline-analysis.json` and `work/build-merchant-baseline.py` in the old task workspace. These are not included in the app clone. |

Do not put wallet backups, raw transactions, setup keys or `.env` files into the public app repo. Normal frontend development does not need production secrets. The existing Fly/MongoDB setup stays in place when you change computers.

## Publish later changes

Frontend changes go through a pull request into `pocket-miles/main`. After merging, run **Actions → Publish Pocket Miles → Run workflow → main** in that repo. A merge alone does not publish the site. Use [Update app](https://joellimrl.github.io/pocket-miles/update.html) to load a published release.

StreetBot behaves differently: pushing or merging to its `main` triggers its existing Fly deployment and can restart the shared bot service. Have the agent read `streetBot/AGENTS.md` before backend work; starting the bot locally is not needed for the safe Pocket Miles tests.

# Install and customize the Sinflin GitHub profile

## What is included

- `README.md` — profile README, designed to live at the root of the profile repository.
- `docs/index.html` — responsive dashboard interface.
- `docs/tracker.js` — live GitHub REST API tracker and rendering logic.
- `docs/assets/profile-banner.png` — custom hero image with the requested quote.
- `docs/assets/profile-banner-background.png` — original generated background without overlaid quote text, for future edits.
- `.github/workflows/deploy-pages.yml` — deploys the dashboard to GitHub Pages when `docs/` changes.

## Publish it on your GitHub account

1. Open GitHub and create a **public** repository named exactly `Sinflin` (same spelling as your username). If that profile repository already exists, keep it and add/replace the files in this package rather than creating a duplicate.
2. Upload the **contents** of this package to the repository root. The repository should contain `README.md`, `.github/`, and `docs/` at the top level—not an extra enclosing `sinflin-github-profile/` folder.
3. Commit the files to the default branch. The included workflow listens to pushes on `main` and `master`. If your default branch has another name, add it to the `branches` list in `.github/workflows/deploy-pages.yml`.
4. In the repository, open **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source.
5. Open the **Actions** tab and check that **Deploy GitHub profile dashboard** completes successfully.
6. Once GitHub Pages has finished its first deployment, open `https://sinflin.github.io/Sinflin/`. The README already links to this address.

The profile README is shown on `https://github.com/Sinflin` only when the repository is public and its name matches the account username.

## How the tracker works

- The page calls these public endpoints: `/users/Sinflin`, `/users/Sinflin/repos`, and `/users/Sinflin/events/public`.
- It refreshes in the open browser tab every **5 minutes**, supports **Refresh now**, and refreshes when a visitor returns to the tab after the interval.
- It shows public repository count, followers, following, stars across the latest up to 100 fetched repositories, repository cards, primary-language counts, and recent public events.
- The activity grid counts events from the latest response (up to 100 public events). GitHub's Events API is not a complete contribution calendar: private activity is omitted, results are limited, and event delivery can lag. Do not interpret this chart as an exact contribution streak or total.
- No personal access token is required. The browser uses GitHub's unauthenticated public REST API, so GitHub's per-IP unauthenticated API rate limit applies. For a profile dashboard with normal traffic, the five-minute refresh interval is intentionally conservative; if the API rate-limits a visitor, the page shows the error and can be refreshed later.

## Customize it

- Change the bio, interests, heading, or technologies in `README.md` and the matching text in `docs/index.html`.
- The account name is set in `docs/tracker.js` as `USERNAME = 'Sinflin'`. Change that constant if you reuse the dashboard for another account.
- The tech icons in the README are loaded from `skillicons.dev`; the dashboard itself does not require an icon service.
- The three featured project cards mirror the supplied reference (`SkillGap AI`, `TraceX`, and `WAF Project`). A card becomes clickable only when a matching public repository is returned by GitHub; otherwise it clearly says no matching public repository was found. Other public repositories are listed separately.

## Troubleshooting

- **README image broken:** make sure `docs/assets/profile-banner.png` was uploaded and preserve the folder path.
- **Dashboard returns 404:** confirm the Pages source is set to **GitHub Actions** and the deployment workflow succeeded.
- **Workflow does not run:** check that the branch is `main` or `master`, or add your branch to the workflow trigger.
- **Numbers show dashes or an API error:** open the dashboard again later or use **Refresh now**. GitHub may be rate-limiting or temporarily unavailable.

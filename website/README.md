# CleanSlate website

This is the public CleanSlate website. It has its own React and Vite package so desktop app changes do not require a website deployment. Vite builds the assets, then React renders `/` and `/download/` to static HTML for Firebase Hosting. The `404.html` page is also pre-rendered.

## Work locally

Use Node.js 22 or newer. From this folder:

```sh
npm ci
npm run dev
```

Run `npm run typecheck` and `npm run build` before shipping website changes. `npm run preview` serves the built site. The deployable files are in `dist/client`.

The Downloads page starts with a checked-in snapshot of published GitHub Releases, then requests the current list in the visitor's browser. A new desktop release therefore appears without rebuilding or deploying the website. If GitHub is unavailable, the snapshot stays visible. To refresh the pre-rendered snapshot, run `npm run sync:releases` and commit the updated `src/data/releases.json`.

## Deploy with Firebase Hosting

Hosting is already enabled for project `cleanslate-74af5`, and this folder has `firebase.json` and `.firebaserc`. From the repository root, run:

```sh
cd website
firebase init hosting:github
```

If Firebase asks you to sign in first, run `firebase login` and retry. Select project `cleanslate-74af5`, authorize GitHub, and choose `alejordanze/cleanslate`. Answer **No** when it offers to add a build script or a second live deployment workflow; the workflow in this repo handles both. The CLI still creates `.github/workflows/firebase-hosting-pull-request.yml` at the repository root. Remove that generated file before committing, along with `firebase-hosting-merge.yml` if you chose to create it. Keep `deploy-website.yml`, which has the required path filter.

The CLI names the GitHub secret `FIREBASE_SERVICE_ACCOUNT_CLEANSLATE_74AF5`. Confirm that name appears under **Settings → Secrets and variables → Actions** in the GitHub repository. The [website workflow](../.github/workflows/deploy-website.yml) already references it. Never commit or paste the JSON key; the CLI uploads it directly to GitHub's encrypted secrets store. If CLI setup fails, use the [Firebase action's manual service account guide](https://github.com/FirebaseExtended/action-hosting-deploy/blob/main/docs/service-account.md) and create the secret with the same name.

The [website workflow](../.github/workflows/deploy-website.yml) checks and builds website changes in pull requests. A push to `main` deploys the built site to the live Firebase Hosting channel only when `website/**` changed. Desktop-only pushes do not deploy the site. The Firebase Hosting configuration is in `firebase.json`.

The desktop release workflow remains separate. The website reads published desktop releases from GitHub; it does not create or modify them.

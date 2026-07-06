# Noted

A shared gift-idea notebook. See `noted-spec.md` (the doc from our planning
conversation) for the full product/data-model reasoning — this README is just
the "how do I actually get this running" part.

## What's here vs. what's stubbed

**Real and wired up:**
- Google sign-in, `users/{uid}` profile creation
- Home screen (this month + full people list)
- Person page (likes/dislikes/current ideas landing view, tabs for
  Info/Events/Past gifts/Q&A)
- Quick Add with multi-select checkboxes, writing an idea to several people at once
- Self-block on gift ideas — **read the comment at the top of
  `src/hooks/usePerson.js`** before touching this, it explains a genuinely
  non-obvious Firestore constraint
- Firestore + Storage security rules matching the spec
- Photo compression to WebP before upload

**Stubbed, needs finishing before it's real:**
- The Q&A shared question bank (`panel-qa` in `PersonPage.jsx` has a TODO comment)
- Groups (schema's in the rules/spec, no UI yet)
- Settings page (colour picker, archived people, calendar sync status)
- FCM push notifications — the Cloud Function calculates who to notify but
  doesn't yet send, because it needs a registration token from the client
  first (see the TODO in `functions/index.js`)
- Calendar sync needs the `BIRTHDAYS_CALENDAR_ID` secret and the service
  account added to your calendar's sharing settings (see below)
- App icons (`public/icon-192.png`, `public/icon-512.png`) are referenced in
  the manifest but not included — drop your own in

## First-time setup

1. **Create the Firebase project** at console.firebase.google.com. Enable:
   Firestore (Native mode), Authentication (Google provider), Storage,
   Functions, Hosting.

2. **Copy your web app config** (Project settings > General > Your apps) into
   `src/firebase.js`, replacing the `YOUR_...` placeholders.

3. **Add the service account to your Birthdays calendar:**
   Firebase console > Project settings > Service accounts — copy that email
   address, then in Google Calendar settings for your Birthdays calendar,
   share it with that email as "Make changes to events."

4. **Set the calendar ID — no CLI needed:**
   In the Firebase Console, go to Firestore Database, create a document at
   `config/settings`, and add a field `birthdaysCalendarId` with your
   calendar's ID (found in Google Calendar's settings, under "Integrate
   calendar"). Purely a Console/website step, same as everything else here.

## Doing this entirely from a browser, no installs at all

Everything above is Console/website work. For the code itself:

- **Editing:** github.com's built-in editor for small tweaks, or press `.` on
  the repo to open github.dev — a VS Code-*like* editor in the browser, no
  install, but it has no terminal (that's the one thing it can't do).
- **Installing dependencies / running locally:** this genuinely does need a
  terminal with Node.js — either a local install, or GitHub Codespaces (a full
  VS Code + terminal running in the browser, free tier available). You don't
  *have* to do this at all though — if you're happy pushing straight to GitHub
  and letting Actions build + deploy (below), you never need `npm install`
  yourself, same as how you already work on Noticeboard.
- **Previewing before it goes live:** without local dev, use Firebase Hosting
  preview channels — the Actions workflow below can be extended to deploy a
  preview URL per pull request rather than straight to production, so you get
  a live link to check before merging.
- **One-time Firebase CLI steps** (`firebase login`, `firebase use --add`,
  generating the service account key for GitHub Actions) are the one part
  that's genuinely easier with a terminal open at least once. If you want to
  avoid that entirely too: create the service account key manually via Google
  Cloud Console > IAM > Service Accounts > your Firebase service account >
  Keys > Add key (JSON) — a website, not a CLI — then paste that JSON into a
  GitHub Actions secret by hand.

## Working from VS Code (optional — not required)

```
git clone <your-repo-url>
cd noted-app
npm install
npm run dev          # local dev server, hot reload
```

Install the Firebase CLI once, globally, if you haven't:
```
npm install -g firebase-tools
firebase login
firebase use --add        # pick your project
```

## Deploying

```
npm run deploy                     # builds + deploys hosting only
firebase deploy --only firestore:rules,storage:rules
firebase deploy --only functions
```

Or all at once: `firebase deploy`.

## Working via GitHub's web UI (no local dev)

Since edits happen in the browser rather than a terminal, you won't be able to
run `npm run deploy` directly from GitHub — you'll need **GitHub Actions** to
build and deploy on every push, the same pattern you already have on York
Noticeboard. A starter workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Firebase
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: your-project-id
          channelId: live
```

Given the CI/CD debugging history on Noticeboard (stale `firestore.rules`
deploying from cache), it's worth adding an explicit
`firebase deploy --only firestore:rules` step here too rather than assuming
`action-hosting-deploy` covers it — that action only touches Hosting.

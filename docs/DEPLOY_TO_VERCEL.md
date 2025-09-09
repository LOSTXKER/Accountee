# Deploy to Vercel via GitHub Actions (Step-by-step)

This project deploys to Vercel using the workflow `.github/workflows/vercel-deploy.yml`.
Follow these steps to set it up end-to-end.

## 1) Create a Vercel Token
- Vercel Dashboard → Account Settings → Tokens → Create Token → copy and store it (shown once)
- This will be your `VERCEL_TOKEN`

## 2) Get Org ID and Project ID
- If you use a Team: Team → Settings → General → Team ID (use as `VERCEL_ORG_ID`)
- If you use a Personal account: Account Settings → General → User ID (use as `VERCEL_ORG_ID`)
- Open your Vercel Project → Settings → General → Project ID (use as `VERCEL_PROJECT_ID`)

Alternative via CLI (quick):
- In the project folder, run:
  - `npx vercel link`
- It creates `.vercel/project.json` containing `orgId` and `projectId`

## 3) Add GitHub Repository Secrets
GitHub → Repo → Settings → Secrets and variables → Actions → New repository secret
Add these three secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 4) Configure Environment Variables on Vercel
Vercel → Project → Settings → Environment Variables (Production/Preview/Development)
Add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Notes:
- Do NOT expose `SUPABASE_SERVICE_ROLE_KEY` to the browser; Vercel keeps it server-side.
- The app is coded to avoid crashing at build-time if secrets are missing, but API calls that need `supabaseAdmin` still require valid env at runtime.

## 5) Trigger a Deploy
- Push to `main` branch, or
- Manually from GitHub → Actions → “Deploy to Vercel” → Run workflow

The workflow now:
- Validates required secrets
- Delegates build & deploy to Vercel (build runs in Vercel environment)
- Prints the deployed URL in the job output

## 6) Troubleshooting
- If the workflow fails immediately with a message about missing secrets, set the three secrets in step (3).
- If Vercel build fails, check Vercel dashboard build logs and ensure env vars in step (4) are present in the selected environment (Production/Preview).
- Supabase storage buckets may need bootstrapping for some features. See `docs/archive/` and `scripts/bootstrap-storage.js`.

---

That’s it. Once everything is in place, each push to `main` will deploy automatically.

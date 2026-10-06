# Deployment (Render + GitHub Actions)

The repo ships with a Render Blueprint (`render.yaml`) that creates both
services and a GitHub Actions workflow (`.github/workflows/ci.yml`) that
checks every push. Render auto-deploys on every push to the connected
branch, so the pipeline is: **push -> CI checks -> Render redeploys**.

## One-time Render setup

1. Create a free account at render.com and choose **New > Blueprint**.
2. Connect the GitHub repo `17sushil/job` and select the `stable` branch.
   Render reads `render.yaml` and shows two services: `jobdev-api` and
   `jobdev-web`.
3. Before applying, create an **Env Group** named `jobdev-secrets` with:
   - `DATABASE_URL` = your Neon connection string
     `postgresql://neondb_owner:...@ep-old-tooth-.../Jobdev?sslmode=require`
   - `JWT_SECRET` = any long random string
4. Apply the blueprint. First build takes a few minutes (free tier sleeps
   after inactivity; the first request after a sleep is slow).

## URLs

- API: `https://jobdev-api.onrender.com` (health: `/health`)
- Web: `https://jobdev-web.onrender.com`

`NEXT_PUBLIC_API_URL` in the blueprint points the Next.js proxy at the API
service. If Render gives the API a different URL, update that env var on the
`jobdev-web` service and redeploy.

## CI

`.github/workflows/ci.yml` runs lint + production builds for both apps on
every push and PR. Merging is safe only when CI is green.

## Testing OTP on the deployed app

`STATIC_OTP=123456` is set for the API service, so logins and signups on the
live site verify with `123456`. Remove that env var when you want real
random OTPs (an email/SMS sender is required to deliver them).

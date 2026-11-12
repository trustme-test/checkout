# Deployment

Production runs on [Vercel](https://vercel.com) on the free Hobby plan. GitHub Actions deploys it:

| Event                | What runs                                               |
| -------------------- | ------------------------------------------------------- |
| Pull request         | `verify`: lint, format check, typecheck, tests, build   |
| Push to `main`       | `verify`, then `deploy-production` if it passes         |
| Manual run on `main` | `verify`, then `deploy-production` (use it to redeploy) |

The workflow is [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). A commit that fails any
check is never deployed. Runs on `main` are queued, so merged commits deploy in order.

## How the deploy works

The `deploy-production` job uses the Vercel CLI (pinned with `VERCEL_CLI_VERSION` in the workflow):

1. `vercel pull --environment=production` downloads the project settings.
2. `vercel build --prod` builds the app on the GitHub runner.
3. `vercel deploy --prebuilt --prod` uploads the build output and promotes it to production.

The deployment URL is shown on the workflow run and on the repository's **production** environment.

Vercel's own Git integration is turned off in [`vercel.json`](../vercel.json)
(`git.deploymentEnabled: false`) so commits are not deployed twice. Deploying from GitHub Actions
also works for private repositories owned by a GitHub organization, which the Hobby plan's Git
integration does not support.

The app needs no environment variables.

## One-time setup

You need a Vercel account (Hobby is enough) and admin access to this GitHub repository.

1. **Create the Vercel project and link it.** From a local clone:

   ```bash
   npx vercel login
   npx vercel link
   ```

   Choose your account as the scope and create a new project named `checkout`. Accept the detected
   Next.js settings. This writes `.vercel/project.json` (ignored by Git).

2. **Read the ids** from `.vercel/project.json`:

   ```bash
   cat .vercel/project.json
   # {"projectId":"prj_...","orgId":"team_..."}
   ```

3. **Create a token** at https://vercel.com/account/tokens. Scope it to the account that owns the
   project and give it an expiry date.

4. **Add three repository secrets** under _Settings → Secrets and variables → Actions_, or with the
   GitHub CLI:

   ```bash
   gh secret set VERCEL_TOKEN        # paste the token
   gh secret set VERCEL_ORG_ID       # the orgId value
   gh secret set VERCEL_PROJECT_ID   # the projectId value
   ```

5. **Deploy.** Push to `main`, or run the workflow manually from the _Actions_ tab on `main`.

### Recommended repository settings

- Protect `main`: require a pull request and the **Lint, typecheck, test and build** check before
  merging, and block force pushes.
- Optionally require approval for the **production** environment if deploys should be gated.

## Rolling back

Every deployment stays available on Vercel. To roll back:

- In the Vercel dashboard, open the project's **Deployments**, pick the last good deployment and
  choose **Instant Rollback**, or
- From the CLI: `npx vercel rollback --token=<token>` returns to the previous production
  deployment. Pass a deployment URL to pick a specific one.

Then revert the bad commit on `main` with a pull request. The next deploy replaces the rollback.

## Troubleshooting

| Symptom                                               | Fix                                                                  |
| ----------------------------------------------------- | -------------------------------------------------------------------- |
| `Repository secret VERCEL_TOKEN is not set`           | Add the secrets in step 4                                            |
| `vercel pull` fails with a 403 or "Project not found" | The token's scope does not include the project, or the ids are wrong |
| The token expired                                     | Create a new token and update `VERCEL_TOKEN`                         |
| Build passes locally but fails in CI                  | Run `npm ci && npm run build` with Node 22 to reproduce              |

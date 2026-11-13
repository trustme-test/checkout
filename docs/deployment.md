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

## Environment variables

The app runs without any. These turn on optional features:

| Name         | Required                          | Value                                                                                                                      |
| ------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `DD_API_KEY` | No. Audit logs are off without it | A Datadog API key. Mark it **Sensitive**                                                                                   |
| `DD_SITE`    | No. Defaults to `datadoghq.com`   | Your Datadog site, e.g. `datadoghq.eu`, `us3.datadoghq.com`, `us5.datadoghq.com`, `ap1.datadoghq.com`, `ap2.datadoghq.com` |

Set them in the Vercel dashboard, not in GitHub secrets: the functions read them at runtime.
A change takes effect on the next deployment.

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

6. **Optional: turn on audit logs** by following [Audit logs in Datadog](#audit-logs-in-datadog).

### Recommended repository settings

- Protect `main`: require a pull request and the **Lint, typecheck, test and build** check before
  merging, and block force pushes.
- Optionally require approval for the **production** environment if deploys should be gated.

## Audit logs in Datadog

The `POST` API routes send one log entry per call to Datadog. See
[architecture.md](architecture.md#external-services) for what each entry contains.

1. **Find your Datadog site.** Log in to Datadog and look at the address bar. The site is the part
   after `app.` or after the subdomain: `app.datadoghq.com` → `datadoghq.com`,
   `app.datadoghq.eu` → `datadoghq.eu`, `us5.datadoghq.com` → `us5.datadoghq.com`.
2. **Create an API key.** In Datadog, open **Organization Settings → API Keys** and select
   **+ New Key**. Name it `checkout-vercel` and select **Create Key**. Copy the key. It must be an
   API key: application keys do not work with the log intake.
3. **Add the variables in Vercel.** Open the `checkout` project, then **Settings → Environment
   Variables**. Add `DD_API_KEY` with the key, turn on **Sensitive**, and select the environments
   to log (at least **Production**). If your site is not `datadoghq.com`, add `DD_SITE` the same
   way (it does not need to be sensitive). Select **Save**.
4. **Redeploy.** Run the workflow manually from the _Actions_ tab on `main`.
5. **Check it works.** Call the API, for example get a quote:

   ```bash
   curl -X POST https://<your-domain>/api/quote \
     -H 'content-type: application/json' \
     -d '{"items":[{"productId":"stoneware-mug","quantity":1}]}'
   ```

   In Datadog, open **Logs → Explorer** and search for `service:checkout`. The entry appears within
   a minute.

To rotate the key, create a new one, replace `DD_API_KEY` in Vercel, redeploy, then revoke the old
key in Datadog. To turn audit logs off, delete `DD_API_KEY` and redeploy.

Datadog keeps logs for the retention period of the index they land in. If you need audit logs for
longer, check the index retention or set up a log archive in Datadog.

## Rolling back

Every deployment stays available on Vercel. To roll back:

- In the Vercel dashboard, open the project's **Deployments**, pick the last good deployment and
  choose **Instant Rollback**, or
- From the CLI: `npx vercel rollback --token=<token>` returns to the previous production
  deployment. Pass a deployment URL to pick a specific one.

Then revert the bad commit on `main` with a pull request. The next deploy replaces the rollback.

## Troubleshooting

| Symptom                                               | Fix                                                                                                                                                                                                                   |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Repository secret VERCEL_TOKEN is not set`           | Add the secrets in step 4                                                                                                                                                                                             |
| `vercel pull` fails with a 403 or "Project not found" | The token's scope does not include the project, or the ids are wrong                                                                                                                                                  |
| The token expired                                     | Create a new token and update `VERCEL_TOKEN`                                                                                                                                                                          |
| Build passes locally but fails in CI                  | Run `npm ci && npm run build` with Node 22 to reproduce                                                                                                                                                               |
| No audit logs in Datadog                              | Check the function logs in Vercel for "Datadog log intake returned HTTP 403" (wrong key, or an application key) or "Could not send audit log" (wrong `DD_SITE`). Make sure you redeployed after setting the variables |

## Summary

<!-- What does this change do, and why? One or two sentences. -->

Closes #

## Changes

<!-- The main changes, as a short list. Call out anything reviewers should look at closely. -->

-

## How I tested it

<!-- Commands you ran and what you checked by hand, e.g. "bought two mugs with the declined test card". -->

- [ ] `npm run check` passes
- [ ] `npm run build` passes
- [ ] Tested the change in the browser (UI changes only)

## Checklist

- [ ] Tests cover the new or changed behavior
- [ ] `docs/api.md` and `src/lib/types.ts` are updated if the API contract changed
- [ ] Docs (`README.md`, `docs/`, `AGENTS.md`) are updated if behavior or setup changed
- [ ] No new dependencies, or the reason for each is explained above
- [ ] No card data is logged, stored or returned (only brand and last four digits)

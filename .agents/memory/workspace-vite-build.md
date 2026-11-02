---
name: Workspace Vite build environment
description: Root workspace builds invoke artifact builds without dev-workflow environment injection.
---

The root `pnpm run build` runs package build scripts without the Replit development workflow's `PORT` and `BASE_PATH` values.

**Why:** artifact builds must work in a clean build environment as well as in the configured preview workflow.

**How to apply:** when adding or changing an artifact Vite config, keep development server settings compatible with workflow variables while allowing production builds to use safe defaults.

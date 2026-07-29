---
name: always-use-dev-clean
description: Use npm run dev:clean instead of next dev to avoid stale CSS cache
metadata:
  type: feedback
---

Always run `npm run dev:clean` (not `next dev`) before asking user to check the browser.

**Why:** The Next.js dev server caches compiled CSS assets in `.next/`. When files change across branches or multiple edits, the cache goes stale and all Ant Design styles disappear. Clearing `.next/` before starting fixes this reliably.

**How to apply:** Before telling the user to open any URL in the browser, kill all node processes, then `npm run dev:clean`. Also run it whenever the user reports "styles are gone".

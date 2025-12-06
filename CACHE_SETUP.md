# Cloudflare Setup Instructions

## Cloudflare Images

Cloudflare Images is now configured in your Next.js app. You need to enable it in the dashboard:

1. Go to https://dash.cloudflare.com
2. Select your zone/domain
3. Navigate to **Images** in the sidebar
4. Click **Enable Cloudflare Images**
5. Under **Allowed Source Origins**, add your R2 bucket or image sources for security

The custom loader is already set up in `image-loader.ts` and configured in `next.config.mjs`.

---

# Cache Setup Instructions

## 1. Run the setup script
```bash
chmod +x setup-cache.sh
./setup-cache.sh
```

## 2. Update wrangler.toml
Copy the `database_id` from the output above and replace `YOUR_DATABASE_ID_HERE` in `wrangler.toml`

## 3. Run D1 migration
```bash
# For remote (production)
npx wrangler d1 execute topcasts-tag-cache --remote --file=./migrations/0001_create_revalidations_table.sql
npx wrangler d1 execute topcasts-tag-cache --remote --file=./migrations/0002_reset_revalidations_table.sql

# For local development
npx wrangler d1 execute topcasts-tag-cache --local --file=./migrations/0001_create_revalidations_table.sql
npx wrangler d1 execute topcasts-tag-cache --local --file=./migrations/0002_reset_revalidations_table.sql
```

> The second migration rebuilds the `revalidations` table with `ON CONFLICT REPLACE`, so repeated `revalidateTag` writes no longer fail with a unique-constraint error.

## 4. Update deployment
Your `package.json` already has the correct deploy script that will populate the cache:
```bash
npm run deploy
```

This runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy` which automatically populates the cache.

## What's enabled
- **R2 Incremental Cache**: Stores cached page data
- **D1 Tag Cache**: Tracks revalidation times for `revalidatePath`
- **No Queue**: Not needed since you only use on-demand revalidation (no time-based revalidation)

## Testing revalidation
Your login/logout actions already use `revalidatePath('/', 'layout')` - this will now properly invalidate cached pages.

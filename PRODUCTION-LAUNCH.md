# Texas Home Hub Pro — Production Launch V1

## 1. Branch protection and audit

Run locally before every release:

```bash
npm run audit
```

The GitHub Actions workflow also runs this audit on pushes to `v2-platform` and `master`, and on pull requests targeting `master`.

Do not merge while the workflow is failing.

## 2. Supabase database activation

Run these files in the Supabase SQL Editor in this order:

1. `database/schema.sql`
2. `database/auth-profiles.sql`
3. `database/admin-crm.sql`
4. `database/property-management.sql`

Promote the production administrator only after that user has signed up:

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR-ADMIN-EMAIL@example.com';
```

Verify that regular accounts cannot open or modify CRM and property-management records.

## 3. Browser configuration

Populate `assets/js/supabase-config.js` with the Supabase project URL and public anonymous key.

Never place the service-role key, database password, JWT secret, or private API credentials in browser files or Vercel public variables.

## 4. Supabase authentication URLs

In Supabase Authentication URL Configuration, set:

- Site URL: `https://texashomehubs.com`
- Redirect URL: `https://texashomehubs.com/auth-callback`
- Redirect URL: `https://texashomehubs.com/reset-password`
- Local testing URL as needed, such as `http://127.0.0.1:5500/auth-callback.html`

## 5. Vercel deployment

Import `spastores70/real-estate-website` into Vercel.

Recommended settings:

- Framework preset: Other
- Build command: leave empty
- Output directory: leave empty
- Production branch: `master`

Use a preview deployment for `v2-platform`. Only merge to `master` after the preview passes the test matrix below.

## 6. Domain and DNS

Connect both domains in Vercel:

- `texashomehubs.com`
- `www.texashomehubs.com`

Set `texashomehubs.com` as primary and redirect the `www` version to it.

The included `robots.txt` and `sitemap.xml` assume this production domain.

## 7. Production test matrix

### Public site

- Home page loads without console errors.
- Mobile navigation opens and closes.
- Search Homes opens the listing results page.
- Filters and sorting work.
- Property detail pages load from Supabase when published inventory exists.
- Demo fallback appears when no published inventory exists.
- Save Home prompts unauthenticated visitors to sign in.
- Showing request submits successfully.
- 404 page appears for an invalid route.

### Authentication

- Signup creates a profile row.
- Login returns the user to the requested protected page.
- Password reset email and callback work on the production domain.
- Sign-out clears the authenticated interface.

### Customer dashboard

- Saved homes load.
- Saved homes can be removed.
- Showing history loads.
- Profile edits persist.
- Role personalization matches the profile role.

### Admin CRM

- Non-admin users are redirected.
- Administrator metrics load.
- Leads can be created and edited.
- Notes and follow-up dates persist.
- Showing status and internal notes persist.
- User directory loads without exposing private authentication secrets.

### Property management

- Property can be created as a draft.
- Multiple images upload to `property-images`.
- Publishing makes the property visible publicly.
- Unpublishing removes it from public results.
- Editing persists price, facts, description, features, badge, and category.
- Deleting a property removes database image records.

### Responsive testing

Test at minimum:

- 390 × 844 mobile
- 768 × 1024 tablet
- 1440 × 900 desktop

## 8. Release procedure

1. Confirm the GitHub audit workflow is green on `v2-platform`.
2. Open the Vercel preview deployment.
3. Complete the production test matrix.
4. Back up the Supabase database.
5. Merge `v2-platform` into `master`.
6. Confirm the Vercel production deployment succeeds.
7. Repeat the smoke tests on `https://texashomehubs.com`.
8. Submit `sitemap.xml` in Google Search Console after launch.

## Known pre-launch requirement

`assets/js/supabase-config.js` currently contains blank values. Database, authentication, CRM, uploads, and portal features will not operate online until the Supabase URL and public anonymous key are entered.

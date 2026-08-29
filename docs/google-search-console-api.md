# Google Search Console API access

Quoska includes a local command-line client for Search Console analysis. It can
read properties, search performance, submitted sitemaps, and Google's indexed
URL inspection result. An explicit, separately stored write grant can submit a
sitemap. It cannot delete sitemaps, change properties, or request indexing.

Analysis commands request only this OAuth scope:

```text
https://www.googleapis.com/auth/webmasters.readonly
```

Sitemap submission requires a separate authorization with Google's read/write
scope. The CLI uses it only for `submit-sitemap`:

```text
https://www.googleapis.com/auth/webmasters
```

OAuth credentials and tokens must stay outside the repository. By default the
client uses:

```text
~/.config/quoska/search-console/oauth-client.json
~/.config/quoska/search-console/token.json
~/.config/quoska/search-console/write-token.json
```

All credential files must be readable only by the current user (`chmod 600`), and the
directory is maintained with mode `700`. The token is written atomically.

## One-time Google Cloud setup

1. Open [Google Cloud Console](https://console.cloud.google.com/), select or
   create a project, and enable the **Google Search Console API**.
2. Configure the project's OAuth consent screen. Add only the Google account
   that already has access to the Quoska Search Console property as a test user
   if the application remains in testing mode.
3. Under **APIs & Services → Credentials**, create an **OAuth client ID** with
   application type **Desktop app**.
4. Download the JSON file and place it outside this repository:

   ```bash
   install -d -m 700 "$HOME/.config/quoska/search-console"
   install -m 600 /absolute/path/to/downloaded-client.json \
     "$HOME/.config/quoska/search-console/oauth-client.json"
   ```

Do not paste the client file or token into chat, an issue, a commit, or a
production environment variable.

## Authorize

Run:

```bash
npm run search-console -- auth --open
```

The command starts a callback on `127.0.0.1` with a random port, generates a
PKCE challenge and CSRF state, and opens Google's consent page. Sign in with the
Google account that can access `sc-domain:quoska.de`, verify that the requested
permission is read-only, and approve it. The local callback stores the token in
the private config directory.

Check connection state and accessible properties:

```bash
npm run search-console -- status
npm run search-console -- sites
```

For sitemap submissions, create the separate write token explicitly:

```bash
npm run search-console -- auth --write --open
```

Google's consent screen must show read/write Search Console access. The default
read-only token is not replaced.

## Analysis commands

List submitted sitemaps:

```bash
npm run search-console -- sitemaps
```

Query finalized web-search performance for a date range:

```bash
npm run search-console -- performance \
  --start-date 2026-07-01 \
  --end-date 2026-07-31 \
  --dimensions date,query,page \
  --row-limit 25000
```

Optional exact filters are `--query`, `--page`, `--country`, and `--device`.
Use `--start-row` to paginate. Without dates, the client requests the 28-day
window ending three days ago to avoid treating incomplete recent data as final.

Inspect what Google knows about an indexed URL:

```bash
npm run search-console -- inspect \
  --url https://quoska.de/stundenzettel
```

The URL Inspection API returns information about Google's indexed copy. It is
not a live page test and cannot submit an indexing request.

For another property, set `GOOGLE_SEARCH_CONSOLE_PROPERTY` or pass
`--property`. Domain properties use the exact `sc-domain:example.com` form.

## Submit a sitemap

After the explicit write authorization, submit an absolute sitemap URL:

```bash
npm run search-console -- submit-sitemap \
  --property sc-domain:quoska.de \
  --sitemap https://quoska.de/sitemap.xml
```

This is the client's only write operation. A successful API response confirms
submission, not that Google has crawled or indexed every URL.

## Disconnect

Revoke Quoska's grant from the Google account's third-party connections page,
then move the local `token.json` to trash. The command intentionally has no
remote mutation or automated revoke operation.

Official references:

- [Authorize Search Console API requests](https://developers.google.com/webmaster-tools/v1/how-tos/authorizing)
- [Search Console API reference](https://developers.google.com/webmaster-tools/v1/api_reference_index)
- [Submit a sitemap](https://developers.google.com/webmaster-tools/v1/sitemaps/submit)
- [Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- [URL Inspection API](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)

# Microsoft Tenant ID

Look up the **Microsoft Entra (Azure AD) tenant ID** for any domain, email address, or URL — right from Raycast. Resolve one domain or a whole list at once, see the organization name and sign-in type, and copy the result in whatever format you need. You can also go the other way — paste a tenant ID to reveal the organization behind it.

## How it works

Every Microsoft Entra tenant exposes a public OpenID Connect discovery document at:

```
https://login.microsoftonline.com/<domain>/v2.0/.well-known/openid-configuration
```

The tenant ID (a GUID) is embedded in the `issuer` URL of that document. This extension reads that endpoint for whatever you type and pulls out the tenant ID, then enriches it with the organization name and authentication type from the public `getuserrealm.srf` endpoint. No authentication and no API key required — it only uses public metadata.

## Commands

### Find Tenant ID

Search-as-you-type lookup with a rich detail view.

- Accepts a **domain** (`contoso.com`), an **email address** (`alice@contoso.com`), or a **URL** (`https://www.contoso.com/team`) — the input is normalized automatically.
- **Bulk lookups**: paste several domains separated by commas, tabs, spaces, semicolons, or new lines to resolve them all in parallel, one result row each.
- Shows the tenant ID plus the **organization name**, **authentication type** (Managed or Federated), **national cloud**, region scope, and handy links.
- **Recent lookups** are remembered and shown when the search bar is empty — re-run or remove any of them.
- Can be launched with an argument or as a **Quicklink**, so you can wire it to a hotkey or pass a domain in directly.

### Resolve Tenant ID from Clipboard

A no-view command: reads the domain from your **current selection** (or the clipboard as a fallback), resolves it, copies the tenant ID, and shows the result in a HUD. Paste a list and it copies every tenant ID as CSV.

### Find Organization by Tenant ID (reverse lookup)

The forward commands need no sign-in. **Reverse lookup is a little different.** Well-known **personal-account** tenant IDs — the shared consumer tenants behind outlook.com, hotmail.com, live.com, and Microsoft accounts on other domains — are recognized **instantly, with no sign-in**. For an **organization** tenant ID, going from **ID → organization name + domain** is only possible through Microsoft Graph's [`findTenantInformationByTenantId`](https://learn.microsoft.com/graph/api/tenantrelationship-findtenantinformationbytenantid), which requires an authenticated call — so the first time you resolve an org tenant, the command asks you to sign in with a **work or school** Microsoft account.

Paste a tenant GUID and it returns the tenant's **organization display name** and **default domain** (`*.onmicrosoft.com`). Great for turning a tenant ID from a token, log, or sign-in error into a recognizable organization.

> Sign-in uses a **public client + PKCE flow with no client secret**, and the app registration is **built in** — there's nothing to configure. You're only prompted the first time you resolve an **organization** tenant ID; personal-account tenant IDs need no sign-in. Each user signs into their own tenant and consents to a single low-privilege scope, `CrossTenantInformation.ReadBasic.All`. Tokens are stored locally in your Raycast; nothing is hosted or shared. Reverse lookup covers the commercial cloud.

## Signing in

Nothing to set up. **Personal-account tenant IDs** resolve instantly with no sign-in. The first time you resolve an **organization** tenant ID, Raycast opens a Microsoft sign-in in your browser — approve the one-time consent and you're done. You can **Sign out** anytime from the command's actions. The app registration is built in, so each user simply signs into their own tenant.

**Sign-in requires a work or school account.** Personal Microsoft accounts can't be used to sign in — Microsoft Graph's reverse-lookup API doesn't support them as the caller. So if you only have a personal account, you can still use every no-sign-in feature (the forward lookups and personal-account tenant IDs), but resolving an arbitrary *organization* tenant ID needs a work or school account.

### Using your own app registration (optional)

The extension ships with a built-in multitenant Application (client) ID, so you don't need your own. If you fork the extension and want to point it at your own registration, replace the `CLIENT_ID` constant in `src/lib/auth.ts`. To create one:

1. Open the [Microsoft Entra admin center](https://entra.microsoft.com/) → **Identity → Applications → App registrations → + New registration**.
2. **Name** it (e.g. `Raycast Tenant Lookup`); under **Supported account types** pick **Accounts in any organizational directory (Multitenant)**.
3. Under **Redirect URI**, select the platform **Public client/native (mobile & desktop)** and enter:

   ```
   https://raycast.com/redirect?packageName=Extension
   ```

4. Click **Register**, open **Authentication**, and confirm **Allow public client flows** is **Yes** (avoids the `AADSTS7000218` error).
5. Open **API permissions → + Add a permission → Microsoft Graph → Delegated permissions** and add **`CrossTenantInformation.ReadBasic.All`** — the only permission needed (you can remove the default `User.Read`).
6. Copy the **Application (client) ID** from the app's **Overview** into `CLIENT_ID` in `src/lib/auth.ts`.

> **The Application (client) ID is not a secret.** It grants no access on its own — every user still authenticates with their own Microsoft account — so it's safe to commit to source control.

## Copy formats

From any result you can copy the tenant ID, or via **Copy as…**:

- Login authority URL (`https://login.microsoftonline.com/<tenant-id>`)
- Azure CLI — `az login --tenant <id>`
- Azure PowerShell — `Connect-AzAccount -TenantId <id>`
- Microsoft Graph PowerShell — `Connect-MgGraph -TenantId <id>`
- JSON
- Domain

For bulk results, **Copy All as CSV** and **Copy All Tenant IDs** are available too.

## National clouds

Domains are checked against the commercial cloud first, then **US Gov** (GCC High / DoD) and **China (21Vianet)**. The result shows which cloud a tenant lives in, and the Open actions point at the matching portals.

## Notes

- Not every domain maps to a Microsoft tenant — if the domain isn't backed by Entra, you'll see a "No Microsoft tenant found" message.
- The lookup only reveals a tenant's existence and its ID, both of which are public information.

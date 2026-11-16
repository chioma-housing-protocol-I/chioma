# SDK Usage Guide

This covers how to actually *use* a Chioma API client once you have one, in
JavaScript, Python, and Go. For how to generate that client in the first
place, see [SDK-GENERATION.md](SDK-GENERATION.md).

> **There is no hand-maintained, officially published Chioma SDK today.**
> The only real client-generation path is the OpenAPI Generator workflow in
> `SDK-GENERATION.md`, run against this backend's own `openapi.json`. See
> **A note on `@chioma/sdk`, `chioma-sdk`, and `chioma-go`** below before
> you go looking for a package to install.

## 1. Generate a client

```bash
cd backend
pnpm run openapi:generate     # produces backend/openapi.json
npx @openapitools/openapi-generator-cli generate \
  -i openapi.json -g typescript-fetch -o ../sdk-ts
# -g python / -g go for the other languages
```

The generated client's method names and types come directly from the
OpenAPI spec (`@ApiOperation`/`@ApiResponse` decorators on each
controller), so they track the API as it evolves.

## 2. Authenticate

Every generated client needs the same two credentials the raw API does
(full detail in [`AUTHENTICATION_GUIDE.md`](AUTHENTICATION_GUIDE.md)):
Bearer/JWT for user-session calls, or an `x-api-key` for server-to-server
calls. Generated clients expose this as constructor/config options, not a
separate SDK-specific auth flow.

### JavaScript / TypeScript

```typescript
import { Configuration, PropertiesApi } from './sdk-ts';

const config = new Configuration({
  basePath: 'https://api.chioma.app/api/v1',
  accessToken: () => myStoredAccessToken, // Bearer/JWT
  // or: headers: { 'x-api-key': myApiKey },
});

const propertiesApi = new PropertiesApi(config);
const page = await propertiesApi.findAll({ page: 1, limit: 20 });
console.log(page.data.length, 'properties');
```

### Python

```python
from sdk_python import ApiClient, Configuration
from sdk_python.api.properties_api import PropertiesApi

config = Configuration(host="https://api.chioma.app/api/v1")
config.access_token = my_stored_access_token  # Bearer/JWT
# or: config.api_key["x-api-key"] = my_api_key

with ApiClient(config) as client:
    properties_api = PropertiesApi(client)
    page = properties_api.find_all(page=1, limit=20)
    print(len(page.data), "properties")
```

### Go

```go
package main

import (
	"context"
	"fmt"

	sdk "example.com/sdk-go"
)

func main() {
	cfg := sdk.NewConfiguration()
	cfg.Servers = sdk.ServerConfigurations{{URL: "https://api.chioma.app/api/v1"}}

	ctx := context.WithValue(context.Background(), sdk.ContextAccessToken, myStoredAccessToken)
	client := sdk.NewAPIClient(cfg)

	page, _, err := client.PropertiesAPI.FindAll(ctx).Page(1).Limit(20).Execute()
	if err != nil {
		panic(err)
	}
	fmt.Println(len(page.Data), "properties")
}
```

## 3. Handling errors

Generated clients surface the backend's consistent error shape
(`{ statusCode, message, error }`, see `AUTHENTICATION_GUIDE.md`'s Error
Handling section) as a typed exception/error value rather than a raw
HTTP response; check your generator's docs for the exact type name
(e.g. `ApiException` for the `typescript-fetch` generator).

## A note on `@chioma/sdk`, `chioma-sdk`, and `chioma-go`

`frontend/app/developer/sdks/page.tsx` currently advertises three
officially published SDKs: `@chioma/sdk` (npm), `chioma-sdk` (PyPI), and
`chioma-go` (Go modules), each with a version number, a status
(`stable`/`beta`/`alpha`), and a GitHub link
(`github.com/chioma-protocol/chioma-js`, `-python`, `-go`).

**All three GitHub links 404.** None of these packages exist as of this
writing; the page's content appears to be placeholder/aspirational
copy that was never replaced with the real state. This is misleading to
any real developer who visits that page expecting to `npm install
@chioma/sdk` and finds nothing. Flagging this here rather than fixing the
frontend page in this PR, since removing or rewriting developer-facing
marketing copy is a product decision outside a docs issue's scope; see
the PR description's Disclosures section.

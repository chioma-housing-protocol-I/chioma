# Community & Support

## Feedback

We welcome bug reports, feature requests, and general feedback.

- **API**: `POST /api/feedback` — no auth required. Optional JWT to attach feedback to your account.
  - Body: `{ "message": "...", "type": "bug"|"feature"|"support"|"general", "email": "optional@email.com" }`
- Use the [Interactive API docs](/api/docs) to try it, or send feedback from your app.

## Support channels

- **GitHub**: [Open an issue](https://github.com/chioma/chioma/issues) for bugs or feature requests.
- **Documentation**: [API docs](/api/docs), [API Changelog](./API-CHANGELOG.md), [SDK generation](./SDK-GENERATION.md).
- **Security**: See [security.txt](/.well-known/security.txt) and the repo’s security policy.

## Developer portal

- **Portal**: [/developer-portal](/developer-portal) — get started, create API keys, and find links to the API.
- **API keys**: Create and manage keys at `POST/GET/DELETE /api/developer/api-keys` (JWT required).

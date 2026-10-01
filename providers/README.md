# Providers

Add authorized providers here. Each provider should accept a normalized title/ID and return only stream URLs that the provider is permitted to expose.

Recommended structure:

- `providers/<provider>.js`
- `search(type, id, options)`
- return `{ url, title, name, language, provider }`

The addon can then run providers in parallel and merge/deduplicate their results.

Do not add providers that bypass access controls or redistribute copyrighted streams without authorization.

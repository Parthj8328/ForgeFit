# Relic — Test Credentials

## Auth model
Relic uses a **shared-vault passcode** (no per-user accounts). Anyone with the vault name + passcode can enter.
Entering a correct passcode returns a JWT stored in `localStorage` under `relic_token`, sent as `Authorization: Bearer <token>`.

## Test vault
- Vault name: `Aurora & Kai`
- Passcode: `starlight`

(Created via the UI/API during development. Contains a milestone + letter memory.)

## Create a fresh vault (API)
```
curl -X POST $API/vaults -H "Content-Type: application/json" \
  -d '{"name":"My Vault","passcode":"1234"}'
```
Returns `{ token, vault }`.

## Key endpoints
- POST /api/vaults           -> create vault (name, passcode)
- POST /api/vaults/enter     -> enter vault (name, passcode)
- GET  /api/vault/me         -> current vault (auth)
- GET  /api/memories         -> list memories (auth, capsule masking applied)
- POST /api/memories         -> create memory (auth)
- GET  /api/memories/{id}    -> single memory (auth)
- PATCH /api/memories/{id}   -> update (is_scratched, content, title) (auth)
- DELETE /api/memories/{id}  -> delete (auth)
- POST /api/upload           -> upload file (multipart, auth)
- GET  /api/files/{path}     -> download file (auth via header or ?auth= query)

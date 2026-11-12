# IVR Service – Call Masking

NestJS + TypeScript microservice that lets two people call each other **without seeing each other's real number**. Telephony provider: Exotel. Database: PostgreSQL (TypeORM).

## How masking works

1. Another service calls `POST /api/v1/masking-sessions` with the two real numbers (`partyA`, `partyB`).
2. We pick a free **virtual number** (an Exotel ExoPhone from our pool) and store the session.
3. Both parties dial that virtual number. Exotel asks us `GET|POST /api/v1/exotel/incoming` where to route it.
4. We look up the active session, find the **other** party and answer with their number. The callee sees the virtual number as caller ID.
5. When the call ends, Exotel hits `/api/v1/exotel/status` and we store the outcome in `call_logs`.

Sessions expire after a TTL or can be ended early (`DELETE /api/v1/masking-sessions/:id`).

## Architecture (dependencies point inward)

```
src/
  domain/          Pure TypeScript: entities, PhoneNumber, errors, repository ports. No framework imports.
  application/     Use cases (one class per action) + ports (clock, id generator, settings).
  infrastructure/  TypeORM entities/repositories, env settings, DI bindings for the ports.
  presentation/    HTTP: controllers, DTOs, guards, error filter.
  shared/          Result pattern (same idea as the Identity API).
test/              Use-case tests with in-memory fakes (no DB needed).
```

Use cases return `Result<T>` instead of throwing; controllers call `unwrap()` to turn failures into HTTP errors.

## Run

```bash
cp .env.example .env
docker compose up -d        # PostgreSQL
npm install
npm run start:dev
npm test
```

Swagger: http://localhost:5200/api-docs (needs Node 20+).

## Endpoints

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/v1/virtual-numbers` | `X-Api-Key` | Add an Exotel number to the pool |
| `POST /api/v1/masking-sessions` | `X-Api-Key` | Create a session `{partyA, partyB, ttlMinutes?, referenceId?}` |
| `GET /api/v1/masking-sessions/:id` | `X-Api-Key` | Read a session |
| `DELETE /api/v1/masking-sessions/:id` | `X-Api-Key` | End a session |
| `ALL /api/v1/exotel/incoming?token=…` | webhook token | Exotel "Connect" applet dynamic URL |
| `ALL /api/v1/exotel/status?token=…` | webhook token | Exotel status callback |

## Exotel setup

1. Add your ExoPhone numbers with `POST /virtual-numbers`.
2. In the Exotel flow for each ExoPhone, add a **Connect** applet with a dynamic URL: `https://<host>/api/v1/exotel/incoming?token=<WEBHOOK_TOKEN>`.
3. Set the StatusCallback URL to `https://<host>/api/v1/exotel/status?token=<WEBHOOK_TOKEN>`.

## Notes / known limits

- `DB_SYNCHRONIZE=true` auto-creates tables for dev. Use migrations in production.
- Pinned to NestJS 11 / TypeScript 5: NestJS 12 is ESM-only and needs a newer Node than 20.9.
- Not included (out of scope): IVR agent flows and outbound click-to-call.
- Virtual-number allocation is not race-proof: two simultaneous requests for overlapping parties could be given the same number. Add a lock or DB constraint if that matters at your volume.
- Check the Exotel dynamic-URL response format against your account's docs; it is implemented in `exotel-webhook.controller.ts`.

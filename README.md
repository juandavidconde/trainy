# Trainy

Tu plan de entrenamiento, vivo. Trainy es el tracker web del skill **Trainy** para Claude: el skill hace de coach (assessment → plan personalizado) y esta app es donde entrenás — log de series desde el celular, historial, PRs y progresión, con datos sincronizados en tu propia base de datos.

- **Multi-usuario**: una instancia sirve para vos y las personas que asesorás. El primer usuario registrado es el coach y puede ver el progreso del resto.
- **Compatible con el skill**: importa el `plan.json` que genera el skill y exporta tus logs en el formato `tracker_*.json` que el skill sabe analizar.
- **Tuya**: deployás tu propia instancia en Railway en ~5 minutos. Tus datos no viven en el repo ni en servicios de terceros.

## Stack

Next.js (App Router) · PostgreSQL · Prisma · NextAuth (Google opcional + email/password) · Tailwind.

## Deploy en Railway

1. Fork o clon de este repo en tu GitHub.
2. En [Railway](https://railway.app): **New Project → Deploy from GitHub repo** y elegí tu fork.
3. Agregá una base **PostgreSQL** al proyecto (Add service → Database → PostgreSQL). Railway inyecta `DATABASE_URL` — conectala al servicio de la app como variable referenciada: `${{Postgres.DATABASE_URL}}`.
4. Configurá las variables del servicio (ver `.env.example`):
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `AUTH_URL` — la URL pública que te da Railway (Settings → Networking → Generate Domain)
   - `AUTH_TRUST_HOST` — `true`
   - `TRAINY_API_KEY` — `openssl rand -hex 24` (para que el skill pueda empujar planes)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — **opcional**; si no los ponés, la app usa email+password.
5. Deploy. La primera cuenta que se registre queda como **coach**.

## Instalar en el teléfono (PWA)

La app es instalable: abrí tu instancia en el navegador del teléfono → menú → **"Agregar a pantalla de inicio"** (Android/Chrome) o **Compartir → "Añadir a pantalla de inicio"** (iOS/Safari). Queda como app independiente, pantalla completa.

## Desarrollo local

```bash
npm install
cp .env.example .env   # completar DATABASE_URL y AUTH_SECRET
npm run db:push
npm run dev
```

## API para el skill Trainy

Todas las llamadas del skill usan el header `x-api-key: $TRAINY_API_KEY`.

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/import/plan` | Importa un `plan.json` como bloque nuevo. Body: `{ "user_email": "...", "plan": {...} }`. Archiva el bloque activo anterior. |
| POST | `/api/import/tracker` | Importa logs históricos (`tracker_*.json`). Body: `{ "user_email": "...", "planId?": "...", "data": {...} }`. |
| GET | `/api/export/tracker?user_email=...` | Devuelve los logs del bloque activo en formato `tracker_*.json` para que el skill analice progreso. |

## Modelo de datos

`User` → `Plan` (bloque: split, semanas, descargas, calendario) → `PlanSession` (TRACCIÓN/EMPUJE/PIERNA…) → `Exercise` (progresión COMPOUND/HYPER/LIGHT/AMRAP_MYO, tempo, peso S1, notas, PR base) → `WorkoutLog` + `SetLog` (reps/peso/RPE/done por semana).

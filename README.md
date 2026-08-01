# Announcements Board API

REST API for a classifieds / announcements board.  
Users can register, authenticate, and create/manage announcements with optional image uploads.

## Features

- JWT authentication (access + refresh tokens)
- Full CRUD for announcements with ownership checks
- Search, pagination and sorting
- Image upload via Cloudinary
- Input validation with Zod
- OpenAPI / Swagger documentation
- Rate limiting, Helmet, CORS
- Structured logging with Pino
- Unit, integration and E2E tests

## Tech Stack

| Layer              | Technology                          |
|--------------------|-------------------------------------|
| Runtime            | Node.js + TypeScript                |
| Framework          | Express 5                           |
| Database           | PostgreSQL + Prisma 7               |
| Validation         | Zod 4                               |
| Auth               | JWT + bcrypt + httpOnly cookies     |
| File storage       | Cloudinary                          |
| Documentation      | Swagger UI (`@asteasolutions/zod-to-openapi`) |
| Logging            | Pino                                |
| Testing            | Vitest + Playwright + Supertest     |

## Prerequisites

- Node.js 20+
- PostgreSQL
- Cloudinary account (for image uploads)

## Setup

### 1. Clone & install

```bash
git clone <repository-url>
cd announcements-board
npm install
```

### 2. Environment variables

Create a `.env` file in the root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/board01"
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/board01-test"

# Auth
JWT_SECRET="your-super-secret-jwt-key"

# Server
PORT=3000
NODE_ENV=development

# CORS (comma-separated)
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed sample data
npx tsx seed.ts
```

> Make sure the main database and the test database (`board01-test`) both exist.

## Running the application

```bash
# Development (with hot reload)
npm run dev

# Production
NODE_ENV=production npm start
```

> **Important:** Always set `NODE_ENV=production` when running in production.  
> This enables production logging level, secure cookies, Helmet CSP and other production optimizations.

### Logging

The application uses [Pino](https://github.com/pinojs/pino).

| `NODE_ENV`      | Log level | Output format      |
|-----------------|-----------|--------------------|
| `development`   | `debug`   | Pretty (colored)   |
| `production`    | `info`    | Structured JSON    |
| `test`          | `debug`   | Pretty             |

- In **development** — detailed debug logs with colors (via `pino-pretty`).
- In **production** — structured JSON logs (suitable for log aggregators).
- Sensitive fields (`password`, `token`, `authorization`, cookies) are automatically redacted.

The API will be available at:

- **API**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/api-docs

## API Overview

| Method | Endpoint                    | Auth | Description                     |
|--------|-----------------------------|------|---------------------------------|
| POST   | `/api/auth/register`        | No   | Register a new user             |
| POST   | `/api/auth/login`           | No   | Login                           |
| POST   | `/api/auth/refresh`         | No   | Refresh token pair              |
| POST   | `/api/auth/logout`          | No   | Logout                          |
| GET    | `/api/auth/me`              | Yes  | Current user profile            |
| GET    | `/api/announcements`        | No   | List announcements (paginated)  |
| GET    | `/api/announcements/:id`    | No   | Get single announcement         |
| POST   | `/api/announcements`        | Yes  | Create announcement             |
| PATCH  | `/api/announcements/:id`    | Yes  | Update announcement (owner)     |
| DELETE | `/api/announcements/:id`    | Yes  | Delete announcement (owner)     |

Query parameters for `GET /api/announcements`:

- `page` – page number (default: 1)
- `search` – search substring in title
- `sort=oldest` – sort by oldest first (default: newest)

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (Playwright)
npm run test:e2e

# All tests (unit + integration)
npm run test:all

# Coverage
npm run test:coverage

# View Playwright HTML report
npm run test:e2e:report
```

> E2E tests automatically start the server on the test database and run migrations.

## Available Scripts

| Script                        | Description                              |
|-------------------------------|------------------------------------------|
| `npm run dev`                 | Start development server with hot reload |
| `npm start`                   | Start production server                  |
| `npm run test:unit`           | Run unit tests                           |
| `npm run test:integration`    | Run integration tests                    |
| `npm run test:e2e`            | Run end-to-end tests                     |
| `npm run test:e2e:ui`         | Run E2E tests in UI mode                 |
| `npm run test:e2e:report`     | Open Playwright HTML report              |
| `npm run test:coverage`       | Run tests with coverage                  |
| `npm run test:all`            | Run unit + integration tests             |

## Project Structure

```
├── prisma/
│   ├── schema.prisma
│   ├── client.ts
│   └── migrations/
├── src/
│   ├── config/          # Cloudinary config
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Auth, validation, upload, error handling
│   ├── routes/          # Express routers
│   ├── services/        # Business logic (auth)
│   ├── validators/      # Zod schemas + OpenAPI registration
│   ├── requests/        # .http files for manual testing
│   ├── openapi.ts
│   └── logger.ts
├── tests/
│   ├── e2e/             # Playwright tests
│   ├── integration/     # Integration tests
│   ├── validators/      # Unit tests
│   └── services/
├── app.ts               # Express application
├── index.ts             # Entry point
└── seed.ts              # Database seeder
```

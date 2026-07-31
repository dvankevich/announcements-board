# announcements-board API

Готовий варіант дошки оголошень з автентифікацією.

- **Читання** оголошень — публічне (без токена)
- **Створення, оновлення та видалення** — тільки для авторизованих користувачів (з перевіркою ownership)

## Маршрути auth (`/api/auth`)

| Метод  | Шлях       | Що відбувається                                                                 |
|--------|------------|---------------------------------------------------------------------------------|
| `POST` | `/register`| bcrypt-хеш пароля, створення `User`, видача токенів, refresh у cookie          |
| `POST` | `/login`   | перевірка username/password, токени + cookie                                    |
| `POST` | `/refresh` | refresh з cookie або `body.refreshToken`; ротація refresh у БД                  |
| `POST` | `/logout`  | видалення refresh з БД, очистка cookie                                          |
| `GET`  | `/me`      | профіль поточного користувача (потрібен access token)                           |

## Маршрути оголошень (`/api/announcements`)

| Метод    | Шлях     | Доступ     | Опис                                                                 |
|----------|----------|------------|----------------------------------------------------------------------|
| `GET`    | `/`      | Публічний  | Список оголошень з пагінацією, пошуком (`search`) та сортуванням (`sort=oldest`) |
| `GET`    | `/:id`   | Публічний  | Отримати одне оголошення за ID                                       |
| `POST`   | `/`      | Захищений  | Створити оголошення (автор береться з токена)                        |
| `PATCH`  | `/:id`   | Захищений  | Часткове оновлення (тільки власник)                                  |
| `DELETE` | `/:id`   | Захищений  | Видалення оголошення (тільки власник)                                |

### Query-параметри для `GET /api/announcements`

| Параметр | Тип     | Опис                                      | За замовчуванням |
|----------|---------|-------------------------------------------|------------------|
| `page`   | number  | Номер сторінки                            | `1`              |
| `search` | string  | Пошук підрядка в `title` (case-insensitive) | —              |
| `sort`   | string  | `oldest` — спочатку старі                 | спочатку нові    |

### Правила валідації при створенні/оновленні

- `title` — рядок, 5–50 символів
- `description` — рядок, мінімум 10 символів
- `price` — число > 0
- `category` — одне з: `sale`, `service`, `job`, `other`

При `PATCH` усі поля опціональні, але хоча б одне поле обов’язкове.

## Технічна реалізація

- [`app.ts`](./app.ts) — `cookie-parser`, підключення роутів
- [`src/services/auth.ts`](./src/services/auth.ts) — `jwt.sign` для access, `crypto.randomBytes` для refresh, запис у `RefreshToken`, `setRefreshTokenCookie`
- [`prisma/schema.prisma`](./prisma/schema.prisma) — `User`, `RefreshToken`, `Announcement`
- Час життя токенів: [`src/constants/time.ts`](./src/constants/time.ts)
- Приклади HTTP-запитів:
  - [`src/requests/auth.http`](./src/requests/auth.http)
  - [`src/requests/announcements.http`](./src/requests/announcements.http)

## Запуск

```bash
# 1. Встановити залежності
npm install

# 2. Скопіювати змінні оточення
cp .env.example .env
# Заповнити JWT_SECRET і DATABASE_URL

# 3. Застосувати міграції (створює таблиці + генерує клієнт)
npx prisma migrate dev

# 4. Згенерувати Prisma Client
npx prisma generate

# 5. (опційно) Заповнити тестовими даними
npx tsx seed.ts

# 6. Запустити сервер
npm run dev
```

Swagger: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## Команди Prisma (міграції)

```bash
# Створити нову міграцію після зміни schema.prisma
npx prisma migrate dev --name <назва_міграції>

# Застосувати всі міграції (production / CI)
npx prisma migrate deploy

# Скинути БД і перезастосувати всі міграції + seed
npx prisma migrate reset

# Згенерувати Prisma Client (обов’язково після змін у schema)
npx prisma generate

# Відкрити Prisma Studio
npx prisma studio

# Перевірити статус міграцій
npx prisma migrate status
```

> **Примітка:**  
> Якщо змінюєш `schema.prisma` (додаєш/видаляєш поля), завжди роби нову міграцію через `migrate dev`.  
> `migrate reset` повністю очищає базу — використовуй тільки в dev.


## Тести

Проєкт має два рівні тестів:

| Тип | Що перевіряє | БД |
|-----|----------------|----|
| **Unit** | Zod-схеми валідації, сервіси (`createTokens`, хешування паролів) | Не використовує |
| **Integration** | Повний HTTP-флоу через `supertest` + реальна тестова БД | `TEST_DATABASE_URL` |

### Структура

```
tests/
├── setup.ts                          # підміна DATABASE_URL → TEST_DATABASE_URL
├── globalSetup.ts                    # міграції тестової БД (лише для integration)
├── validators/
│   ├── auth.validator.test.ts
│   └── announcements.validator.test.ts
├── services/
│   └── auth.test.ts
└── integration/
    └── auth.test.ts
```

### Змінні оточення

У `.env` обов’язково має бути:

```env
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/announcements_test"
```

Тестова БД має існувати (або буде створена під час `migrate deploy`).

### Команди

```bash
# Тільки unit-тести (швидко, без БД)
npm run test:unit

# Тільки integration-тести (автоматично ганяє міграції на TEST_DATABASE_URL)
npm run test:integration

# Усі тести підряд
npm run test:all

# Integration у watch-режимі
npm run test:integration:watch

# Лише міграції тестової БД (вручну)
npm run prisma:migrate:test
```

### Як працюють integration-тести

1. `vitest.integration.config.ts` підключає `globalSetup` і `setupFiles`
2. `globalSetup` виконує `prisma migrate deploy` на `TEST_DATABASE_URL`
3. `setup.ts` підміняє `process.env.DATABASE_URL` **до** імпорту Prisma/app
4. Кожен тест очищає таблиці в `beforeEach`
5. Після всіх тестів — `prisma.$disconnect()`

> **Важливо:** unit-тести **не** чіпають тестову БД і не запускають міграції.


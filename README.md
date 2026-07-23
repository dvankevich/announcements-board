# prisma-auth-boilerplate

Готовий варіант: реєстрація/логін, пара access + refresh, оновлення та вихід.  
**Читання** рецептів/категорій/тегів/відгуків — без токена; **створення та зміна** — з заголовком `Authorization: Bearer <accessToken>`.

## Маршрути auth (`/api/auth`)

| Метод | Шлях       | Що відбувається                                      |
|-------|------------|------------------------------------------------------|
| `POST` | `/register` | bcrypt-хеш пароля, створення `User`, видача токенів, refresh у cookie |
| `POST` | `/login`    | перевірка username/password, токени + cookie         |
| `POST` | `/refresh`  | refresh з cookie або `body.refreshToken`; ротація refresh у БД |
| `POST` | `/logout`   | видалення refresh з БД, очистка cookie               |

## Технічна реалізація

- [`app.ts`](./app.ts) — `cookie-parser`, [`auth.routes`](./src/routes/auth.routes.ts)
- [`src/services/auth.ts`](./src/services/auth.ts) — `jwt.sign` для access, `crypto.randomBytes` для refresh, запис у `RefreshToken`, `setRefreshTokenCookie` (httpOnly, `sameSite: strict`).
- [`prisma/schema.prisma`](./prisma/schema.prisma) — `User`, `RefreshToken`
- Час життя токенів: [`src/constants/time.ts`](./src/constants/time.ts).
- Приклади HTTP: [`src/requests/auth.http`](./src/requests/auth.http).

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
npx prisma db seed

# 6. Запустити сервер
npm run dev
```

Swagger: `http://localhost:3000/api-docs`.

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

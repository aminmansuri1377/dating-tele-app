# Nearby — Telegram Dating Mini App

پروژه‌ای مشابه PURE، به‌صورت Telegram Mini App، با درآمدزایی بر پایه‌ی TON Coin.

## ۱. معماری کلی

```
Telegram Client
      │  (WebApp initData, Bot API notifications)
      ▼
Frontend (React + TS + Tailwind)  ──REST/WS──▶  Backend (NestJS)
      │                                              │
      │ TON Connect                                  ├─▶ PostgreSQL (Prisma)
      ▼                                              ├─▶ Redis (cache / throttling)
  TON Blockchain  ◀── on-chain verify ────────────────┤
                                                       └─▶ Cloudflare R2 / S3 (photos)
```

- **احراز هویت**: کاربر هرگز رمز عبور وارد نمی‌کند. فرانت‌اند مقدار `Telegram.WebApp.initData` را می‌گیرد و به `/auth/telegram` می‌فرستد. بک‌اند امضای HMAC آن را با `TELEGRAM_BOT_TOKEN` تایید می‌کند (`telegram-validation.service.ts`) و سپس JWT صادر می‌کند.
- **پرداخت**: هرگز به گزارش موفقیت فرانت‌اند اعتماد نمی‌شود. بک‌اند تراکنش را مستقیم روی زنجیره‌ی TON با `TonClient` (`ton-verification.service.ts`) بررسی می‌کند: آدرس گیرنده، مبلغ، و کامنت یکتای سفارش.
- **مدل درآمدی**: زنان دسترسی آزاد دارند؛ مردانِ رایگان محدود به ۲۰ سوایپ و ۳ پیام جدید در روز هستند (`likes.service.ts`, `messages.service.ts`, `discovery.service.ts`) — این مقادیر به‌راحتی قابل تنظیم‌اند.
- **چت Real-time**: از طریق Socket.IO Gateway (`messages.gateway.ts`)، هر Match یک room جدا دارد.

## ۲. Database Schema (خلاصه)

جدول‌های اصلی (`backend/prisma/schema.prisma`):

| جدول | نقش |
|---|---|
| `User` | هویت تلگرام، وضعیت، نقش ادمین |
| `Profile` | اطلاعات دیتینگ (سن، جنسیت، بیو، ترجیحات) |
| `Photo` | عکس‌ها با کلید Storage |
| `Like` | هر سوایپ (LIKE/PASS/SUPER_LIKE) |
| `Match` | زمانی که دو Like متقابل رخ دهد |
| `Message` | پیام‌های هر Match |
| `Subscription` / `Transaction` | اشتراک‌ها و تراکنش‌های TON |
| `Report` / `BlockedUser` | امنیت و تعدیل محتوا |
| `DailyUsage` | شمارنده‌ی سوایپ/پیام روزانه برای محدودیت رایگان |
| `Language` | زبان‌های فعال قابل مدیریت از پنل ادمین |

## ۳. لیست API (پیشوند: `/api/v1`)

```
POST   /auth/telegram                  ورود با initData تلگرام

GET    /profiles/me                    دریافت پروفایل من
PUT    /profiles/me                    ساخت/ویرایش پروفایل

POST   /photos/upload-url              دریافت presigned URL
POST   /photos/confirm                 ثبت عکس بعد از آپلود
DELETE /photos/:id

GET    /discovery/candidates           فید کشف کاربران

POST   /likes/swipe                    لایک/رد کردن
GET    /likes/who-liked-me             لیست لایک‌کنندگان (نیازمند پرمیوم برای مردان رایگان)

GET    /matches                        لیست Matchها
DELETE /matches/:id                    Unmatch

GET    /matches/:matchId/messages      تاریخچه پیام‌ها
POST   /matches/:matchId/messages      ارسال پیام (REST fallback)
POST   /matches/:matchId/messages/read

GET    /subscriptions/me               وضعیت اشتراک

POST   /payments/order                 ساخت سفارش (مبلغ + کامنت یکتا)
POST   /payments/confirm               تایید تراکنش TON
GET    /payments/transactions

POST   /reports                        گزارش کاربر
GET    /reports/mine

GET    /admin/users | POST /admin/users/:id/ban|unban|delete
GET    /admin/reports | PATCH /admin/reports/:id
GET    /admin/transactions
GET    /admin/languages | POST /admin/languages
GET    /admin/stats                    آمار داشبورد

WS     /chat (namespace)               join_match, send_message, typing, new_message
```

## ۴. ساختار فایل‌ها

```
dating-app/
├── backend/                     NestJS API
│   ├── prisma/schema.prisma
│   └── src/
│       ├── auth/                Telegram initData validation + JWT
│       ├── users/
│       ├── profiles/
│       ├── photos/              presigned R2/S3 upload
│       ├── discovery/           feed algorithm
│       ├── likes/               swipe + free-tier limits
│       ├── matches/             match creation + Telegram push
│       ├── messages/            REST + WebSocket chat
│       ├── subscriptions/       plan config + expiry cron
│       ├── payments/            TON on-chain verification
│       ├── reports/
│       ├── admin/               admin dashboard API
│       └── common/              guards, decorators, filters
│
├── frontend/                    React Mini App
│   └── src/
│       ├── i18n/locales/        fa, en, ru, ar, tr, es
│       ├── telegram/            WebApp SDK wrapper
│       ├── ton/                 TonConnect payment hook
│       ├── api/                 axios client with JWT
│       ├── store/                zustand auth store
│       └── pages/                Welcome, LanguageSelect, ProfileSetup,
│                                  Discovery, Matches, Chat, Premium,
│                                  Settings, ProfileEdit
│
└── docker-compose.yml            postgres + redis + backend + frontend
```

## ۵. راه‌اندازی

```bash
cp backend/.env.example backend/.env      # مقادیر واقعی را پر کنید
cp frontend/.env.example frontend/.env
docker compose up --build
npx prisma migrate dev --schema=backend/prisma/schema.prisma
```

## ۶. آنچه هنوز باید تکمیل شود (نقشه راه)

- **Image Moderation**: هوک `isApproved` در `Photo` آماده است؛ اتصال به یک سرویس تشخیص تصویر (مثلاً AWS Rekognition) باقی مانده.
- **AI Features**: پیشنهاد Bio، تشخیص پروفایل فیک، ترجمه خودکار پیام — می‌توان با فراخوانی Claude API از بک‌اند اضافه کرد؛ ستون `translatedContent` در `Message` برای کش ترجمه از قبل تعبیه شده.
- **Admin Frontend UI**: فقط API آماده است؛ یک داشبورد React/Next جدا (یا صفحه‌ی محافظت‌شده در همین فرانت) لازم است.
- **Push از طریق Telegram Bot**: نمونه‌ی اولیه در `telegram-notifier.service.ts` هست؛ باید Webhook/Bot جدا راه‌اندازی و تست شود.
- **تست‌ها**: هیچ unit/e2e test در این اسکلت نوشته نشده — برای Production ضروری است.
- **Rate limiting دقیق‌تر** روی swipe/message endpoints (فعلاً throttler سراسری است).
- **CI/CD** و مانیتورینگ (Sentry, logs).

این ساختار یک **اسکلت Production-oriented و قابل اجراست**، نه یک محصول کامل تست‌شده. پیش از انتشار واقعی در تلگرام حتماً نیاز به تست امنیتی (خصوصاً مسیر پرداخت TON و اعتبارسنجی initData)، بارگذاری، و بازبینی حقوقی (به‌ویژه به دلیل ماهیت دیتینگ اپ و قوانین محلی) دارد.

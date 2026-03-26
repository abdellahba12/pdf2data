# PDF2Data — Invoice & Document Data Extractor

SaaS web app that extracts structured data from PDF invoices using Google Gemini AI.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **AI**: Google Gemini 2.0 Flash
- **Export**: ExcelJS (XLSX + CSV)
- **Auth**: JWT + bcrypt + Google OAuth
- **Payments**: Stripe

## Plans

| Feature | Free | Trial (5 days) | Pro (€19/mo) |
|---|---|---|---|
| Documents | 10 total | Unlimited | Unlimited |
| Invoice generation | ✅ | ✅ | ✅ |
| Excel/CSV export | ✅ | ✅ | ✅ |
| Custom template | ✅ | ✅ | ✅ |
| Priority support | ❌ | ❌ | ✅ |

## Local Development

```bash
git clone <your-repo>
cd pdf2data
npm install
cp .env.example .env
# Edit .env with your values

# Start PostgreSQL
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=pdf2data postgres:16

npx prisma migrate deploy
node prisma/seed.js
npm run dev
```

## Deploy to Railway

1. New Project → Deploy from GitHub
2. Add PostgreSQL service
3. Set env variables: `GEMINI_API_KEY`, `JWT_SECRET`, `UPLOAD_DIR=/app/uploads`
4. Add volume mounted at `/app/uploads`
5. Deploy — `railway.toml` handles the rest

Default user: `admin@pdf2data.com` / `changeme123`

## How It Works

1. Upload PDF → stored on disk
2. `pdf-parse` extracts text
3. Gemini 2.0 Flash parses into structured JSON
4. User reviews/edits extracted fields
5. Export as XLSX, CSV, or generate branded PDF invoice

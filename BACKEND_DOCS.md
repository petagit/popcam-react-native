# Backend & Infrastructure Documentation

This document describes the backend architecture, database schema, and core service logic of the React Native app. It is intended to guide the development of a web app that syncs with and operates on the same data.

## 1. Architecture Overview

The application follows a **serverless** architecture. There is no custom middleware server. The client communicates directly with managed services:

- **Database**: PostgreSQL hosted on **Supabase**. The client communicates with a custom web backend API, and direct Supabase access via `@supabase/supabase-js` has been removed.
- **Authentication**: **Clerk**. JWT session tokens from Clerk are sent in the `Authorization: Bearer <token>` header to the custom backend API to securely authenticate requests.
- **Storage**: **Cloudflare R2** (S3-compatible). Accessed via `@aws-sdk/client-s3`.
- **AI Generation**: **Google Gemini API**. Accessed directly via `fetch`.

## 2. Database Schema (Prisma)

The web app **MUST** use the same database schema to ensure compatibility. Below is the `schema.prisma` definitions used by the native app.

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [pg_graphql, pg_stat_statements, pgcrypto, pgjwt, supabase_vault, uuid_ossp(map: "uuid-ossp")]
}

model User {
  id                    String                  @id
  email                 String                  @unique
  credits               Int                     @default(3)
  createdAt             DateTime                @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt             DateTime                @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  generatedImages       GeneratedImage[]
  image_generation_jobs image_generation_jobs[]
  subscription          Subscription?

  @@map("users")
}

model GeneratedImage {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id")
  imageUrl  String   @map("image_url")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  user      User     @relation(fields: [userId], references: [id])

  // Note: The app logic attempts to save a 'prompt' field here, 
  // but it is not strictly defined in this Prisma model yet. 
  // Verify if the column exists in the actual DB.

  @@index([userId], map: "idx_generated_images_user_id")
  @@map("generated_images")
}

model CustomPrompt {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId            String   @map("user_id")
  promptText        String   @map("prompt_text")
  title             String?
  thumbnailUrl      String?  @map("thumbnail_url")
  secondaryImageUrl String?  @map("secondary_image_url")
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@map("custom_prompts")
  @@index([userId])
}

model Subscription {
  id                   String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId               String    @unique @map("user_id")
  status               String    @default("Free")
  stripeCustomerId     String?   @map("stripe_customer_id")
  stripeSubscriptionId String?   @map("stripe_subscription_id")
  priceId              String?   @map("price_id")
  currentPeriodEnd     DateTime? @map("current_period_end") @db.Timestamptz(6)
  createdAt            DateTime? @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime? @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  user                 User      @relation(fields: [userId], references: [id])

  @@index([userId], map: "idx_subscriptions_user_id")
  @@map("subscriptions")
}

model image_generation_jobs {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id          String
  status           String    @default("pending")
  progress         Int       @default(0)
  input_image_key  String?
  output_image_url String?
  error_message    String?
  created_at       DateTime  @default(now()) @db.Timestamptz(6)
  updated_at       DateTime  @default(now()) @db.Timestamptz(6)
  completed_at     DateTime? @db.Timestamptz(6)
  users            User      @relation(fields: [user_id], references: [id])

  @@index([created_at], map: "idx_image_jobs_created_at")
  @@index([status], map: "idx_image_jobs_status")
  @@index([user_id], map: "idx_image_jobs_user_id")
}
```

## 3. Core Logic & Services

The web app should replicate the following logic to remain in sync.

### 3.1 Authentication (Clerk + Custom Backend API)
- **Mechanism**: The app uses Clerk for user management.
- **Backend Auth**: It passes the plain Clerk session token (obtained via `getToken()`) to the backend API's `Authorization` header. This logic is centralized in `apiClient.ts`.
- **Config**:
  - `EXPO_PUBLIC_BACKEND_URL`
- **Implementation Note**: The backend API is responsible for verifying the Clerk token and securely interacting with the database. Direct client-side Row Level Security (RLS) is no longer used, as the backend serves as the trusted middleman.

### 3.2 User & Credits Management (Backend API)
- **Initialization**: When checking credits, the client calls `POST /api/user/sync` with the user's email. If the user doesn't exist, the backend auto-creates one with `defaultCredits = 5`.
- **Fetching**: The client retrieves the balance via `GET /api/user/credits`.
- **Deducting Credits**: Credit deductions are handled securely on the backend (e.g., during an API service call) to prevent client-side tampering.

### 3.3 Custom Prompts (`storageService.ts` -> Backend API)
- **Table**: `custom_prompts`
- **Fields**:
  - `prompt_text`: The actual text sent to the AI.
  - `thumbnail_url`: URL of the preview image (stored in R2).
  - `secondary_image_url`: Optional secondary view.
- **Logic**: Users can perform CRUD operations via the `apiFetch` wrapper in `storageService.ts` which routes to `/api/prompts`.

### 3.4 Image Generation (`nanoBananaService.ts`)
- **Provider**: Google Gemini API (referred to as "Nano Banana").
- **Endpoint**: `/models/[model_name]:generateContent`
- **Logic**:
  1.  Takes a `prompt` and optionally a `referenceImageBase64`.
  2.  Sends to Gemini API.
  3.  Retries on 404/429 errors with fallback models.
  4.  Returns a base64 image.
- **Storage**: The result image is uploaded to R2, and the public URL is saved to the `generated_images` table in Supabase.

### 3.5 Storage (R2)
- **Bucket**: Configured via AWS SDK (S3 compatible).
- **Usage**:
  - User uploaded images.
  - Generated thumbnails.
  - Generated results.
- **Web App**: Needs the same R2 credentials to read/write these images.

### 3.6 R2 & Postgres Interaction
It is important to note that **R2 does not talk directly to Postgres**. The application logic (Client or Server Action) handles the coordination:
1.  **Upload**: The file is uploaded to R2 (e.g., `bucket/users/user_123/image_abc.png`).
2.  **Get URL**: The application constructs the public URL (e.g., `https://r2.popcam.com/users/user_123/image_abc.png`).
3.  **Save/Link**: This URL string is effectively a simple string and is inserted into the `image_url` column of the `generated_images` table in Postgres.
4.  **Referential Integrity**: There is no hard database constraint linking the file existence in R2 to the row in Postgres. It is the application's responsibility to ensure they stay in sync (checking for orphans, etc.).

## 5. Data Integrity Reports
### 5.1 Duplicate User Check (2026-01-21)
An investigation was conducted to check for users with the same email address but different UUIDs (which would violate the application's 1:1 mapping assumption).
- **Script**: `check_duplicate_users.js`
- **Result**: No duplicate users found. The unique constraint on the `email` column in the `users` table appears to be holding correctly.

### 5.2 Incident Report: `peter.z.feng@gmail.com` (2026-01-21)
- **Issue**: User unable to fetch credits / stuck state.
- **Database Status**: User exists in DB.
    - **ID**: `user_2wr7zB9Zct2WGyXnRzKPeRghWT7`
    - **Credits**: 172
- **Diagnosis**: **Clerk User ID Mismatch**. The user likely re-created their Clerk account (or Google Auth link changed), resulting in a **new** User ID from Clerk.
    1.  **Read**: App queries `SELECT * FROM users WHERE id = 'NEW_ID'`. -> Returns nothing.
    2.  **Create**: App attempts `INSERT INTO users (id, email) VALUES ('NEW_ID', 'peter.z.feng@gmail.com')`.
    3.  **Error**: Fails because `email` must be unique and is already held by the old ID (`user_2wr7zB9Zct2WGyXnRzKPeRghWT7`).
- **Resolution**:
    - **Option A (Keep History)**: Update the ID in the database to match the new Clerk ID.
    - **Option B (Reset)**: Delete the old user row. The app will auto-create a new one (credits reset to default).
    - **Status (2026-01-21)**: Selected **Option B**.
        - Executed `delete_user_prisma.js` (using Direct DB connection).
        - **Deleted**: User row + 147 generated images.
        - **Result**: User email is now free. Next login will automatically create a new user record with default credits (5). Zero action required in Clerk.


## 4. Environment Variables Checklist
The web app will need equivalent environment variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (or equivalent)
- `CLERK_SECRET_KEY`
- `EXPO_PUBLIC_BACKEND_URL`
- `GEMINI_API_KEY` (Nano Banana Key)
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`

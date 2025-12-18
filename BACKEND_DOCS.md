# Backend & Infrastructure Documentation

This document describes the backend architecture, database schema, and core service logic of the React Native app. It is intended to guide the development of a web app that syncs with and operates on the same data.

## 1. Architecture Overview

The application follows a **serverless** architecture. There is no custom middleware server. The client communicates directly with managed services:

- **Database**: PostgreSQL hosted on **Supabase**. Accessed directly via `@supabase/supabase-js`.
- **Authentication**: **Clerk**. JWTs from Clerk are used to authenticate requests to Supabase (via Row Level Security).
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

### 3.1 Authentication (Clerk + Supabase)
- **Mechanism**: The app uses Clerk for user management.
- **Supabase Auth**: It passes the Clerk session token to the Supabase client.
- **Config**:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Implementation Note**: When initializing the Supabase client in the web app, ensure you inject the `access_token` from Clerk's `useSession()` or `getToken()` into the Supabase headers so that Row Level Security (RLS) works for the specific user.

### 3.2 User & Credits Management (`supabaseService.ts`)
- **Initialization**: When checking credits, if a user does not exist in the `users` table, the app **auto-creates** one with `email` and `defaultCredits = 5`.
- **Deducting Credits**:
    1.  Fetch current credits (`SELECT credits FROM users WHERE id = userId`).
    2.  Check if `credits >= amount`.
    3.  Update (`UPDATE users SET credits = credits - amount WHERE id = userId`).
    - *Note*: This is currently done client-side. The web app should ideally do this in a secure server action or strict RLS policy/Database Function to prevent tampering.

### 3.3 Custom Prompts (`supabaseService.ts`)
- **Table**: `custom_prompts`
- **Fields**:
  - `prompt_text`: The actual text sent to the AI.
  - `thumbnail_url`: URL of the preview image (stored in R2).
  - `secondary_image_url`: Optional secondary view.
- **Logic**: Users can perform CRUD operations on their own prompts. Queries are filtered by `user_id`.

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

## 4. Environment Variables Checklist
The web app will need equivalent environment variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (or equivalent)
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` (Nano Banana Key)
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`

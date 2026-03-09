# Gallery Feature Documentation

This document outlines the data structure and database interactions required for implementing the Gallery feature in the web app.

## 1. Data Structure

The gallery feature primarily interacts with the `GeneratedImage` model in the PostgreSQL database (Supabase).

### **Model: `GeneratedImage`**
Maps to the `generated_images` table in the database.

| Field       | Type      | Description                                                                 |
| :---------- | :-------- | :-------------------------------------------------------------------------- |
| `id`        | UUID      | Primary Key. Default: `gen_random_uuid()`.                                  |
| `userId`    | String    | Foreign Key to `User.id` (`users` table). **CRITICAL**: Used for filtering. |
| `imageUrl`  | String    | The public URL of the image stored in Cloudflare R2.                        |
| `createdAt` | DateTime  | Timestamp of creation. Useful for sorting (e.g., newest first).             |

### **Prisma Definition**
Refer to `schema.prisma` for the exact definition:

```prisma
model GeneratedImage {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id")
  imageUrl  String   @map("image_url")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  user      User     @relation(fields: [userId], references: [id])

  @@index([userId], map: "idx_generated_images_user_id")
  @@map("generated_images")
}
```

## 2. Database Interaction

### **Reads (Fetching the Gallery)**
To display the gallery for the current user:

1.  **Authentication**: Ensure the user is authenticated via **Clerk**.
2.  **Query**: Select from `generated_images` where `user_id` matches the authenticated user's ID.
3.  **Client**: Use the Supabase client (`@supabase/supabase-js`).
4.  **RLS**: The database has Row Level Security (RLS) enabled. You **MUST** pass the Clerk session token (access token) to the Supabase client for RLS to work correctly.

**Example Query (JavaScript/TypeScript):**
```javascript
const { data, error } = await supabase
  .from('generated_images')
  .select('*')
  .eq('user_id', currentUserId)
  .order('created_at', { ascending: false });
```

### **Writes (Adding to Gallery)**
When a new image is generated:

1.  **Storage**: The image file is uploaded to **Cloudflare R2** (S3-compatible storage).
2.  **Record Creation**: The public URL from R2 is inserted into the `generated_images` table.

**Example Insert:**
```javascript
const { data, error } = await supabase
  .from('generated_images')
  .insert([
    { 
      user_id: currentUserId, 
      image_url: 'https://r2.popcam.com/path/to/image.png' 
    }
  ]);
```

## 3. Related Models

-   **`User`**: The owner of the images.
-   **`image_generation_jobs`**: Tracks the status of generation jobs (`pending`, `completed`, etc.). You might want to show pending jobs in the gallery or a separate "Activity" view.

## 4. Key Considerations

-   **Pagination**: The gallery may grow large. Implement pagination (using `range()` in Supabase) or infinite scroll.
-   **Caching**: generated images are static. Using Next.js `Image` component or caching headers is recommended.
-   **Synchronization**: The web app shares the **exact same database** as the native app. Changes made here are reflected immediately on the mobile app.

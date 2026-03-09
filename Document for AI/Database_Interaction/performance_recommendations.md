# Database Performance & Security Recommendations

Based on the audit of the current database interaction layer, here are several high-impact recommendations to improve performance, reliability, and security.

## 1. Move Business Logic to the Database (RPC)
### Problem
The `deductCredits` function in [supabaseService.ts](file:///Users/fengzhiping/popcam-react-native/src/services/supabaseService.ts) currently performs a **Read → Modify → Write** cycle on the client side:
1. `SELECT credits FROM users WHERE id = userId`
2. `if (credits >= amount) { ... }`
3. `UPDATE users SET credits = credits - amount ...`

### Impact
- **Latency**: Two round-trips to the database for a single operation.
- **Race Condition**: If two requests happen simultaneously, a user could end up with a negative balance or "double-spend" credits.

### Recommendation
Create a PostgreSQL Function (Stored Procedure) and call it via `.rpc()`.
```sql
CREATE OR REPLACE FUNCTION deduct_user_credits(user_id_param TEXT, amount_param INT)
RETURNS INT AS $$
DECLARE
    current_balance INT;
BEGIN
    SELECT credits INTO current_balance FROM users WHERE id = user_id_param FOR UPDATE;
    IF current_balance < amount_param THEN
        RAISE EXCEPTION 'Insufficient credits';
    END IF;
    UPDATE users SET credits = credits - amount_param WHERE id = user_id_param;
    RETURN current_balance - amount_param;
END;
$$ LANGUAGE plpgsql;
```

---

## 2. Optimize Gallery Loading (Lazy Resolution)
### Problem
`storageService.getAnalyses` iterates through every stored analysis to verify local file existence and resolve R2 URLs.

### Impact
As the gallery grows (e.g., 100+ items), the startup time of the `GalleryScreen` will increase linearly due to sequential `await` calls in the loop.

### Recommendation
- **Parallel Resolution**: Use `Promise.all` for file verification if strictly necessary, or better yet...
- **On-Demand Resolution**: Only verify or resolve URLs when a specific item is about to be rendered (e.g., in a `FlatList` render item).
- **Caching**: Store the "Resolved URL" temporary in memory or cache it with a timestamp to avoid repeated R2 signing.

---

## 3. Implement Pagination for Custom Prompts
### Problem
`getCustomPrompts` is currently hard-coded to return a `limit(20)`. There is no mechanism to load more.

### Impact
Users with a large library of prompts will not be able to see their older ones.

### Recommendation
Update the service to accept `offset` and `limit` parameters:
```typescript
async getCustomPrompts(userId: string, limit: number = 20, offset: number = 0) {
  return await this.supabase
    .from('custom_prompts')
    .select(...)
    .eq('user_id', userId)
    .range(offset, offset + limit - 1);
}
```

---

## 4. Efficient Supabase Client Reuse
### Problem
In `supabaseService.ts`, the `setTokenProvider` method re-initializes the `SupabaseClient` entirely.

### Recommendation
While creating a new client is sometimes necessary for certain auth flows, you can often just update the auth header or rely on the `accessToken` callback provided by Supabase during initial setup, which `SupabaseService` already partially implements. Ensure that this doesn't lead to memory leaks or redundant listeners.

---

## 5. Summary Table of Optimizations

| Area | Current Approach | Optimized Approach | Benefit |
| :--- | :--- | :--- | :--- |
| **Credits** | Client-side R/W | PostgreSQL RPC Function | Atomic, 1 round-trip, Secure |
| **Gallery** | Eager file verification | Lazy resolution / Parallelism | Faster screen load |
| **Prompts** | Hard limit of 20 | Range-based pagination | Supports large user data |
| **Security** | RLS + Client Logic | RLS + Server-side Functions | Tamper-proof business logic |

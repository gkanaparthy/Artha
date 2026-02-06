---
title: Row Level Security (RLS) Best Practices
priority: P0
tags: security, rls, multi-tenant
---

# Row Level Security (RLS) Best Practices

## Performance-First Policies
*   **Avoid Subqueries**: Policies are evaluated for every row. A subquery in a policy can turn an O(N) operation into O(N^2).
*   **Use Session Variables**: Store user context in session variables (e.g., `current_setting('app.current_user_id')`) or use Supabase's built-in `auth.uid()`.
*   **Simple Joins**: If you must check permissions in another table, ensure the join columns are indexed.

## Robust Enforcement
*   **Always Enable RLS**: Every table containing sensitive data must have RLS enabled.
*   **Use `FORCE ROW LEVEL SECURITY`**: This ensures that even the table owner (if running queries as a non-superuser) is subject to RLS.
*   **Restrictive by Default**: Start with no access and explicitly grant permissions.

### Example: Efficient Tenant Isolation
**Incorrect (Expensive subquery):**
```sql
CREATE POLICY "tenant_access" ON documents
FOR SELECT TO authenticated
USING (
  tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid())
);
```

**Correct (Supabase-optimized using JWT claims or simpler logic):**
```sql
-- Assuming tenant_id is in the JWT or a session variable
CREATE POLICY "tenant_access" ON documents
FOR SELECT TO authenticated
USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
);
```

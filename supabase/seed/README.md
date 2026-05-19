# Spot Seed (Japan)

Generate nationwide Japan dog-related spots from OpenStreetMap (Overpass API):

```bash
npm run build:spots:jp
```

Output file:

- `supabase/seed/spots_japan.sql`

Load into Supabase SQL editor:

1. Open SQL editor.
2. Run `supabase/schema.sql` first (if needed).
3. Paste and execute `supabase/seed/spots_japan.sql`.

Optional endpoint override:

```bash
OVERPASS_ENDPOINT=https://overpass.kumi.systems/api/interpreter npm run build:spots:jp
```

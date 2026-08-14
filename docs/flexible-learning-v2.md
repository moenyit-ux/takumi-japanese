# Flexible Learning v2

Takumi Japanese no longer treats N4/N3 as a fixed number of 60-minute sessions.

## Student model

Each material has an independent personal learning state:

- `not_started` — Belum dipelajari
- `review` — Perlu dipelajari lagi
- `learned` — Sudah dipelajari

This state is intentionally separate from technical completion. Technical completion still depends on reading progress and the material quiz score.

## Admin model

The admin material list only shows active materials. Legacy empty session rows remain hidden as reserve rows for backward compatibility.

`admin_create_material(level_id)` activates the next unused reserve row. If no reserve row remains, it inserts a new learning session and its session quiz shell, so material count is not capped by the old N4/N3 totals.

## Compatibility

Existing authentication, entitlements, content blocks, quiz attempts, bookmarks, and publication workflow remain in place. The old `learning_sessions` and `session_progress.status` fields are retained internally to avoid a destructive migration.

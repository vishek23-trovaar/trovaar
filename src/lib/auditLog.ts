import { getDb } from "./db";

export function logAdminAction(params: {
  action: string;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reversible?: boolean;
}) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO admin_audit_log (id, action, entity_type, entity_id, entity_label, old_value, new_value, reversible, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      crypto.randomUUID(),
      params.action,
      params.entityType,
      params.entityId,
      params.entityLabel ?? null,
      params.oldValue ? JSON.stringify(params.oldValue) : null,
      params.newValue ? JSON.stringify(params.newValue) : null,
      params.reversible ? 1 : 0
    );
  } catch { /* never break main flow */ }
}

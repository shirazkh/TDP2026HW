import { AuditAction } from '../../common/enums/audit-action.enum';
import { AuditActor } from '../../common/enums/audit-actor.enum';
import { AuditEntityType } from '../../common/enums/audit-entity-type.enum';
import { AuditLog } from '../audit-log.entity';

export interface AuditLogResponseDto {
  id: number;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: number | null;
  performedBy: number | null;
  actor: AuditActor;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

export const toAuditLogResponse = (
  auditLog: AuditLog,
): AuditLogResponseDto => ({
  id: auditLog.id,
  action: auditLog.action,
  entityType: auditLog.entityType,
  entityId: auditLog.entityId,
  performedBy: auditLog.performedById,
  actor: auditLog.actor,
  timestamp: auditLog.timestamp.toISOString(),
  metadata: auditLog.metadata,
});

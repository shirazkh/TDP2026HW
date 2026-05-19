import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';
import { AuditLog } from './audit-log.entity';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

export interface RecordAuditLogInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: number | null;
  actor: AuditActor;
  performedById?: number | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
  ) {}

  findAll(query: AuditLogQueryDto): Promise<AuditLog[]> {
    const where: FindOptionsWhere<AuditLog> = {};

    if (query.entityType !== undefined) {
      where.entityType = query.entityType;
    }

    if (query.entityId !== undefined) {
      where.entityId = query.entityId;
    }

    if (query.action !== undefined) {
      where.action = query.action;
    }

    if (query.actor !== undefined) {
      where.actor = query.actor;
    }

    return this.auditLogsRepository.find({
      where,
      order: { timestamp: 'DESC', id: 'DESC' },
    });
  }

  async record(input: RecordAuditLogInput): Promise<AuditLog> {
    const auditLog = this.auditLogsRepository.create({
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      actor: input.actor,
      performedById: input.performedById ?? null,
      metadata: input.metadata ?? null,
    });

    return this.auditLogsRepository.save(auditLog);
  }
}

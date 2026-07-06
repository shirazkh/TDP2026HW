import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { AuditActor } from '../../common/enums/audit-actor.enum';
import { AuditEntityType } from '../../common/enums/audit-entity-type.enum';

export class AuditLogQueryDto {
  @IsOptional()
  @IsEnum(AuditEntityType)
  entityType?: AuditEntityType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  entityId?: number;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsEnum(AuditActor)
  actor?: AuditActor;
}

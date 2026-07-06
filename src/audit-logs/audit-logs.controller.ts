import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import {
  AuditLogResponseDto,
  toAuditLogResponse,
} from './dto/audit-log-response.dto';

@Controller('audit-logs')
@Roles(UserRole.ADMIN)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async findAll(
    @Query() query: AuditLogQueryDto,
  ): Promise<AuditLogResponseDto[]> {
    const auditLogs = await this.auditLogsService.findAll(query);

    return auditLogs.map(toAuditLogResponse);
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditActor } from '../common/enums/audit-actor.enum';
import { AuditEntityType } from '../common/enums/audit-entity-type.enum';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { TicketsService } from '../tickets/tickets.service';
import { Attachment } from './attachment.entity';

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = [
  'image/png',
  'image/jpeg',
  'application/pdf',
  'text/plain',
];

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentsRepository: Repository<Attachment>,
    private readonly ticketsService: TicketsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async upload(
    ticketId: number,
    file: Express.Multer.File | undefined,
    actor: RequestUser,
  ): Promise<Attachment> {
    await this.ticketsService.findById(ticketId);

    if (!file) {
      throw new BadRequestException('Attachment file is required');
    }

    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported attachment content type: ${file.mimetype}`,
      );
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new BadRequestException('Attachment exceeds the 10 MB size limit');
    }

    const attachment = await this.attachmentsRepository.save(
      this.attachmentsRepository.create({
        ticketId,
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        data: file.buffer,
      }),
    );

    await this.auditLogsService.record({
      action: AuditAction.UPLOAD_ATTACHMENT,
      entityType: AuditEntityType.ATTACHMENT,
      entityId: attachment.id,
      actor: AuditActor.USER,
      performedById: actor.id,
      metadata: {
        ticketId,
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
      },
    });

    return attachment;
  }

  async remove(
    ticketId: number,
    attachmentId: number,
    actor: RequestUser,
  ): Promise<void> {
    await this.ticketsService.findById(ticketId);
    const result = await this.attachmentsRepository.delete({
      id: attachmentId,
      ticketId,
    });

    if (!result.affected) {
      throw new NotFoundException(`Attachment ${attachmentId} was not found`);
    }

    await this.auditLogsService.record({
      action: AuditAction.DELETE_ATTACHMENT,
      entityType: AuditEntityType.ATTACHMENT,
      entityId: attachmentId,
      actor: AuditActor.USER,
      performedById: actor.id,
      metadata: { ticketId },
    });
  }
}

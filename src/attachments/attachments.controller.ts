import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import {
  ALLOWED_ATTACHMENT_TYPES,
  AttachmentsService,
  MAX_ATTACHMENT_SIZE_BYTES,
} from './attachments.service';
import {
  AttachmentResponseDto,
  toAttachmentResponse,
} from './dto/attachment-response.dto';

@Controller('tickets/:ticketId/attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_ATTACHMENT_TYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              `Unsupported attachment content type: ${file.mimetype}`,
            ),
            false,
          );
        }

        return callback(null, true);
      },
    }),
  )
  async upload(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<AttachmentResponseDto> {
    const attachment = await this.attachmentsService.upload(
      ticketId,
      file,
      currentUser,
    );

    return toAttachmentResponse(attachment);
  }

  @Delete(':attachmentId')
  @HttpCode(200)
  remove(
    @Param('ticketId', ParseIntPipe) ticketId: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.attachmentsService.remove(ticketId, attachmentId, currentUser);
  }
}

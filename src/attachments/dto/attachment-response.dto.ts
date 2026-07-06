import { Attachment } from '../attachment.entity';

export interface AttachmentResponseDto {
  id: number;
  ticketId: number;
  filename: string;
  contentType: string;
}

export const toAttachmentResponse = (
  attachment: Attachment,
): AttachmentResponseDto => ({
  id: attachment.id,
  ticketId: attachment.ticketId,
  filename: attachment.filename,
  contentType: attachment.contentType,
});

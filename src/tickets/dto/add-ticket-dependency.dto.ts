import { IsInt, Min } from 'class-validator';

export class AddTicketDependencyDto {
  @IsInt()
  @Min(1)
  blockedBy: number;
}

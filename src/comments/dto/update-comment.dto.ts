import { IsInt, IsString, Length, Min } from 'class-validator';

export class UpdateCommentDto {
  @IsInt()
  @Min(1)
  version: number;

  @IsString()
  @Length(1, 5000)
  content: string;
}

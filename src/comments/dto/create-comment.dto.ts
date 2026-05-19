import { IsInt, IsString, Length, Min } from 'class-validator';

export class CreateCommentDto {
  @IsInt()
  @Min(1)
  authorId: number;

  @IsString()
  @Length(1, 5000)
  content: string;
}

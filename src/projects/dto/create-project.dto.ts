import { IsInt, IsString, Length, Min } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @Length(1, 160)
  name: string;

  @IsString()
  @Length(1, 2000)
  description: string;

  @IsInt()
  @Min(1)
  ownerId: number;
}

import { IsString, IsOptional, IsArray, MaxLength, ArrayMaxSize, IsIn } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MaxLength(500)
  text: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  imageUrls?: string[];
}

export class CreateCommentDto {
  @IsString()
  @MaxLength(300)
  text: string;
}

export class ReportPostDto {
  @IsString()
  @IsIn(['spam', 'inappropriate', 'harassment', 'fake', 'other'])
  reason: string;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  text?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsString, IsUUID, MinLength, ValidateNested } from 'class-validator';

export class AnswerItemDto {
  @ApiProperty({ description: 'Question ID this answer responds to' })
  @IsUUID()
  questionId: string;

  @ApiProperty({ description: 'The candidate answer text' })
  @IsString()
  @MinLength(1)
  text: string;
}

export class SubmitAnswersDto {
  @ApiProperty({ type: [AnswerItemDto], description: 'One or more answers (submit one at a time or all at once)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers: AnswerItemDto[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { DifficultyLevel } from '../../../entities/interview.entity';

export class CreateInterviewDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(2)
  userName: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  userEmail: string;

  @ApiProperty({
    example: 'MERN Developer',
    description:
      'Job role, e.g. MERN Developer, AI Engineer, Frontend Developer, HR Interview, Customer Support, or any custom role',
  })
  @IsString()
  @MinLength(2)
  role: string;

  @ApiPropertyOptional({ enum: DifficultyLevel, default: DifficultyLevel.INTERMEDIATE })
  @IsOptional()
  @IsIn(Object.values(DifficultyLevel))
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ description: 'Optional custom job description for more tailored questions' })
  @IsOptional()
  @IsString()
  jobDescription?: string;

  @ApiPropertyOptional({ default: 5, minimum: 3, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  numberOfQuestions?: number;
}

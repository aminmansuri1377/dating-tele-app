import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DatingGoal, Gender, GenderPreference } from '@prisma/client';

export class UpsertProfileDto {
  @IsString()
  @MaxLength(50)
  displayName: string;

  @IsInt()
  @Min(18)
  @Max(100)
  age: number;

  @IsEnum(Gender)
  gender: Gender;

  @IsEnum(GenderPreference)
  genderPref: GenderPreference;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  spokenLanguages?: string[];

  @IsEnum(DatingGoal)
  datingGoal: DatingGoal;

  @IsOptional()
  @IsInt()
  @Min(18)
  minAgePref?: number;

  @IsOptional()
  @IsInt()
  @Max(100)
  maxAgePref?: number;

  @IsOptional()
  @IsInt()
  maxDistanceKm?: number;
}

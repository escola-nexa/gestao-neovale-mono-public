import { PartialType } from '@nestjs/mapped-types';
import { CreateAcademicBimestersDto } from './create-academic_bimesters.dto';

export class UpdateAcademicBimestersDto extends PartialType(CreateAcademicBimestersDto) {}

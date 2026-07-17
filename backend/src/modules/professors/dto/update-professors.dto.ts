import { PartialType } from '@nestjs/mapped-types';
import { CreateProfessorsDto } from './create-professors.dto';

export class UpdateProfessorsDto extends PartialType(CreateProfessorsDto) {}

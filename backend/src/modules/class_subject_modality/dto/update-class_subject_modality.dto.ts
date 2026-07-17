import { PartialType } from '@nestjs/mapped-types';
import { CreateClassSubjectModalityDto } from './create-class_subject_modality.dto';

export class UpdateClassSubjectModalityDto extends PartialType(CreateClassSubjectModalityDto) {}

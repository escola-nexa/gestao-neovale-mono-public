import { PartialType } from '@nestjs/mapped-types';
import { CreateEnrollmentsDto } from './create-enrollments.dto';

export class UpdateEnrollmentsDto extends PartialType(CreateEnrollmentsDto) {}

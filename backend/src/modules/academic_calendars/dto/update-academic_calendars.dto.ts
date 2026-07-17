import { PartialType } from '@nestjs/mapped-types';
import { CreateAcademicCalendarsDto } from './create-academic_calendars.dto';

export class UpdateAcademicCalendarsDto extends PartialType(CreateAcademicCalendarsDto) {}

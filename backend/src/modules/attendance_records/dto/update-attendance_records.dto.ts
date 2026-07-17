import { PartialType } from '@nestjs/mapped-types';
import { CreateAttendanceRecordsDto } from './create-attendance_records.dto';

export class UpdateAttendanceRecordsDto extends PartialType(CreateAttendanceRecordsDto) {}

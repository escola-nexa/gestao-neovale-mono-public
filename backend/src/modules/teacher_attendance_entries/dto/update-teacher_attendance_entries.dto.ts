import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherAttendanceEntriesDto } from './create-teacher_attendance_entries.dto';

export class UpdateTeacherAttendanceEntriesDto extends PartialType(CreateTeacherAttendanceEntriesDto) {}

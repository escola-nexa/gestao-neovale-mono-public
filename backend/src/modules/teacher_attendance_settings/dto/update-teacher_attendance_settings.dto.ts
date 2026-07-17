import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherAttendanceSettingsDto } from './create-teacher_attendance_settings.dto';

export class UpdateTeacherAttendanceSettingsDto extends PartialType(CreateTeacherAttendanceSettingsDto) {}

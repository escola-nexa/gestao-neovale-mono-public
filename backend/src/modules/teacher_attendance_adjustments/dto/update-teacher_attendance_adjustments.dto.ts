import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherAttendanceAdjustmentsDto } from './create-teacher_attendance_adjustments.dto';

export class UpdateTeacherAttendanceAdjustmentsDto extends PartialType(CreateTeacherAttendanceAdjustmentsDto) {}

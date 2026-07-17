import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherAttendanceMonthlySheetsDto } from './create-teacher_attendance_monthly_sheets.dto';

export class UpdateTeacherAttendanceMonthlySheetsDto extends PartialType(CreateTeacherAttendanceMonthlySheetsDto) {}

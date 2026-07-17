import { PartialType } from '@nestjs/mapped-types';
import { CreateTeacherAttendanceClosureSignaturesDto } from './create-teacher_attendance_closure_signatures.dto';

export class UpdateTeacherAttendanceClosureSignaturesDto extends PartialType(CreateTeacherAttendanceClosureSignaturesDto) {}

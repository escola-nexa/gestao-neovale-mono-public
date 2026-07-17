import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherAttendanceClosureSignatures } from './entities/teacher_attendance_closure_signatures.entity';
import { TeacherAttendanceClosureSignaturesController } from './controllers/teacher_attendance_closure_signatures.controller';
import { FindTeacherAttendanceClosureSignaturesService } from './services/find-teacher_attendance_closure_signatures.service';
import { CreateTeacherAttendanceClosureSignaturesService } from './services/create-teacher_attendance_closure_signatures.service';
import { UpdateTeacherAttendanceClosureSignaturesService } from './services/update-teacher_attendance_closure_signatures.service';
import { DeleteTeacherAttendanceClosureSignaturesService } from './services/delete-teacher_attendance_closure_signatures.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherAttendanceClosureSignatures])],
  controllers: [TeacherAttendanceClosureSignaturesController],
  providers: [
    FindTeacherAttendanceClosureSignaturesService,
    CreateTeacherAttendanceClosureSignaturesService,
    UpdateTeacherAttendanceClosureSignaturesService,
    DeleteTeacherAttendanceClosureSignaturesService,
  ],
  exports: [FindTeacherAttendanceClosureSignaturesService],
})
export class TeacherAttendanceClosureSignaturesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherAttendanceAdjustments } from './entities/teacher_attendance_adjustments.entity';
import { TeacherAttendanceAdjustmentsController } from './controllers/teacher_attendance_adjustments.controller';
import { FindTeacherAttendanceAdjustmentsService } from './services/find-teacher_attendance_adjustments.service';
import { CreateTeacherAttendanceAdjustmentsService } from './services/create-teacher_attendance_adjustments.service';
import { UpdateTeacherAttendanceAdjustmentsService } from './services/update-teacher_attendance_adjustments.service';
import { DeleteTeacherAttendanceAdjustmentsService } from './services/delete-teacher_attendance_adjustments.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherAttendanceAdjustments])],
  controllers: [TeacherAttendanceAdjustmentsController],
  providers: [
    FindTeacherAttendanceAdjustmentsService,
    CreateTeacherAttendanceAdjustmentsService,
    UpdateTeacherAttendanceAdjustmentsService,
    DeleteTeacherAttendanceAdjustmentsService,
  ],
  exports: [FindTeacherAttendanceAdjustmentsService],
})
export class TeacherAttendanceAdjustmentsModule {}

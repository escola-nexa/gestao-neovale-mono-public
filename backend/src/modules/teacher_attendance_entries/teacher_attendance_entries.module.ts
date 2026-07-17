import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherAttendanceEntries } from './entities/teacher_attendance_entries.entity';
import { TeacherAttendanceEntriesController } from './controllers/teacher_attendance_entries.controller';
import { FindTeacherAttendanceEntriesService } from './services/find-teacher_attendance_entries.service';
import { CreateTeacherAttendanceEntriesService } from './services/create-teacher_attendance_entries.service';
import { UpdateTeacherAttendanceEntriesService } from './services/update-teacher_attendance_entries.service';
import { DeleteTeacherAttendanceEntriesService } from './services/delete-teacher_attendance_entries.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherAttendanceEntries])],
  controllers: [TeacherAttendanceEntriesController],
  providers: [
    FindTeacherAttendanceEntriesService,
    CreateTeacherAttendanceEntriesService,
    UpdateTeacherAttendanceEntriesService,
    DeleteTeacherAttendanceEntriesService,
  ],
  exports: [FindTeacherAttendanceEntriesService],
})
export class TeacherAttendanceEntriesModule {}

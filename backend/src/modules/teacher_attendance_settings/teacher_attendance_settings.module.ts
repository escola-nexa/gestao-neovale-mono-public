import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherAttendanceSettings } from './entities/teacher_attendance_settings.entity';
import { TeacherAttendanceSettingsController } from './controllers/teacher_attendance_settings.controller';
import { FindTeacherAttendanceSettingsService } from './services/find-teacher_attendance_settings.service';
import { CreateTeacherAttendanceSettingsService } from './services/create-teacher_attendance_settings.service';
import { UpdateTeacherAttendanceSettingsService } from './services/update-teacher_attendance_settings.service';
import { DeleteTeacherAttendanceSettingsService } from './services/delete-teacher_attendance_settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherAttendanceSettings])],
  controllers: [TeacherAttendanceSettingsController],
  providers: [
    FindTeacherAttendanceSettingsService,
    CreateTeacherAttendanceSettingsService,
    UpdateTeacherAttendanceSettingsService,
    DeleteTeacherAttendanceSettingsService,
  ],
  exports: [FindTeacherAttendanceSettingsService],
})
export class TeacherAttendanceSettingsModule {}

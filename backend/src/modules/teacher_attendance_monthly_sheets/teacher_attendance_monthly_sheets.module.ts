import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherAttendanceMonthlySheets } from './entities/teacher_attendance_monthly_sheets.entity';
import { TeacherAttendanceMonthlySheetsController } from './controllers/teacher_attendance_monthly_sheets.controller';
import { FindTeacherAttendanceMonthlySheetsService } from './services/find-teacher_attendance_monthly_sheets.service';
import { CreateTeacherAttendanceMonthlySheetsService } from './services/create-teacher_attendance_monthly_sheets.service';
import { UpdateTeacherAttendanceMonthlySheetsService } from './services/update-teacher_attendance_monthly_sheets.service';
import { DeleteTeacherAttendanceMonthlySheetsService } from './services/delete-teacher_attendance_monthly_sheets.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherAttendanceMonthlySheets])],
  controllers: [TeacherAttendanceMonthlySheetsController],
  providers: [
    FindTeacherAttendanceMonthlySheetsService,
    CreateTeacherAttendanceMonthlySheetsService,
    UpdateTeacherAttendanceMonthlySheetsService,
    DeleteTeacherAttendanceMonthlySheetsService,
  ],
  exports: [FindTeacherAttendanceMonthlySheetsService],
})
export class TeacherAttendanceMonthlySheetsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecords } from './entities/attendance_records.entity';
import { AttendanceRecordsController } from './controllers/attendance_records.controller';
import { FindAttendanceRecordsService } from './services/find-attendance_records.service';
import { CreateAttendanceRecordsService } from './services/create-attendance_records.service';
import { UpdateAttendanceRecordsService } from './services/update-attendance_records.service';
import { DeleteAttendanceRecordsService } from './services/delete-attendance_records.service';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceRecords])],
  controllers: [AttendanceRecordsController],
  providers: [
    FindAttendanceRecordsService,
    CreateAttendanceRecordsService,
    UpdateAttendanceRecordsService,
    DeleteAttendanceRecordsService,
  ],
  exports: [FindAttendanceRecordsService],
})
export class AttendanceRecordsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicCalendars } from './entities/academic_calendars.entity';
import { AcademicCalendarsController } from './controllers/academic_calendars.controller';
import { FindAcademicCalendarsService } from './services/find-academic_calendars.service';
import { CreateAcademicCalendarsService } from './services/create-academic_calendars.service';
import { UpdateAcademicCalendarsService } from './services/update-academic_calendars.service';
import { DeleteAcademicCalendarsService } from './services/delete-academic_calendars.service';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicCalendars])],
  controllers: [AcademicCalendarsController],
  providers: [
    FindAcademicCalendarsService,
    CreateAcademicCalendarsService,
    UpdateAcademicCalendarsService,
    DeleteAcademicCalendarsService,
  ],
  exports: [FindAcademicCalendarsService],
})
export class AcademicCalendarsModule {}

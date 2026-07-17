import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolTimeSlots } from './entities/school_time_slots.entity';
import { SchoolTimeSlotsController } from './controllers/school_time_slots.controller';
import { FindSchoolTimeSlotsService } from './services/find-school_time_slots.service';
import { CreateSchoolTimeSlotsService } from './services/create-school_time_slots.service';
import { UpdateSchoolTimeSlotsService } from './services/update-school_time_slots.service';
import { DeleteSchoolTimeSlotsService } from './services/delete-school_time_slots.service';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolTimeSlots])],
  controllers: [SchoolTimeSlotsController],
  providers: [
    FindSchoolTimeSlotsService,
    CreateSchoolTimeSlotsService,
    UpdateSchoolTimeSlotsService,
    DeleteSchoolTimeSlotsService,
  ],
  exports: [FindSchoolTimeSlotsService],
})
export class SchoolTimeSlotsModule {}

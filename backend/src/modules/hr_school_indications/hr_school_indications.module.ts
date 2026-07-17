import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrSchoolIndications } from './entities/hr_school_indications.entity';
import { HrSchoolIndicationsController } from './controllers/hr_school_indications.controller';
import { FindHrSchoolIndicationsService } from './services/find-hr_school_indications.service';
import { CreateHrSchoolIndicationsService } from './services/create-hr_school_indications.service';
import { UpdateHrSchoolIndicationsService } from './services/update-hr_school_indications.service';
import { DeleteHrSchoolIndicationsService } from './services/delete-hr_school_indications.service';

@Module({
  imports: [TypeOrmModule.forFeature([HrSchoolIndications])],
  controllers: [HrSchoolIndicationsController],
  providers: [
    FindHrSchoolIndicationsService,
    CreateHrSchoolIndicationsService,
    UpdateHrSchoolIndicationsService,
    DeleteHrSchoolIndicationsService,
  ],
  exports: [FindHrSchoolIndicationsService],
})
export class HrSchoolIndicationsModule {}

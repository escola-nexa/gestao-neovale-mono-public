import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolVisits } from './entities/school_visits.entity';
import { SchoolVisitsController } from './controllers/school_visits.controller';
import { FindSchoolVisitsService } from './services/find-school_visits.service';
import { CreateSchoolVisitsService } from './services/create-school_visits.service';
import { UpdateSchoolVisitsService } from './services/update-school_visits.service';
import { DeleteSchoolVisitsService } from './services/delete-school_visits.service';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolVisits])],
  controllers: [SchoolVisitsController],
  providers: [
    FindSchoolVisitsService,
    CreateSchoolVisitsService,
    UpdateSchoolVisitsService,
    DeleteSchoolVisitsService,
  ],
  exports: [FindSchoolVisitsService],
})
export class SchoolVisitsModule {}

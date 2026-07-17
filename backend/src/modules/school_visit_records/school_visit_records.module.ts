import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolVisitRecords } from './entities/school_visit_records.entity';
import { SchoolVisitRecordsController } from './controllers/school_visit_records.controller';
import { FindSchoolVisitRecordsService } from './services/find-school_visit_records.service';
import { CreateSchoolVisitRecordsService } from './services/create-school_visit_records.service';
import { UpdateSchoolVisitRecordsService } from './services/update-school_visit_records.service';
import { DeleteSchoolVisitRecordsService } from './services/delete-school_visit_records.service';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolVisitRecords])],
  controllers: [SchoolVisitRecordsController],
  providers: [
    FindSchoolVisitRecordsService,
    CreateSchoolVisitRecordsService,
    UpdateSchoolVisitRecordsService,
    DeleteSchoolVisitRecordsService,
  ],
  exports: [FindSchoolVisitRecordsService],
})
export class SchoolVisitRecordsModule {}

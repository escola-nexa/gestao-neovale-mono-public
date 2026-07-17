import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolVisitSchools } from './entities/school_visit_schools.entity';
import { SchoolVisitSchoolsController } from './controllers/school_visit_schools.controller';
import { FindSchoolVisitSchoolsService } from './services/find-school_visit_schools.service';
import { CreateSchoolVisitSchoolsService } from './services/create-school_visit_schools.service';
import { UpdateSchoolVisitSchoolsService } from './services/update-school_visit_schools.service';
import { DeleteSchoolVisitSchoolsService } from './services/delete-school_visit_schools.service';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolVisitSchools])],
  controllers: [SchoolVisitSchoolsController],
  providers: [
    FindSchoolVisitSchoolsService,
    CreateSchoolVisitSchoolsService,
    UpdateSchoolVisitSchoolsService,
    DeleteSchoolVisitSchoolsService,
  ],
  exports: [FindSchoolVisitSchoolsService],
})
export class SchoolVisitSchoolsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schools } from './entities/schools.entity';
import { SchoolsController } from './controllers/schools.controller';
import { FindSchoolsService } from './services/find-schools.service';
import { CreateSchoolService } from './services/create-school.service';
import { UpdateSchoolService } from './services/update-school.service';
import { DeleteSchoolService } from './services/delete-school.service';

@Module({
  imports: [TypeOrmModule.forFeature([Schools])],
  controllers: [SchoolsController],
  providers: [
    FindSchoolsService,
    CreateSchoolService,
    UpdateSchoolService,
    DeleteSchoolService,
  ],
  exports: [FindSchoolsService],
})
export class SchoolsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicBimesters } from './entities/academic_bimesters.entity';
import { AcademicBimestersController } from './controllers/academic_bimesters.controller';
import { FindAcademicBimestersService } from './services/find-academic_bimesters.service';
import { CreateAcademicBimestersService } from './services/create-academic_bimesters.service';
import { UpdateAcademicBimestersService } from './services/update-academic_bimesters.service';
import { DeleteAcademicBimestersService } from './services/delete-academic_bimesters.service';

@Module({
  imports: [TypeOrmModule.forFeature([AcademicBimesters])],
  controllers: [AcademicBimestersController],
  providers: [
    FindAcademicBimestersService,
    CreateAcademicBimestersService,
    UpdateAcademicBimestersService,
    DeleteAcademicBimestersService,
  ],
  exports: [FindAcademicBimestersService],
})
export class AcademicBimestersModule {}

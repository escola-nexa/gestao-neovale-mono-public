import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessorMedicalReports } from './entities/professor_medical_reports.entity';
import { ProfessorMedicalReportsController } from './controllers/professor_medical_reports.controller';
import { FindProfessorMedicalReportsService } from './services/find-professor_medical_reports.service';
import { CreateProfessorMedicalReportsService } from './services/create-professor_medical_reports.service';
import { UpdateProfessorMedicalReportsService } from './services/update-professor_medical_reports.service';
import { DeleteProfessorMedicalReportsService } from './services/delete-professor_medical_reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfessorMedicalReports])],
  controllers: [ProfessorMedicalReportsController],
  providers: [
    FindProfessorMedicalReportsService,
    CreateProfessorMedicalReportsService,
    UpdateProfessorMedicalReportsService,
    DeleteProfessorMedicalReportsService,
  ],
  exports: [FindProfessorMedicalReportsService],
})
export class ProfessorMedicalReportsModule {}

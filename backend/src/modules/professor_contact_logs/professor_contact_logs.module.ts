import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessorContactLogs } from './entities/professor_contact_logs.entity';
import { ProfessorContactLogsController } from './controllers/professor_contact_logs.controller';
import { FindProfessorContactLogsService } from './services/find-professor_contact_logs.service';
import { CreateProfessorContactLogsService } from './services/create-professor_contact_logs.service';
import { UpdateProfessorContactLogsService } from './services/update-professor_contact_logs.service';
import { DeleteProfessorContactLogsService } from './services/delete-professor_contact_logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfessorContactLogs])],
  controllers: [ProfessorContactLogsController],
  providers: [
    FindProfessorContactLogsService,
    CreateProfessorContactLogsService,
    UpdateProfessorContactLogsService,
    DeleteProfessorContactLogsService,
  ],
  exports: [FindProfessorContactLogsService],
})
export class ProfessorContactLogsModule {}

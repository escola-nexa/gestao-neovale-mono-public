import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessorStatusHistory } from './entities/professor_status_history.entity';
import { ProfessorStatusHistoryController } from './controllers/professor_status_history.controller';
import { FindProfessorStatusHistoryService } from './services/find-professor_status_history.service';
import { CreateProfessorStatusHistoryService } from './services/create-professor_status_history.service';
import { UpdateProfessorStatusHistoryService } from './services/update-professor_status_history.service';
import { DeleteProfessorStatusHistoryService } from './services/delete-professor_status_history.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfessorStatusHistory])],
  controllers: [ProfessorStatusHistoryController],
  providers: [
    FindProfessorStatusHistoryService,
    CreateProfessorStatusHistoryService,
    UpdateProfessorStatusHistoryService,
    DeleteProfessorStatusHistoryService,
  ],
  exports: [FindProfessorStatusHistoryService],
})
export class ProfessorStatusHistoryModule {}

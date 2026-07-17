import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessorUnbindingHistory } from './entities/professor_unbinding_history.entity';
import { ProfessorUnbindingHistoryController } from './controllers/professor_unbinding_history.controller';
import { FindProfessorUnbindingHistoryService } from './services/find-professor_unbinding_history.service';
import { CreateProfessorUnbindingHistoryService } from './services/create-professor_unbinding_history.service';
import { UpdateProfessorUnbindingHistoryService } from './services/update-professor_unbinding_history.service';
import { DeleteProfessorUnbindingHistoryService } from './services/delete-professor_unbinding_history.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfessorUnbindingHistory])],
  controllers: [ProfessorUnbindingHistoryController],
  providers: [
    FindProfessorUnbindingHistoryService,
    CreateProfessorUnbindingHistoryService,
    UpdateProfessorUnbindingHistoryService,
    DeleteProfessorUnbindingHistoryService,
  ],
  exports: [FindProfessorUnbindingHistoryService],
})
export class ProfessorUnbindingHistoryModule {}

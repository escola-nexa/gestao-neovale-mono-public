import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessorKanbanState } from './entities/professor_kanban_state.entity';
import { ProfessorKanbanStateController } from './controllers/professor_kanban_state.controller';
import { FindProfessorKanbanStateService } from './services/find-professor_kanban_state.service';
import { CreateProfessorKanbanStateService } from './services/create-professor_kanban_state.service';
import { UpdateProfessorKanbanStateService } from './services/update-professor_kanban_state.service';
import { DeleteProfessorKanbanStateService } from './services/delete-professor_kanban_state.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfessorKanbanState])],
  controllers: [ProfessorKanbanStateController],
  providers: [
    FindProfessorKanbanStateService,
    CreateProfessorKanbanStateService,
    UpdateProfessorKanbanStateService,
    DeleteProfessorKanbanStateService,
  ],
  exports: [FindProfessorKanbanStateService],
})
export class ProfessorKanbanStateModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessorKanbanLabels } from './entities/professor_kanban_labels.entity';
import { ProfessorKanbanLabelsController } from './controllers/professor_kanban_labels.controller';
import { FindProfessorKanbanLabelsService } from './services/find-professor_kanban_labels.service';
import { CreateProfessorKanbanLabelsService } from './services/create-professor_kanban_labels.service';
import { UpdateProfessorKanbanLabelsService } from './services/update-professor_kanban_labels.service';
import { DeleteProfessorKanbanLabelsService } from './services/delete-professor_kanban_labels.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfessorKanbanLabels])],
  controllers: [ProfessorKanbanLabelsController],
  providers: [
    FindProfessorKanbanLabelsService,
    CreateProfessorKanbanLabelsService,
    UpdateProfessorKanbanLabelsService,
    DeleteProfessorKanbanLabelsService,
  ],
  exports: [FindProfessorKanbanLabelsService],
})
export class ProfessorKanbanLabelsModule {}

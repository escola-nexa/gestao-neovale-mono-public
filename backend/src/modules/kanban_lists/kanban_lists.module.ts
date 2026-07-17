import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KanbanLists } from './entities/kanban_lists.entity';
import { KanbanListsController } from './controllers/kanban_lists.controller';
import { FindKanbanListsService } from './services/find-kanban_lists.service';
import { CreateKanbanListsService } from './services/create-kanban_lists.service';
import { UpdateKanbanListsService } from './services/update-kanban_lists.service';
import { DeleteKanbanListsService } from './services/delete-kanban_lists.service';

@Module({
  imports: [TypeOrmModule.forFeature([KanbanLists])],
  controllers: [KanbanListsController],
  providers: [
    FindKanbanListsService,
    CreateKanbanListsService,
    UpdateKanbanListsService,
    DeleteKanbanListsService,
  ],
  exports: [FindKanbanListsService],
})
export class KanbanListsModule {}

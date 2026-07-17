import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessorChildren } from './entities/professor_children.entity';
import { ProfessorChildrenController } from './controllers/professor_children.controller';
import { FindProfessorChildrenService } from './services/find-professor_children.service';
import { CreateProfessorChildrenService } from './services/create-professor_children.service';
import { UpdateProfessorChildrenService } from './services/update-professor_children.service';
import { DeleteProfessorChildrenService } from './services/delete-professor_children.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfessorChildren])],
  controllers: [ProfessorChildrenController],
  providers: [
    FindProfessorChildrenService,
    CreateProfessorChildrenService,
    UpdateProfessorChildrenService,
    DeleteProfessorChildrenService,
  ],
  exports: [FindProfessorChildrenService],
})
export class ProfessorChildrenModule {}

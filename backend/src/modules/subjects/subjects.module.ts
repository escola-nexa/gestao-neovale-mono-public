import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subjects } from './entities/subjects.entity';
import { SubjectsController } from './controllers/subjects.controller';
import { FindSubjectsService } from './services/find-subjects.service';
import { CreateSubjectsService } from './services/create-subjects.service';
import { UpdateSubjectsService } from './services/update-subjects.service';
import { DeleteSubjectsService } from './services/delete-subjects.service';

@Module({
  imports: [TypeOrmModule.forFeature([Subjects])],
  controllers: [SubjectsController],
  providers: [
    FindSubjectsService,
    CreateSubjectsService,
    UpdateSubjectsService,
    DeleteSubjectsService,
  ],
  exports: [FindSubjectsService],
})
export class SubjectsModule {}

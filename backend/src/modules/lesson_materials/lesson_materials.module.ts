import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonMaterials } from './entities/lesson_materials.entity';
import { LessonMaterialsController } from './controllers/lesson_materials.controller';
import { FindLessonMaterialsService } from './services/find-lesson_materials.service';
import { CreateLessonMaterialsService } from './services/create-lesson_materials.service';
import { UpdateLessonMaterialsService } from './services/update-lesson_materials.service';
import { DeleteLessonMaterialsService } from './services/delete-lesson_materials.service';

@Module({
  imports: [TypeOrmModule.forFeature([LessonMaterials])],
  controllers: [LessonMaterialsController],
  providers: [
    FindLessonMaterialsService,
    CreateLessonMaterialsService,
    UpdateLessonMaterialsService,
    DeleteLessonMaterialsService,
  ],
  exports: [FindLessonMaterialsService],
})
export class LessonMaterialsModule {}

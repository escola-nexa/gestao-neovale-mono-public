import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Courses } from './entities/courses.entity';
import { CoursesController } from './controllers/courses.controller';
import { FindCoursesService } from './services/find-courses.service';
import { CreateCoursesService } from './services/create-courses.service';
import { UpdateCoursesService } from './services/update-courses.service';
import { DeleteCoursesService } from './services/delete-courses.service';

@Module({
  imports: [TypeOrmModule.forFeature([Courses])],
  controllers: [CoursesController],
  providers: [
    FindCoursesService,
    CreateCoursesService,
    UpdateCoursesService,
    DeleteCoursesService,
  ],
  exports: [FindCoursesService],
})
export class CoursesModule {}

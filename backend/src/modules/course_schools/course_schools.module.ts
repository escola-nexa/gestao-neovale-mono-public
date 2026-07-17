import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseSchools } from './entities/course_schools.entity';
import { CourseSchoolsController } from './controllers/course_schools.controller';
import { FindCourseSchoolsService } from './services/find-course_schools.service';
import { CreateCourseSchoolsService } from './services/create-course_schools.service';
import { UpdateCourseSchoolsService } from './services/update-course_schools.service';
import { DeleteCourseSchoolsService } from './services/delete-course_schools.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseSchools])],
  controllers: [CourseSchoolsController],
  providers: [
    FindCourseSchoolsService,
    CreateCourseSchoolsService,
    UpdateCourseSchoolsService,
    DeleteCourseSchoolsService,
  ],
  exports: [FindCourseSchoolsService],
})
export class CourseSchoolsModule {}

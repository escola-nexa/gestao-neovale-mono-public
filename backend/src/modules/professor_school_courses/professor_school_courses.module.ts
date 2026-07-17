import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessorSchoolCourses } from './entities/professor_school_courses.entity';
import { ProfessorSchoolCoursesController } from './controllers/professor_school_courses.controller';
import { FindProfessorSchoolCoursesService } from './services/find-professor_school_courses.service';
import { CreateProfessorSchoolCoursesService } from './services/create-professor_school_courses.service';
import { UpdateProfessorSchoolCoursesService } from './services/update-professor_school_courses.service';
import { DeleteProfessorSchoolCoursesService } from './services/delete-professor_school_courses.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfessorSchoolCourses])],
  controllers: [ProfessorSchoolCoursesController],
  providers: [
    FindProfessorSchoolCoursesService,
    CreateProfessorSchoolCoursesService,
    UpdateProfessorSchoolCoursesService,
    DeleteProfessorSchoolCoursesService,
  ],
  exports: [FindProfessorSchoolCoursesService],
})
export class ProfessorSchoolCoursesModule {}

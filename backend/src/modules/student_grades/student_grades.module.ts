import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentGrades } from './entities/student_grades.entity';
import { StudentGradesController } from './controllers/student_grades.controller';
import { FindStudentGradesService } from './services/find-student_grades.service';
import { CreateStudentGradesService } from './services/create-student_grades.service';
import { UpdateStudentGradesService } from './services/update-student_grades.service';
import { DeleteStudentGradesService } from './services/delete-student_grades.service';

@Module({
  imports: [TypeOrmModule.forFeature([StudentGrades])],
  controllers: [StudentGradesController],
  providers: [
    FindStudentGradesService,
    CreateStudentGradesService,
    UpdateStudentGradesService,
    DeleteStudentGradesService,
  ],
  exports: [FindStudentGradesService],
})
export class StudentGradesModule {}

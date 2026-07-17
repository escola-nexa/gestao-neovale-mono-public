import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherSubstitutionOccurrences } from './entities/teacher_substitution_occurrences.entity';
import { TeacherSubstitutionOccurrencesController } from './controllers/teacher_substitution_occurrences.controller';
import { FindTeacherSubstitutionOccurrencesService } from './services/find-teacher_substitution_occurrences.service';
import { CreateTeacherSubstitutionOccurrencesService } from './services/create-teacher_substitution_occurrences.service';
import { UpdateTeacherSubstitutionOccurrencesService } from './services/update-teacher_substitution_occurrences.service';
import { DeleteTeacherSubstitutionOccurrencesService } from './services/delete-teacher_substitution_occurrences.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherSubstitutionOccurrences])],
  controllers: [TeacherSubstitutionOccurrencesController],
  providers: [
    FindTeacherSubstitutionOccurrencesService,
    CreateTeacherSubstitutionOccurrencesService,
    UpdateTeacherSubstitutionOccurrencesService,
    DeleteTeacherSubstitutionOccurrencesService,
  ],
  exports: [FindTeacherSubstitutionOccurrencesService],
})
export class TeacherSubstitutionOccurrencesModule {}

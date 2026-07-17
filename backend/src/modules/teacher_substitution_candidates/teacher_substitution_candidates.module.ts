import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherSubstitutionCandidates } from './entities/teacher_substitution_candidates.entity';
import { TeacherSubstitutionCandidatesController } from './controllers/teacher_substitution_candidates.controller';
import { FindTeacherSubstitutionCandidatesService } from './services/find-teacher_substitution_candidates.service';
import { CreateTeacherSubstitutionCandidatesService } from './services/create-teacher_substitution_candidates.service';
import { UpdateTeacherSubstitutionCandidatesService } from './services/update-teacher_substitution_candidates.service';
import { DeleteTeacherSubstitutionCandidatesService } from './services/delete-teacher_substitution_candidates.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherSubstitutionCandidates])],
  controllers: [TeacherSubstitutionCandidatesController],
  providers: [
    FindTeacherSubstitutionCandidatesService,
    CreateTeacherSubstitutionCandidatesService,
    UpdateTeacherSubstitutionCandidatesService,
    DeleteTeacherSubstitutionCandidatesService,
  ],
  exports: [FindTeacherSubstitutionCandidatesService],
})
export class TeacherSubstitutionCandidatesModule {}

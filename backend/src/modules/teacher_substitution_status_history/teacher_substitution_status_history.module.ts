import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherSubstitutionStatusHistory } from './entities/teacher_substitution_status_history.entity';
import { TeacherSubstitutionStatusHistoryController } from './controllers/teacher_substitution_status_history.controller';
import { FindTeacherSubstitutionStatusHistoryService } from './services/find-teacher_substitution_status_history.service';
import { CreateTeacherSubstitutionStatusHistoryService } from './services/create-teacher_substitution_status_history.service';
import { UpdateTeacherSubstitutionStatusHistoryService } from './services/update-teacher_substitution_status_history.service';
import { DeleteTeacherSubstitutionStatusHistoryService } from './services/delete-teacher_substitution_status_history.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherSubstitutionStatusHistory])],
  controllers: [TeacherSubstitutionStatusHistoryController],
  providers: [
    FindTeacherSubstitutionStatusHistoryService,
    CreateTeacherSubstitutionStatusHistoryService,
    UpdateTeacherSubstitutionStatusHistoryService,
    DeleteTeacherSubstitutionStatusHistoryService,
  ],
  exports: [FindTeacherSubstitutionStatusHistoryService],
})
export class TeacherSubstitutionStatusHistoryModule {}

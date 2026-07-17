import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherSubstitutionRequests } from './entities/teacher_substitution_requests.entity';
import { TeacherSubstitutionRequestsController } from './controllers/teacher_substitution_requests.controller';
import { FindTeacherSubstitutionRequestsService } from './services/find-teacher_substitution_requests.service';
import { CreateTeacherSubstitutionRequestsService } from './services/create-teacher_substitution_requests.service';
import { UpdateTeacherSubstitutionRequestsService } from './services/update-teacher_substitution_requests.service';
import { DeleteTeacherSubstitutionRequestsService } from './services/delete-teacher_substitution_requests.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherSubstitutionRequests])],
  controllers: [TeacherSubstitutionRequestsController],
  providers: [
    FindTeacherSubstitutionRequestsService,
    CreateTeacherSubstitutionRequestsService,
    UpdateTeacherSubstitutionRequestsService,
    DeleteTeacherSubstitutionRequestsService,
  ],
  exports: [FindTeacherSubstitutionRequestsService],
})
export class TeacherSubstitutionRequestsModule {}

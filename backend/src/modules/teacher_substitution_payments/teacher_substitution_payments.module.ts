import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherSubstitutionPayments } from './entities/teacher_substitution_payments.entity';
import { TeacherSubstitutionPaymentsController } from './controllers/teacher_substitution_payments.controller';
import { FindTeacherSubstitutionPaymentsService } from './services/find-teacher_substitution_payments.service';
import { CreateTeacherSubstitutionPaymentsService } from './services/create-teacher_substitution_payments.service';
import { UpdateTeacherSubstitutionPaymentsService } from './services/update-teacher_substitution_payments.service';
import { DeleteTeacherSubstitutionPaymentsService } from './services/delete-teacher_substitution_payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherSubstitutionPayments])],
  controllers: [TeacherSubstitutionPaymentsController],
  providers: [
    FindTeacherSubstitutionPaymentsService,
    CreateTeacherSubstitutionPaymentsService,
    UpdateTeacherSubstitutionPaymentsService,
    DeleteTeacherSubstitutionPaymentsService,
  ],
  exports: [FindTeacherSubstitutionPaymentsService],
})
export class TeacherSubstitutionPaymentsModule {}

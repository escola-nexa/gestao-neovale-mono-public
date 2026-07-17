import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherSubstitutionFinancialAccess } from './entities/teacher_substitution_financial_access.entity';
import { TeacherSubstitutionFinancialAccessController } from './controllers/teacher_substitution_financial_access.controller';
import { FindTeacherSubstitutionFinancialAccessService } from './services/find-teacher_substitution_financial_access.service';
import { CreateTeacherSubstitutionFinancialAccessService } from './services/create-teacher_substitution_financial_access.service';
import { UpdateTeacherSubstitutionFinancialAccessService } from './services/update-teacher_substitution_financial_access.service';
import { DeleteTeacherSubstitutionFinancialAccessService } from './services/delete-teacher_substitution_financial_access.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherSubstitutionFinancialAccess])],
  controllers: [TeacherSubstitutionFinancialAccessController],
  providers: [
    FindTeacherSubstitutionFinancialAccessService,
    CreateTeacherSubstitutionFinancialAccessService,
    UpdateTeacherSubstitutionFinancialAccessService,
    DeleteTeacherSubstitutionFinancialAccessService,
  ],
  exports: [FindTeacherSubstitutionFinancialAccessService],
})
export class TeacherSubstitutionFinancialAccessModule {}

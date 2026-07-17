import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aluno } from './entities/aluno.entity';
import { Enrollment } from './entities/enrollment.entity';
import { AlunoController } from './controllers/aluno.controller';
import { CreateAlunoService } from './services/create-aluno.service';
import { FindAlunoService } from './services/find-aluno.service';
import { UpdateAlunoService } from './services/update-aluno.service';
import { DeleteAlunoService } from './services/delete-aluno.service';
import { CreateEnrollmentService } from './services/create-enrollment.service';
import { FindEnrollmentService } from './services/find-enrollment.service';

@Module({
  imports: [TypeOrmModule.forFeature([Aluno, Enrollment])],
  controllers: [AlunoController],
  providers: [
    CreateAlunoService,
    FindAlunoService,
    UpdateAlunoService,
    DeleteAlunoService,
    CreateEnrollmentService,
    FindEnrollmentService,
  ],
  exports: [FindAlunoService],
})
export class AlunoModule {}

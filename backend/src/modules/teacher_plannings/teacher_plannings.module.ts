import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherPlannings } from './entities/teacher_plannings.entity';
import { TeacherPlanningsController } from './controllers/teacher_plannings.controller';
import { FindTeacherPlanningsService } from './services/find-teacher_plannings.service';
import { CreateTeacherPlanningsService } from './services/create-teacher_plannings.service';
import { UpdateTeacherPlanningsService } from './services/update-teacher_plannings.service';
import { DeleteTeacherPlanningsService } from './services/delete-teacher_plannings.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherPlannings])],
  controllers: [TeacherPlanningsController],
  providers: [
    FindTeacherPlanningsService,
    CreateTeacherPlanningsService,
    UpdateTeacherPlanningsService,
    DeleteTeacherPlanningsService,
  ],
  exports: [FindTeacherPlanningsService],
})
export class TeacherPlanningsModule {}

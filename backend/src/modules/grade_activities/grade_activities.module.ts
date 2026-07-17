import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradeActivities } from './entities/grade_activities.entity';
import { GradeActivitiesController } from './controllers/grade_activities.controller';
import { FindGradeActivitiesService } from './services/find-grade_activities.service';
import { CreateGradeActivitiesService } from './services/create-grade_activities.service';
import { UpdateGradeActivitiesService } from './services/update-grade_activities.service';
import { DeleteGradeActivitiesService } from './services/delete-grade_activities.service';

@Module({
  imports: [TypeOrmModule.forFeature([GradeActivities])],
  controllers: [GradeActivitiesController],
  providers: [
    FindGradeActivitiesService,
    CreateGradeActivitiesService,
    UpdateGradeActivitiesService,
    DeleteGradeActivitiesService,
  ],
  exports: [FindGradeActivitiesService],
})
export class GradeActivitiesModule {}

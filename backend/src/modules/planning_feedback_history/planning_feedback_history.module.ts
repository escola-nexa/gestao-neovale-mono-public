import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanningFeedbackHistory } from './entities/planning_feedback_history.entity';
import { PlanningFeedbackHistoryController } from './controllers/planning_feedback_history.controller';
import { FindPlanningFeedbackHistoryService } from './services/find-planning_feedback_history.service';
import { CreatePlanningFeedbackHistoryService } from './services/create-planning_feedback_history.service';
import { UpdatePlanningFeedbackHistoryService } from './services/update-planning_feedback_history.service';
import { DeletePlanningFeedbackHistoryService } from './services/delete-planning_feedback_history.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlanningFeedbackHistory])],
  controllers: [PlanningFeedbackHistoryController],
  providers: [
    FindPlanningFeedbackHistoryService,
    CreatePlanningFeedbackHistoryService,
    UpdatePlanningFeedbackHistoryService,
    DeletePlanningFeedbackHistoryService,
  ],
  exports: [FindPlanningFeedbackHistoryService],
})
export class PlanningFeedbackHistoryModule {}

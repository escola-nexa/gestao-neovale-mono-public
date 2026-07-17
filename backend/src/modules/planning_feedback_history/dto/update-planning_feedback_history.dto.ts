import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanningFeedbackHistoryDto } from './create-planning_feedback_history.dto';

export class UpdatePlanningFeedbackHistoryDto extends PartialType(CreatePlanningFeedbackHistoryDto) {}

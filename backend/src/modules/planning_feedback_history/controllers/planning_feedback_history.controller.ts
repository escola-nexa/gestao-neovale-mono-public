import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreatePlanningFeedbackHistoryDto } from '../dto/create-planning_feedback_history.dto';
import { UpdatePlanningFeedbackHistoryDto } from '../dto/update-planning_feedback_history.dto';
import { FindPlanningFeedbackHistoryService } from '../services/find-planning_feedback_history.service';
import { CreatePlanningFeedbackHistoryService } from '../services/create-planning_feedback_history.service';
import { UpdatePlanningFeedbackHistoryService } from '../services/update-planning_feedback_history.service';
import { DeletePlanningFeedbackHistoryService } from '../services/delete-planning_feedback_history.service';

@Controller('planning-feedback-history')
@UseGuards(JwtAuthGuard)
export class PlanningFeedbackHistoryController {
  constructor(
    private readonly findService: FindPlanningFeedbackHistoryService,
    private readonly createService: CreatePlanningFeedbackHistoryService,
    private readonly updateService: UpdatePlanningFeedbackHistoryService,
    private readonly deleteService: DeletePlanningFeedbackHistoryService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreatePlanningFeedbackHistoryDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePlanningFeedbackHistoryDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}

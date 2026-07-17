import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanningTemplates } from './entities/planning_templates.entity';
import { PlanningTemplatesController } from './controllers/planning_templates.controller';
import { FindPlanningTemplatesService } from './services/find-planning_templates.service';
import { CreatePlanningTemplatesService } from './services/create-planning_templates.service';
import { UpdatePlanningTemplatesService } from './services/update-planning_templates.service';
import { DeletePlanningTemplatesService } from './services/delete-planning_templates.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlanningTemplates])],
  controllers: [PlanningTemplatesController],
  providers: [
    FindPlanningTemplatesService,
    CreatePlanningTemplatesService,
    UpdatePlanningTemplatesService,
    DeletePlanningTemplatesService,
  ],
  exports: [FindPlanningTemplatesService],
})
export class PlanningTemplatesModule {}

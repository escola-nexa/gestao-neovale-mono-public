import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrePlanningMaterials } from './entities/pre_planning_materials.entity';
import { PrePlanningMaterialsController } from './controllers/pre_planning_materials.controller';
import { FindPrePlanningMaterialsService } from './services/find-pre_planning_materials.service';
import { CreatePrePlanningMaterialsService } from './services/create-pre_planning_materials.service';
import { UpdatePrePlanningMaterialsService } from './services/update-pre_planning_materials.service';
import { DeletePrePlanningMaterialsService } from './services/delete-pre_planning_materials.service';

@Module({
  imports: [TypeOrmModule.forFeature([PrePlanningMaterials])],
  controllers: [PrePlanningMaterialsController],
  providers: [
    FindPrePlanningMaterialsService,
    CreatePrePlanningMaterialsService,
    UpdatePrePlanningMaterialsService,
    DeletePrePlanningMaterialsService,
  ],
  exports: [FindPrePlanningMaterialsService],
})
export class PrePlanningMaterialsModule {}

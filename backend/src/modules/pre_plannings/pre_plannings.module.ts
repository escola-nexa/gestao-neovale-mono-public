import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrePlannings } from './entities/pre_plannings.entity';
import { PrePlanningsController } from './controllers/pre_plannings.controller';
import { FindPrePlanningsService } from './services/find-pre_plannings.service';
import { CreatePrePlanningsService } from './services/create-pre_plannings.service';
import { UpdatePrePlanningsService } from './services/update-pre_plannings.service';
import { DeletePrePlanningsService } from './services/delete-pre_plannings.service';

@Module({
  imports: [TypeOrmModule.forFeature([PrePlannings])],
  controllers: [PrePlanningsController],
  providers: [
    FindPrePlanningsService,
    CreatePrePlanningsService,
    UpdatePrePlanningsService,
    DeletePrePlanningsService,
  ],
  exports: [FindPrePlanningsService],
})
export class PrePlanningsModule {}

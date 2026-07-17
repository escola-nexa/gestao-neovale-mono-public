import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrAllocationPlans } from './entities/hr_allocation_plans.entity';
import { HrAllocationPlansController } from './controllers/hr_allocation_plans.controller';
import { FindHrAllocationPlansService } from './services/find-hr_allocation_plans.service';
import { CreateHrAllocationPlansService } from './services/create-hr_allocation_plans.service';
import { UpdateHrAllocationPlansService } from './services/update-hr_allocation_plans.service';
import { DeleteHrAllocationPlansService } from './services/delete-hr_allocation_plans.service';

@Module({
  imports: [TypeOrmModule.forFeature([HrAllocationPlans])],
  controllers: [HrAllocationPlansController],
  providers: [
    FindHrAllocationPlansService,
    CreateHrAllocationPlansService,
    UpdateHrAllocationPlansService,
    DeleteHrAllocationPlansService,
  ],
  exports: [FindHrAllocationPlansService],
})
export class HrAllocationPlansModule {}

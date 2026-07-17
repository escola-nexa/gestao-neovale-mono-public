import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialCostCenters } from './entities/financial_cost_centers.entity';
import { FinancialCostCentersController } from './controllers/financial_cost_centers.controller';
import { FindFinancialCostCentersService } from './services/find-financial_cost_centers.service';
import { CreateFinancialCostCentersService } from './services/create-financial_cost_centers.service';
import { UpdateFinancialCostCentersService } from './services/update-financial_cost_centers.service';
import { DeleteFinancialCostCentersService } from './services/delete-financial_cost_centers.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialCostCenters])],
  controllers: [FinancialCostCentersController],
  providers: [
    FindFinancialCostCentersService,
    CreateFinancialCostCentersService,
    UpdateFinancialCostCentersService,
    DeleteFinancialCostCentersService,
  ],
  exports: [FindFinancialCostCentersService],
})
export class FinancialCostCentersModule {}

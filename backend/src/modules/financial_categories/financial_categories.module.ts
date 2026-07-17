import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialCategories } from './entities/financial_categories.entity';
import { FinancialCategoriesController } from './controllers/financial_categories.controller';
import { FindFinancialCategoriesService } from './services/find-financial_categories.service';
import { CreateFinancialCategoriesService } from './services/create-financial_categories.service';
import { UpdateFinancialCategoriesService } from './services/update-financial_categories.service';
import { DeleteFinancialCategoriesService } from './services/delete-financial_categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialCategories])],
  controllers: [FinancialCategoriesController],
  providers: [
    FindFinancialCategoriesService,
    CreateFinancialCategoriesService,
    UpdateFinancialCategoriesService,
    DeleteFinancialCategoriesService,
  ],
  exports: [FindFinancialCategoriesService],
})
export class FinancialCategoriesModule {}

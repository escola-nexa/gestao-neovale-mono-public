import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialProjects } from './entities/financial_projects.entity';
import { FinancialProjectsController } from './controllers/financial_projects.controller';
import { FindFinancialProjectsService } from './services/find-financial_projects.service';
import { CreateFinancialProjectsService } from './services/create-financial_projects.service';
import { UpdateFinancialProjectsService } from './services/update-financial_projects.service';
import { DeleteFinancialProjectsService } from './services/delete-financial_projects.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialProjects])],
  controllers: [FinancialProjectsController],
  providers: [
    FindFinancialProjectsService,
    CreateFinancialProjectsService,
    UpdateFinancialProjectsService,
    DeleteFinancialProjectsService,
  ],
  exports: [FindFinancialProjectsService],
})
export class FinancialProjectsModule {}

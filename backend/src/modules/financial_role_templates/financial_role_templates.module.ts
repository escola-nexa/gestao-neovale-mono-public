import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialRoleTemplates } from './entities/financial_role_templates.entity';
import { FinancialRoleTemplatesController } from './controllers/financial_role_templates.controller';
import { FindFinancialRoleTemplatesService } from './services/find-financial_role_templates.service';
import { CreateFinancialRoleTemplatesService } from './services/create-financial_role_templates.service';
import { UpdateFinancialRoleTemplatesService } from './services/update-financial_role_templates.service';
import { DeleteFinancialRoleTemplatesService } from './services/delete-financial_role_templates.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialRoleTemplates])],
  controllers: [FinancialRoleTemplatesController],
  providers: [
    FindFinancialRoleTemplatesService,
    CreateFinancialRoleTemplatesService,
    UpdateFinancialRoleTemplatesService,
    DeleteFinancialRoleTemplatesService,
  ],
  exports: [FindFinancialRoleTemplatesService],
})
export class FinancialRoleTemplatesModule {}

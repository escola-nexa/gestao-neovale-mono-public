import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialRoleTemplatePermissions } from './entities/financial_role_template_permissions.entity';
import { FinancialRoleTemplatePermissionsController } from './controllers/financial_role_template_permissions.controller';
import { FindFinancialRoleTemplatePermissionsService } from './services/find-financial_role_template_permissions.service';
import { CreateFinancialRoleTemplatePermissionsService } from './services/create-financial_role_template_permissions.service';
import { UpdateFinancialRoleTemplatePermissionsService } from './services/update-financial_role_template_permissions.service';
import { DeleteFinancialRoleTemplatePermissionsService } from './services/delete-financial_role_template_permissions.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialRoleTemplatePermissions])],
  controllers: [FinancialRoleTemplatePermissionsController],
  providers: [
    FindFinancialRoleTemplatePermissionsService,
    CreateFinancialRoleTemplatePermissionsService,
    UpdateFinancialRoleTemplatePermissionsService,
    DeleteFinancialRoleTemplatePermissionsService,
  ],
  exports: [FindFinancialRoleTemplatePermissionsService],
})
export class FinancialRoleTemplatePermissionsModule {}

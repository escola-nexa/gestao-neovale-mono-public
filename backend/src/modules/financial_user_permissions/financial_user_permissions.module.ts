import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialUserPermissions } from './entities/financial_user_permissions.entity';
import { FinancialUserPermissionsController } from './controllers/financial_user_permissions.controller';
import { FindFinancialUserPermissionsService } from './services/find-financial_user_permissions.service';
import { CreateFinancialUserPermissionsService } from './services/create-financial_user_permissions.service';
import { UpdateFinancialUserPermissionsService } from './services/update-financial_user_permissions.service';
import { DeleteFinancialUserPermissionsService } from './services/delete-financial_user_permissions.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialUserPermissions])],
  controllers: [FinancialUserPermissionsController],
  providers: [
    FindFinancialUserPermissionsService,
    CreateFinancialUserPermissionsService,
    UpdateFinancialUserPermissionsService,
    DeleteFinancialUserPermissionsService,
  ],
  exports: [FindFinancialUserPermissionsService],
})
export class FinancialUserPermissionsModule {}

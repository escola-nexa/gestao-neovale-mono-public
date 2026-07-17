import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialPermissions } from './entities/financial_permissions.entity';
import { FinancialPermissionsController } from './controllers/financial_permissions.controller';
import { FindFinancialPermissionsService } from './services/find-financial_permissions.service';
import { CreateFinancialPermissionsService } from './services/create-financial_permissions.service';
import { UpdateFinancialPermissionsService } from './services/update-financial_permissions.service';
import { DeleteFinancialPermissionsService } from './services/delete-financial_permissions.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialPermissions])],
  controllers: [FinancialPermissionsController],
  providers: [
    FindFinancialPermissionsService,
    CreateFinancialPermissionsService,
    UpdateFinancialPermissionsService,
    DeleteFinancialPermissionsService,
  ],
  exports: [FindFinancialPermissionsService],
})
export class FinancialPermissionsModule {}

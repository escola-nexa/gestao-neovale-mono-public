import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialUserScopes } from './entities/financial_user_scopes.entity';
import { FinancialUserScopesController } from './controllers/financial_user_scopes.controller';
import { FindFinancialUserScopesService } from './services/find-financial_user_scopes.service';
import { CreateFinancialUserScopesService } from './services/create-financial_user_scopes.service';
import { UpdateFinancialUserScopesService } from './services/update-financial_user_scopes.service';
import { DeleteFinancialUserScopesService } from './services/delete-financial_user_scopes.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialUserScopes])],
  controllers: [FinancialUserScopesController],
  providers: [
    FindFinancialUserScopesService,
    CreateFinancialUserScopesService,
    UpdateFinancialUserScopesService,
    DeleteFinancialUserScopesService,
  ],
  exports: [FindFinancialUserScopesService],
})
export class FinancialUserScopesModule {}

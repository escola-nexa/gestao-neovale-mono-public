import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialSettings } from './entities/financial_settings.entity';
import { FinancialSettingsController } from './controllers/financial_settings.controller';
import { FindFinancialSettingsService } from './services/find-financial_settings.service';
import { CreateFinancialSettingsService } from './services/create-financial_settings.service';
import { UpdateFinancialSettingsService } from './services/update-financial_settings.service';
import { DeleteFinancialSettingsService } from './services/delete-financial_settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialSettings])],
  controllers: [FinancialSettingsController],
  providers: [
    FindFinancialSettingsService,
    CreateFinancialSettingsService,
    UpdateFinancialSettingsService,
    DeleteFinancialSettingsService,
  ],
  exports: [FindFinancialSettingsService],
})
export class FinancialSettingsModule {}

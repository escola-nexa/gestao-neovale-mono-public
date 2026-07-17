import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialTransfers } from './entities/financial_transfers.entity';
import { FinancialTransfersController } from './controllers/financial_transfers.controller';
import { FindFinancialTransfersService } from './services/find-financial_transfers.service';
import { CreateFinancialTransfersService } from './services/create-financial_transfers.service';
import { UpdateFinancialTransfersService } from './services/update-financial_transfers.service';
import { DeleteFinancialTransfersService } from './services/delete-financial_transfers.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialTransfers])],
  controllers: [FinancialTransfersController],
  providers: [
    FindFinancialTransfersService,
    CreateFinancialTransfersService,
    UpdateFinancialTransfersService,
    DeleteFinancialTransfersService,
  ],
  exports: [FindFinancialTransfersService],
})
export class FinancialTransfersModule {}

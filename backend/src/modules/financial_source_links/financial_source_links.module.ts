import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialSourceLinks } from './entities/financial_source_links.entity';
import { FinancialSourceLinksController } from './controllers/financial_source_links.controller';
import { FindFinancialSourceLinksService } from './services/find-financial_source_links.service';
import { CreateFinancialSourceLinksService } from './services/create-financial_source_links.service';
import { UpdateFinancialSourceLinksService } from './services/update-financial_source_links.service';
import { DeleteFinancialSourceLinksService } from './services/delete-financial_source_links.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialSourceLinks])],
  controllers: [FinancialSourceLinksController],
  providers: [
    FindFinancialSourceLinksService,
    CreateFinancialSourceLinksService,
    UpdateFinancialSourceLinksService,
    DeleteFinancialSourceLinksService,
  ],
  exports: [FindFinancialSourceLinksService],
})
export class FinancialSourceLinksModule {}

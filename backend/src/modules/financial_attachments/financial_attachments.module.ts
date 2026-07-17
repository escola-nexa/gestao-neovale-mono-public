import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialAttachments } from './entities/financial_attachments.entity';
import { FinancialAttachmentsController } from './controllers/financial_attachments.controller';
import { FindFinancialAttachmentsService } from './services/find-financial_attachments.service';
import { CreateFinancialAttachmentsService } from './services/create-financial_attachments.service';
import { UpdateFinancialAttachmentsService } from './services/update-financial_attachments.service';
import { DeleteFinancialAttachmentsService } from './services/delete-financial_attachments.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialAttachments])],
  controllers: [FinancialAttachmentsController],
  providers: [
    FindFinancialAttachmentsService,
    CreateFinancialAttachmentsService,
    UpdateFinancialAttachmentsService,
    DeleteFinancialAttachmentsService,
  ],
  exports: [FindFinancialAttachmentsService],
})
export class FinancialAttachmentsModule {}

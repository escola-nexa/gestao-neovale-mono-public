import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookletDeliveryAttachments } from './entities/booklet_delivery_attachments.entity';
import { BookletDeliveryAttachmentsController } from './controllers/booklet_delivery_attachments.controller';
import { FindBookletDeliveryAttachmentsService } from './services/find-booklet_delivery_attachments.service';
import { CreateBookletDeliveryAttachmentsService } from './services/create-booklet_delivery_attachments.service';
import { UpdateBookletDeliveryAttachmentsService } from './services/update-booklet_delivery_attachments.service';
import { DeleteBookletDeliveryAttachmentsService } from './services/delete-booklet_delivery_attachments.service';

@Module({
  imports: [TypeOrmModule.forFeature([BookletDeliveryAttachments])],
  controllers: [BookletDeliveryAttachmentsController],
  providers: [
    FindBookletDeliveryAttachmentsService,
    CreateBookletDeliveryAttachmentsService,
    UpdateBookletDeliveryAttachmentsService,
    DeleteBookletDeliveryAttachmentsService,
  ],
  exports: [FindBookletDeliveryAttachmentsService],
})
export class BookletDeliveryAttachmentsModule {}

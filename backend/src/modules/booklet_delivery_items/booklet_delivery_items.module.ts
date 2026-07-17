import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookletDeliveryItems } from './entities/booklet_delivery_items.entity';
import { BookletDeliveryItemsController } from './controllers/booklet_delivery_items.controller';
import { FindBookletDeliveryItemsService } from './services/find-booklet_delivery_items.service';
import { CreateBookletDeliveryItemsService } from './services/create-booklet_delivery_items.service';
import { UpdateBookletDeliveryItemsService } from './services/update-booklet_delivery_items.service';
import { DeleteBookletDeliveryItemsService } from './services/delete-booklet_delivery_items.service';

@Module({
  imports: [TypeOrmModule.forFeature([BookletDeliveryItems])],
  controllers: [BookletDeliveryItemsController],
  providers: [
    FindBookletDeliveryItemsService,
    CreateBookletDeliveryItemsService,
    UpdateBookletDeliveryItemsService,
    DeleteBookletDeliveryItemsService,
  ],
  exports: [FindBookletDeliveryItemsService],
})
export class BookletDeliveryItemsModule {}

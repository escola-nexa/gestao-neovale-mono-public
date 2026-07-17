import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookletDeliveries } from './entities/booklet_deliveries.entity';
import { BookletDeliveriesController } from './controllers/booklet_deliveries.controller';
import { FindBookletDeliveriesService } from './services/find-booklet_deliveries.service';
import { CreateBookletDeliveriesService } from './services/create-booklet_deliveries.service';
import { UpdateBookletDeliveriesService } from './services/update-booklet_deliveries.service';
import { DeleteBookletDeliveriesService } from './services/delete-booklet_deliveries.service';

@Module({
  imports: [TypeOrmModule.forFeature([BookletDeliveries])],
  controllers: [BookletDeliveriesController],
  providers: [
    FindBookletDeliveriesService,
    CreateBookletDeliveriesService,
    UpdateBookletDeliveriesService,
    DeleteBookletDeliveriesService,
  ],
  exports: [FindBookletDeliveriesService],
})
export class BookletDeliveriesModule {}

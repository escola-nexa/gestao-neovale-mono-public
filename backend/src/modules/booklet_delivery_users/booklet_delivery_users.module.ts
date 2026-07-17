import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookletDeliveryUsers } from './entities/booklet_delivery_users.entity';
import { BookletDeliveryUsersController } from './controllers/booklet_delivery_users.controller';
import { FindBookletDeliveryUsersService } from './services/find-booklet_delivery_users.service';
import { CreateBookletDeliveryUsersService } from './services/create-booklet_delivery_users.service';
import { UpdateBookletDeliveryUsersService } from './services/update-booklet_delivery_users.service';
import { DeleteBookletDeliveryUsersService } from './services/delete-booklet_delivery_users.service';

@Module({
  imports: [TypeOrmModule.forFeature([BookletDeliveryUsers])],
  controllers: [BookletDeliveryUsersController],
  providers: [
    FindBookletDeliveryUsersService,
    CreateBookletDeliveryUsersService,
    UpdateBookletDeliveryUsersService,
    DeleteBookletDeliveryUsersService,
  ],
  exports: [FindBookletDeliveryUsersService],
})
export class BookletDeliveryUsersModule {}

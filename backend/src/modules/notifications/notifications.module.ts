import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notifications } from './entities/notifications.entity';
import { NotificationsController } from './controllers/notifications.controller';
import { FindNotificationsService } from './services/find-notifications.service';
import { CreateNotificationsService } from './services/create-notifications.service';
import { UpdateNotificationsService } from './services/update-notifications.service';
import { DeleteNotificationsService } from './services/delete-notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notifications])],
  controllers: [NotificationsController],
  providers: [
    FindNotificationsService,
    CreateNotificationsService,
    UpdateNotificationsService,
    DeleteNotificationsService,
  ],
  exports: [FindNotificationsService],
})
export class NotificationsModule {}

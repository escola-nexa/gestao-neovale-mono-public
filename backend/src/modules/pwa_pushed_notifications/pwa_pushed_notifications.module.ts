import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PwaPushedNotifications } from './entities/pwa_pushed_notifications.entity';
import { PwaPushedNotificationsController } from './controllers/pwa_pushed_notifications.controller';
import { FindPwaPushedNotificationsService } from './services/find-pwa_pushed_notifications.service';
import { CreatePwaPushedNotificationsService } from './services/create-pwa_pushed_notifications.service';
import { UpdatePwaPushedNotificationsService } from './services/update-pwa_pushed_notifications.service';
import { DeletePwaPushedNotificationsService } from './services/delete-pwa_pushed_notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([PwaPushedNotifications])],
  controllers: [PwaPushedNotificationsController],
  providers: [
    FindPwaPushedNotificationsService,
    CreatePwaPushedNotificationsService,
    UpdatePwaPushedNotificationsService,
    DeletePwaPushedNotificationsService,
  ],
  exports: [FindPwaPushedNotificationsService],
})
export class PwaPushedNotificationsModule {}

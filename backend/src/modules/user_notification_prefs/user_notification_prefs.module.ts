import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserNotificationPrefs } from './entities/user_notification_prefs.entity';
import { UserNotificationPrefsController } from './controllers/user_notification_prefs.controller';
import { FindUserNotificationPrefsService } from './services/find-user_notification_prefs.service';
import { CreateUserNotificationPrefsService } from './services/create-user_notification_prefs.service';
import { UpdateUserNotificationPrefsService } from './services/update-user_notification_prefs.service';
import { DeleteUserNotificationPrefsService } from './services/delete-user_notification_prefs.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserNotificationPrefs])],
  controllers: [UserNotificationPrefsController],
  providers: [
    FindUserNotificationPrefsService,
    CreateUserNotificationPrefsService,
    UpdateUserNotificationPrefsService,
    DeleteUserNotificationPrefsService,
  ],
  exports: [FindUserNotificationPrefsService],
})
export class UserNotificationPrefsModule {}

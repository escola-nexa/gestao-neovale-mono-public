import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnesignalSettings } from './entities/onesignal_settings.entity';
import { OnesignalSettingsController } from './controllers/onesignal_settings.controller';
import { FindOnesignalSettingsService } from './services/find-onesignal_settings.service';
import { CreateOnesignalSettingsService } from './services/create-onesignal_settings.service';
import { UpdateOnesignalSettingsService } from './services/update-onesignal_settings.service';
import { DeleteOnesignalSettingsService } from './services/delete-onesignal_settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([OnesignalSettings])],
  controllers: [OnesignalSettingsController],
  providers: [
    FindOnesignalSettingsService,
    CreateOnesignalSettingsService,
    UpdateOnesignalSettingsService,
    DeleteOnesignalSettingsService,
  ],
  exports: [FindOnesignalSettingsService],
})
export class OnesignalSettingsModule {}

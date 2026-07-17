import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PwaSettings } from './entities/pwa_settings.entity';
import { PwaSettingsController } from './controllers/pwa_settings.controller';
import { FindPwaSettingsService } from './services/find-pwa_settings.service';
import { CreatePwaSettingsService } from './services/create-pwa_settings.service';
import { UpdatePwaSettingsService } from './services/update-pwa_settings.service';
import { DeletePwaSettingsService } from './services/delete-pwa_settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([PwaSettings])],
  controllers: [PwaSettingsController],
  providers: [
    FindPwaSettingsService,
    CreatePwaSettingsService,
    UpdatePwaSettingsService,
    DeletePwaSettingsService,
  ],
  exports: [FindPwaSettingsService],
})
export class PwaSettingsModule {}

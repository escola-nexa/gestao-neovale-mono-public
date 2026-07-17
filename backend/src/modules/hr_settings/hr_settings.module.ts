import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrSettings } from './entities/hr_settings.entity';
import { HrSettingsController } from './controllers/hr_settings.controller';
import { FindHrSettingsService } from './services/find-hr_settings.service';
import { CreateHrSettingsService } from './services/create-hr_settings.service';
import { UpdateHrSettingsService } from './services/update-hr_settings.service';
import { DeleteHrSettingsService } from './services/delete-hr_settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([HrSettings])],
  controllers: [HrSettingsController],
  providers: [
    FindHrSettingsService,
    CreateHrSettingsService,
    UpdateHrSettingsService,
    DeleteHrSettingsService,
  ],
  exports: [FindHrSettingsService],
})
export class HrSettingsModule {}

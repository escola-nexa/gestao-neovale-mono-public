import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandingSettings } from './entities/branding_settings.entity';
import { BrandingSettingsController } from './controllers/branding_settings.controller';
import { FindBrandingSettingsService } from './services/find-branding_settings.service';
import { CreateBrandingSettingsService } from './services/create-branding_settings.service';
import { UpdateBrandingSettingsService } from './services/update-branding_settings.service';
import { DeleteBrandingSettingsService } from './services/delete-branding_settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([BrandingSettings])],
  controllers: [BrandingSettingsController],
  providers: [
    FindBrandingSettingsService,
    CreateBrandingSettingsService,
    UpdateBrandingSettingsService,
    DeleteBrandingSettingsService,
  ],
  exports: [FindBrandingSettingsService],
})
export class BrandingSettingsModule {}

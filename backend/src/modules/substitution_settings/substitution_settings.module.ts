import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubstitutionSettings } from './entities/substitution_settings.entity';
import { SubstitutionSettingsController } from './controllers/substitution_settings.controller';
import { FindSubstitutionSettingsService } from './services/find-substitution_settings.service';
import { CreateSubstitutionSettingsService } from './services/create-substitution_settings.service';
import { UpdateSubstitutionSettingsService } from './services/update-substitution_settings.service';
import { DeleteSubstitutionSettingsService } from './services/delete-substitution_settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubstitutionSettings])],
  controllers: [SubstitutionSettingsController],
  providers: [
    FindSubstitutionSettingsService,
    CreateSubstitutionSettingsService,
    UpdateSubstitutionSettingsService,
    DeleteSubstitutionSettingsService,
  ],
  exports: [FindSubstitutionSettingsService],
})
export class SubstitutionSettingsModule {}

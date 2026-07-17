import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherSubstitutionSettings } from './entities/teacher_substitution_settings.entity';
import { TeacherSubstitutionSettingsController } from './controllers/teacher_substitution_settings.controller';
import { FindTeacherSubstitutionSettingsService } from './services/find-teacher_substitution_settings.service';
import { CreateTeacherSubstitutionSettingsService } from './services/create-teacher_substitution_settings.service';
import { UpdateTeacherSubstitutionSettingsService } from './services/update-teacher_substitution_settings.service';
import { DeleteTeacherSubstitutionSettingsService } from './services/delete-teacher_substitution_settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeacherSubstitutionSettings])],
  controllers: [TeacherSubstitutionSettingsController],
  providers: [
    FindTeacherSubstitutionSettingsService,
    CreateTeacherSubstitutionSettingsService,
    UpdateTeacherSubstitutionSettingsService,
    DeleteTeacherSubstitutionSettingsService,
  ],
  exports: [FindTeacherSubstitutionSettingsService],
})
export class TeacherSubstitutionSettingsModule {}

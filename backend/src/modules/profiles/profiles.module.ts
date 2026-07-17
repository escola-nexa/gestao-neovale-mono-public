import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profiles } from './entities/profiles.entity';
import { ProfilesController } from './controllers/profiles.controller';
import { FindProfilesService } from './services/find-profiles.service';
import { CreateProfilesService } from './services/create-profiles.service';
import { UpdateProfilesService } from './services/update-profiles.service';
import { DeleteProfilesService } from './services/delete-profiles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Profiles])],
  controllers: [ProfilesController],
  providers: [
    FindProfilesService,
    CreateProfilesService,
    UpdateProfilesService,
    DeleteProfilesService,
  ],
  exports: [FindProfilesService],
})
export class ProfilesModule {}

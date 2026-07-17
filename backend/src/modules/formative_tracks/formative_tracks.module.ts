import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormativeTracks } from './entities/formative_tracks.entity';
import { FormativeTracksController } from './controllers/formative_tracks.controller';
import { FindFormativeTracksService } from './services/find-formative_tracks.service';
import { CreateFormativeTracksService } from './services/create-formative_tracks.service';
import { UpdateFormativeTracksService } from './services/update-formative_tracks.service';
import { DeleteFormativeTracksService } from './services/delete-formative_tracks.service';

@Module({
  imports: [TypeOrmModule.forFeature([FormativeTracks])],
  controllers: [FormativeTracksController],
  providers: [
    FindFormativeTracksService,
    CreateFormativeTracksService,
    UpdateFormativeTracksService,
    DeleteFormativeTracksService,
  ],
  exports: [FindFormativeTracksService],
})
export class FormativeTracksModule {}

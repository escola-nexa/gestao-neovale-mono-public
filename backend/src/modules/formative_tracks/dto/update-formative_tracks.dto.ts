import { PartialType } from '@nestjs/mapped-types';
import { CreateFormativeTracksDto } from './create-formative_tracks.dto';

export class UpdateFormativeTracksDto extends PartialType(CreateFormativeTracksDto) {}

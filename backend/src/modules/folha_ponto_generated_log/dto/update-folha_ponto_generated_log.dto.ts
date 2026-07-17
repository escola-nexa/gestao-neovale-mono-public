import { PartialType } from '@nestjs/mapped-types';
import { CreateFolhaPontoGeneratedLogDto } from './create-folha_ponto_generated_log.dto';

export class UpdateFolhaPontoGeneratedLogDto extends PartialType(CreateFolhaPontoGeneratedLogDto) {}

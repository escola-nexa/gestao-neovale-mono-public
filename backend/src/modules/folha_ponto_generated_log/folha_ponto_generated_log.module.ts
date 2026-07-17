import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FolhaPontoGeneratedLog } from './entities/folha_ponto_generated_log.entity';
import { FolhaPontoGeneratedLogController } from './controllers/folha_ponto_generated_log.controller';
import { FindFolhaPontoGeneratedLogService } from './services/find-folha_ponto_generated_log.service';
import { CreateFolhaPontoGeneratedLogService } from './services/create-folha_ponto_generated_log.service';
import { UpdateFolhaPontoGeneratedLogService } from './services/update-folha_ponto_generated_log.service';
import { DeleteFolhaPontoGeneratedLogService } from './services/delete-folha_ponto_generated_log.service';

@Module({
  imports: [TypeOrmModule.forFeature([FolhaPontoGeneratedLog])],
  controllers: [FolhaPontoGeneratedLogController],
  providers: [
    FindFolhaPontoGeneratedLogService,
    CreateFolhaPontoGeneratedLogService,
    UpdateFolhaPontoGeneratedLogService,
    DeleteFolhaPontoGeneratedLogService,
  ],
  exports: [FindFolhaPontoGeneratedLogService],
})
export class FolhaPontoGeneratedLogModule {}

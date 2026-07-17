import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalAccessLogs } from './entities/external_access_logs.entity';
import { ExternalAccessLogsController } from './controllers/external_access_logs.controller';
import { FindExternalAccessLogsService } from './services/find-external_access_logs.service';
import { CreateExternalAccessLogsService } from './services/create-external_access_logs.service';
import { UpdateExternalAccessLogsService } from './services/update-external_access_logs.service';
import { DeleteExternalAccessLogsService } from './services/delete-external_access_logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalAccessLogs])],
  controllers: [ExternalAccessLogsController],
  providers: [
    FindExternalAccessLogsService,
    CreateExternalAccessLogsService,
    UpdateExternalAccessLogsService,
    DeleteExternalAccessLogsService,
  ],
  exports: [FindExternalAccessLogsService],
})
export class ExternalAccessLogsModule {}

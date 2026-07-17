import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnesignalSendLog } from './entities/onesignal_send_log.entity';
import { OnesignalSendLogController } from './controllers/onesignal_send_log.controller';
import { FindOnesignalSendLogService } from './services/find-onesignal_send_log.service';
import { CreateOnesignalSendLogService } from './services/create-onesignal_send_log.service';
import { UpdateOnesignalSendLogService } from './services/update-onesignal_send_log.service';
import { DeleteOnesignalSendLogService } from './services/delete-onesignal_send_log.service';

@Module({
  imports: [TypeOrmModule.forFeature([OnesignalSendLog])],
  controllers: [OnesignalSendLogController],
  providers: [
    FindOnesignalSendLogService,
    CreateOnesignalSendLogService,
    UpdateOnesignalSendLogService,
    DeleteOnesignalSendLogService,
  ],
  exports: [FindOnesignalSendLogService],
})
export class OnesignalSendLogModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookEvents } from './entities/webhook_events.entity';
import { WebhookEventsController } from './controllers/webhook_events.controller';
import { FindWebhookEventsService } from './services/find-webhook_events.service';
import { CreateWebhookEventsService } from './services/create-webhook_events.service';
import { UpdateWebhookEventsService } from './services/update-webhook_events.service';
import { DeleteWebhookEventsService } from './services/delete-webhook_events.service';

@Module({
  imports: [TypeOrmModule.forFeature([WebhookEvents])],
  controllers: [WebhookEventsController],
  providers: [
    FindWebhookEventsService,
    CreateWebhookEventsService,
    UpdateWebhookEventsService,
    DeleteWebhookEventsService,
  ],
  exports: [FindWebhookEventsService],
})
export class WebhookEventsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookDeliveries } from './entities/webhook_deliveries.entity';
import { WebhookDeliveriesController } from './controllers/webhook_deliveries.controller';
import { FindWebhookDeliveriesService } from './services/find-webhook_deliveries.service';
import { CreateWebhookDeliveriesService } from './services/create-webhook_deliveries.service';
import { UpdateWebhookDeliveriesService } from './services/update-webhook_deliveries.service';
import { DeleteWebhookDeliveriesService } from './services/delete-webhook_deliveries.service';

@Module({
  imports: [TypeOrmModule.forFeature([WebhookDeliveries])],
  controllers: [WebhookDeliveriesController],
  providers: [
    FindWebhookDeliveriesService,
    CreateWebhookDeliveriesService,
    UpdateWebhookDeliveriesService,
    DeleteWebhookDeliveriesService,
  ],
  exports: [FindWebhookDeliveriesService],
})
export class WebhookDeliveriesModule {}

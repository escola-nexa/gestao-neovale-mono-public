import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhooks } from './entities/webhooks.entity';
import { WebhooksController } from './controllers/webhooks.controller';
import { FindWebhooksService } from './services/find-webhooks.service';
import { CreateWebhooksService } from './services/create-webhooks.service';
import { UpdateWebhooksService } from './services/update-webhooks.service';
import { DeleteWebhooksService } from './services/delete-webhooks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Webhooks])],
  controllers: [WebhooksController],
  providers: [
    FindWebhooksService,
    CreateWebhooksService,
    UpdateWebhooksService,
    DeleteWebhooksService,
  ],
  exports: [FindWebhooksService],
})
export class WebhooksModule {}

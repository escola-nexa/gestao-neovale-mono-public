import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalLinks } from './entities/external_links.entity';
import { ExternalLinksController } from './controllers/external_links.controller';
import { FindExternalLinksService } from './services/find-external_links.service';
import { CreateExternalLinksService } from './services/create-external_links.service';
import { UpdateExternalLinksService } from './services/update-external_links.service';
import { DeleteExternalLinksService } from './services/delete-external_links.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalLinks])],
  controllers: [ExternalLinksController],
  providers: [
    FindExternalLinksService,
    CreateExternalLinksService,
    UpdateExternalLinksService,
    DeleteExternalLinksService,
  ],
  exports: [FindExternalLinksService],
})
export class ExternalLinksModule {}

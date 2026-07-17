import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuarterlyKeywords } from './entities/quarterly_keywords.entity';
import { QuarterlyKeywordsController } from './controllers/quarterly_keywords.controller';
import { FindQuarterlyKeywordsService } from './services/find-quarterly_keywords.service';
import { CreateQuarterlyKeywordsService } from './services/create-quarterly_keywords.service';
import { UpdateQuarterlyKeywordsService } from './services/update-quarterly_keywords.service';
import { DeleteQuarterlyKeywordsService } from './services/delete-quarterly_keywords.service';

@Module({
  imports: [TypeOrmModule.forFeature([QuarterlyKeywords])],
  controllers: [QuarterlyKeywordsController],
  providers: [
    FindQuarterlyKeywordsService,
    CreateQuarterlyKeywordsService,
    UpdateQuarterlyKeywordsService,
    DeleteQuarterlyKeywordsService,
  ],
  exports: [FindQuarterlyKeywordsService],
})
export class QuarterlyKeywordsModule {}

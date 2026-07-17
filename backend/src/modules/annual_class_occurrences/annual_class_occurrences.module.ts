import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnualClassOccurrences } from './entities/annual_class_occurrences.entity';
import { AnnualClassOccurrencesController } from './controllers/annual_class_occurrences.controller';
import { FindAnnualClassOccurrencesService } from './services/find-annual_class_occurrences.service';
import { CreateAnnualClassOccurrencesService } from './services/create-annual_class_occurrences.service';
import { UpdateAnnualClassOccurrencesService } from './services/update-annual_class_occurrences.service';
import { DeleteAnnualClassOccurrencesService } from './services/delete-annual_class_occurrences.service';

@Module({
  imports: [TypeOrmModule.forFeature([AnnualClassOccurrences])],
  controllers: [AnnualClassOccurrencesController],
  providers: [
    FindAnnualClassOccurrencesService,
    CreateAnnualClassOccurrencesService,
    UpdateAnnualClassOccurrencesService,
    DeleteAnnualClassOccurrencesService,
  ],
  exports: [FindAnnualClassOccurrencesService],
})
export class AnnualClassOccurrencesModule {}

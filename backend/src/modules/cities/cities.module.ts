import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cities } from './entities/cities.entity';
import { CitiesController } from './controllers/cities.controller';
import { FindCitiesService } from './services/find-cities.service';
import { CreateCitiesService } from './services/create-cities.service';
import { UpdateCitiesService } from './services/update-cities.service';
import { DeleteCitiesService } from './services/delete-cities.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cities])],
  controllers: [CitiesController],
  providers: [
    FindCitiesService,
    CreateCitiesService,
    UpdateCitiesService,
    DeleteCitiesService,
  ],
  exports: [FindCitiesService],
})
export class CitiesModule {}

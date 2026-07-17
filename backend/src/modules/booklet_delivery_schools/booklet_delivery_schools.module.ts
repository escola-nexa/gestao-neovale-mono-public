import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookletDeliverySchools } from './entities/booklet_delivery_schools.entity';
import { BookletDeliverySchoolsController } from './controllers/booklet_delivery_schools.controller';
import { FindBookletDeliverySchoolsService } from './services/find-booklet_delivery_schools.service';
import { CreateBookletDeliverySchoolsService } from './services/create-booklet_delivery_schools.service';
import { UpdateBookletDeliverySchoolsService } from './services/update-booklet_delivery_schools.service';
import { DeleteBookletDeliverySchoolsService } from './services/delete-booklet_delivery_schools.service';

@Module({
  imports: [TypeOrmModule.forFeature([BookletDeliverySchools])],
  controllers: [BookletDeliverySchoolsController],
  providers: [
    FindBookletDeliverySchoolsService,
    CreateBookletDeliverySchoolsService,
    UpdateBookletDeliverySchoolsService,
    DeleteBookletDeliverySchoolsService,
  ],
  exports: [FindBookletDeliverySchoolsService],
})
export class BookletDeliverySchoolsModule {}

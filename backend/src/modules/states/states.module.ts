import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { States } from './entities/states.entity';
import { StatesController } from './controllers/states.controller';
import { FindStatesService } from './services/find-states.service';
import { CreateStatesService } from './services/create-states.service';
import { UpdateStatesService } from './services/update-states.service';
import { DeleteStatesService } from './services/delete-states.service';

@Module({
  imports: [TypeOrmModule.forFeature([States])],
  controllers: [StatesController],
  providers: [
    FindStatesService,
    CreateStatesService,
    UpdateStatesService,
    DeleteStatesService,
  ],
  exports: [FindStatesService],
})
export class StatesModule {}

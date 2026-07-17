import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelpTutorials } from './entities/help_tutorials.entity';
import { HelpTutorialsController } from './controllers/help_tutorials.controller';
import { FindHelpTutorialsService } from './services/find-help_tutorials.service';
import { CreateHelpTutorialsService } from './services/create-help_tutorials.service';
import { UpdateHelpTutorialsService } from './services/update-help_tutorials.service';
import { DeleteHelpTutorialsService } from './services/delete-help_tutorials.service';

@Module({
  imports: [TypeOrmModule.forFeature([HelpTutorials])],
  controllers: [HelpTutorialsController],
  providers: [
    FindHelpTutorialsService,
    CreateHelpTutorialsService,
    UpdateHelpTutorialsService,
    DeleteHelpTutorialsService,
  ],
  exports: [FindHelpTutorialsService],
})
export class HelpTutorialsModule {}

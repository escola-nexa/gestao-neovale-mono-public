import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelpTutorialViews } from './entities/help_tutorial_views.entity';
import { HelpTutorialViewsController } from './controllers/help_tutorial_views.controller';
import { FindHelpTutorialViewsService } from './services/find-help_tutorial_views.service';
import { CreateHelpTutorialViewsService } from './services/create-help_tutorial_views.service';
import { UpdateHelpTutorialViewsService } from './services/update-help_tutorial_views.service';
import { DeleteHelpTutorialViewsService } from './services/delete-help_tutorial_views.service';

@Module({
  imports: [TypeOrmModule.forFeature([HelpTutorialViews])],
  controllers: [HelpTutorialViewsController],
  providers: [
    FindHelpTutorialViewsService,
    CreateHelpTutorialViewsService,
    UpdateHelpTutorialViewsService,
    DeleteHelpTutorialViewsService,
  ],
  exports: [FindHelpTutorialViewsService],
})
export class HelpTutorialViewsModule {}

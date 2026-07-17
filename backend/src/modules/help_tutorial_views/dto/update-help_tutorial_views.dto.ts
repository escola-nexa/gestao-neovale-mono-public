import { PartialType } from '@nestjs/mapped-types';
import { CreateHelpTutorialViewsDto } from './create-help_tutorial_views.dto';

export class UpdateHelpTutorialViewsDto extends PartialType(CreateHelpTutorialViewsDto) {}

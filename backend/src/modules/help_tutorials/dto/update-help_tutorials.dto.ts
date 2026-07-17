import { PartialType } from '@nestjs/mapped-types';
import { CreateHelpTutorialsDto } from './create-help_tutorials.dto';

export class UpdateHelpTutorialsDto extends PartialType(CreateHelpTutorialsDto) {}

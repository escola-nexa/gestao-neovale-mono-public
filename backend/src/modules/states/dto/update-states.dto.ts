import { PartialType } from '@nestjs/mapped-types';
import { CreateStatesDto } from './create-states.dto';

export class UpdateStatesDto extends PartialType(CreateStatesDto) {}

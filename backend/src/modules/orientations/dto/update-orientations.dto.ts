import { PartialType } from '@nestjs/mapped-types';
import { CreateOrientationsDto } from './create-orientations.dto';

export class UpdateOrientationsDto extends PartialType(CreateOrientationsDto) {}

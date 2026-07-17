import { PartialType } from '@nestjs/mapped-types';
import { CreateDigitalSignaturesDto } from './create-digital_signatures.dto';

export class UpdateDigitalSignaturesDto extends PartialType(CreateDigitalSignaturesDto) {}

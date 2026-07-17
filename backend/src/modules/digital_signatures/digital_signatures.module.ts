import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DigitalSignatures } from './entities/digital_signatures.entity';
import { DigitalSignaturesController } from './controllers/digital_signatures.controller';
import { FindDigitalSignaturesService } from './services/find-digital_signatures.service';
import { CreateDigitalSignaturesService } from './services/create-digital_signatures.service';
import { UpdateDigitalSignaturesService } from './services/update-digital_signatures.service';
import { DeleteDigitalSignaturesService } from './services/delete-digital_signatures.service';

@Module({
  imports: [TypeOrmModule.forFeature([DigitalSignatures])],
  controllers: [DigitalSignaturesController],
  providers: [
    FindDigitalSignaturesService,
    CreateDigitalSignaturesService,
    UpdateDigitalSignaturesService,
    DeleteDigitalSignaturesService,
  ],
  exports: [FindDigitalSignaturesService],
})
export class DigitalSignaturesModule {}

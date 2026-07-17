import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubstitutionPayments } from './entities/substitution_payments.entity';
import { SubstitutionPaymentsController } from './controllers/substitution_payments.controller';
import { FindSubstitutionPaymentsService } from './services/find-substitution_payments.service';
import { CreateSubstitutionPaymentsService } from './services/create-substitution_payments.service';
import { UpdateSubstitutionPaymentsService } from './services/update-substitution_payments.service';
import { DeleteSubstitutionPaymentsService } from './services/delete-substitution_payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubstitutionPayments])],
  controllers: [SubstitutionPaymentsController],
  providers: [
    FindSubstitutionPaymentsService,
    CreateSubstitutionPaymentsService,
    UpdateSubstitutionPaymentsService,
    DeleteSubstitutionPaymentsService,
  ],
  exports: [FindSubstitutionPaymentsService],
})
export class SubstitutionPaymentsModule {}

import { Module } from '@nestjs/common';
import { NotasController } from './controllers/notas.controller';
import { BoletinsController } from './controllers/boletins.controller';
import { EvaluationsService } from './services/evaluations.service';

@Module({
  controllers: [NotasController, BoletinsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}

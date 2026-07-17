import { Module } from '@nestjs/common';
import { FrequenciaController } from './controllers/frequencia.controller';
import { FrequenciaService } from './services/frequencia.service';

@Module({
  controllers: [FrequenciaController],
  providers: [FrequenciaService],
  exports: [FrequenciaService],
})
export class FrequenciaModule {}

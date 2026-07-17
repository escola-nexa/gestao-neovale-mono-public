import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { EvaluationsService } from '../services/evaluations.service';

@Controller('boletins')
@UseGuards(JwtAuthGuard)
export class BoletinsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get()
  async getBoletins(@Query() query: any, @CurrentUser() user: any) {
    // Parse bimesters string into an array of numbers
    const bimesters = query.bimesters ? query.bimesters.split(',').map(Number) : [];
    
    return this.evaluationsService.fetchBoletimData({
      organizationId: user.organizationId || user.id,
      ...query,
      bimesters,
    });
  }

  @Post('generate-pdf')
  async generatePdf(@Body() body: any) {
    return this.evaluationsService.generateServerPdf(body);
  }
}

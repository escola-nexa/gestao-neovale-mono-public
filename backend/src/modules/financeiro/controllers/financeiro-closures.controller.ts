import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { FinanceiroService } from '../services/financeiro.service';

@Controller('financeiro/closures')
@UseGuards(JwtAuthGuard)
export class FinanceiroClosuresController {
  constructor(private readonly finService: FinanceiroService) {}

  @Get()
  async getClosures(@Query() query: any) {
    return this.finService.getClosures(query);
  }

  @Post('close')
  async closePeriod(@Body() body: any) {
    return this.finService.closePeriod(body);
  }

  @Post('reopen')
  async reopenPeriod(@Body() body: any) {
    return this.finService.reopenPeriod(body);
  }

  @Get(':id/audit')
  async getAudit(@Param('id') id: string) {
    return this.finService.getClosureAudit(id);
  }
}

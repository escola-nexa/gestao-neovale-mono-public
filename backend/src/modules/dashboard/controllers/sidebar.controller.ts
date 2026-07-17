import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';

@Controller('sidebar')
@UseGuards(JwtAuthGuard)
export class SidebarController {
  @Get('badges')
  getBadges(@Query('userId') userId: string, @Query('organizationId') organizationId: string) {
    // Retorna vazio por enquanto, compatível com globalApi.ts que faz fallback para {}
    return {};
  }
}

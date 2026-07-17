import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateVisitRouteAiRecommendationsDto } from '../dto/create-visit_route_ai_recommendations.dto';
import { UpdateVisitRouteAiRecommendationsDto } from '../dto/update-visit_route_ai_recommendations.dto';
import { FindVisitRouteAiRecommendationsService } from '../services/find-visit_route_ai_recommendations.service';
import { CreateVisitRouteAiRecommendationsService } from '../services/create-visit_route_ai_recommendations.service';
import { UpdateVisitRouteAiRecommendationsService } from '../services/update-visit_route_ai_recommendations.service';
import { DeleteVisitRouteAiRecommendationsService } from '../services/delete-visit_route_ai_recommendations.service';

@Controller('visit-route-ai-recommendations')
@UseGuards(JwtAuthGuard)
export class VisitRouteAiRecommendationsController {
  constructor(
    private readonly findService: FindVisitRouteAiRecommendationsService,
    private readonly createService: CreateVisitRouteAiRecommendationsService,
    private readonly updateService: UpdateVisitRouteAiRecommendationsService,
    private readonly deleteService: DeleteVisitRouteAiRecommendationsService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateVisitRouteAiRecommendationsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVisitRouteAiRecommendationsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}

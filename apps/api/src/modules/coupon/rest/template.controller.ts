import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TemplateService } from '../services/template.service';
import { JwtAuthGuard } from '../../../core/guards/jwt.guard';
import { Public } from '../../auth/decorators/decorators';

@ApiTags('coupon-templates')
@Controller('coupon-templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取券模板列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Query() query: any) {
    const { page = 1, limit = 10, status, featuredOnHome, merchantId } = query;
    const where: any = {};

    if (status) where.status = status;
    if (featuredOnHome !== undefined) {
      where.featuredOnHome = featuredOnHome === 'true' || featuredOnHome === true;
    }

    // 如果传入 merchantId，使用专门的过滤方法
    if (merchantId) {
      const templates = await this.templateService.findByMerchantId(merchantId);
      return {
        success: true,
        data: templates,
      };
    }

    // 否则使用标准列表查询
    const result = await this.templateService.list({
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      where,
      orderBy: [
        { sortOrder: 'desc' }, // 优先按排序权重降序（数字越大越靠前）
        { createdAt: 'desc' }, // 其次按创建时间降序
      ],
    });

    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '获取券模板详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findOne(@Param('id') id: string) {
    return this.templateService.getDetailWithMerchants(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建券模板' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Body() body: any) {
    return this.templateService.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新券模板' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.templateService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除券模板' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string) {
    return this.templateService.remove(id);
  }
}
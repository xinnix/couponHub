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
import { MerchantService } from '../services/merchant.service';
import { JwtAuthGuard } from '../../../core/guards/jwt.guard';
import { Public } from '../../auth/decorators/decorators';

@ApiTags('merchants')
@Controller('merchants')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取商户列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Query() query: any) {
    const { page = 1, limit = 10, status, category, area } = query;
    const where: any = {};

    if (status) where.status = status;
    if (category) where.category = category;
    if (area) where.area = area;

    const result = await this.merchantService.list({
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      where,
      // 不指定 orderBy，使用 service 默认的 sortOrder 升序排序
    });

    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: '获取商户分类列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getCategories() {
    return this.merchantService.getCategories();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '获取商户详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findOne(@Param('id') id: string) {
    const merchant = await this.merchantService.getOne(id);
    return {
      success: true,
      data: merchant,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建商户' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Body() body: any) {
    return this.merchantService.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新商户' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.merchantService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除商户' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string) {
    return this.merchantService.remove(id);
  }
}
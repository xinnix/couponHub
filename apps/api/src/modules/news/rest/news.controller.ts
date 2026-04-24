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
import { NewsService } from '../services/news.service';
import { JwtAuthGuard } from '../../../core/guards/jwt.guard';
import { Public } from '../../auth/decorators/decorators';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取新闻列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findAll(@Query() query: any) {
    const { page = 1, limit = 10, status } = query;
    const where: any = {};

    if (status) where.status = status;

    return this.newsService.list({
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      where,
      orderBy: [
        { sortOrder: 'desc' },  // 首先按排序权重降序
        { createdAt: 'desc' }   // 其次按创建时间降序（同权重时新新闻在前）
      ],
    });
  }

  @Get('popup')
  @Public()
  @ApiOperation({ summary: '获取当前弹窗新闻' })
  @ApiResponse({
    status: 200,
    description: '返回当前设置为弹窗的新闻，如果没有则返回 null',
  })
  async getPopupNews() {
    return this.newsService.getPopupNews();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: '获取新闻详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async findOne(@Param('id') id: string) {
    return this.newsService.getNewsWithCoupons(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建新闻' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Body() body: any) {
    return this.newsService.createWithCoupons(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新新闻' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.newsService.updateWithCoupons(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除新闻' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
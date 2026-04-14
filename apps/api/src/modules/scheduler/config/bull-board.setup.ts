import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

/**
 * Bull Board 可视化面板配置
 *
 * 功能：
 * - 实时查看队列状态（等待、处理、完成、失败）
 * - 手动重试失败任务
 * - 查看任务详情和错误日志
 * - 监控队列性能指标
 *
 * 访问地址：http://localhost:3001/bull-board
 */
@Injectable()
export class BullBoardSetup implements OnModuleInit {
  private serverAdapter: ExpressAdapter;

  constructor(
    @InjectQueue('refund') private refundQueue: Queue,
  ) {
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath('/bull-board');
  }

  onModuleInit() {
    // 自动注册队列到 Bull Board
    createBullBoard({
      queues: [new BullAdapter(this.refundQueue)],
      serverAdapter: this.serverAdapter,
    });
  }

  /**
   * 获取配置好的服务器适配器
   */
  getServerAdapter(): ExpressAdapter {
    return this.serverAdapter;
  }

  /**
   * 获取 refund 队列实例
   */
  getRefundQueue(): Queue {
    return this.refundQueue;
  }
}
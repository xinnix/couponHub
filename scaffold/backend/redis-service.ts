/**
 * Redis Service - 缓存与分布式锁抽象层
 *
 * 核心功能：
 * - 分布式锁（Distributed Lock）：用于并发控制（库存扣减、订单创建）
 * - 原子操作（Atomic Operations）：Lua 脚本确保原子性
 * - 缓存管理（Cache Management）：键值存储、过期时间控制
 * - 库存扣减（Stock Decrement）：高并发场景下的安全扣减
 *
 * @example
 * ```typescript
 * // 配置环境变量
 * REDIS_HOST=localhost
 * REDIS_PORT=6379
 * REDIS_PASSWORD=your-password  // 可选
 *
 * // 在服务中使用分布式锁
 * import { RedisService } from '@scaffold/backend/redis-service';
 *
 * @Injectable()
 * export class OrderService {
 *   constructor(private redis: RedisService) {}
 *
 *   async createOrder(productId: string) {
 *     // 获取分布式锁（防止超卖）
 *     const lockValue = await this.redis.acquireLock(`product:${productId}`, 5000);
 *     if (!lockValue) {
 *       throw new Error('系统繁忙，请稍后重试');
 *     }
 *
 *     try {
 *       // 执行业务逻辑（库存扣减、订单创建）
 *       const order = await this.processOrder(productId);
 *       return order;
 *     } finally {
 *       // 释放锁（使用 Lua 脚本确保安全释放）
 *       await this.redis.releaseLock(`product:${productId}`, lockValue);
 *     }
 *   }
 *
 *   async getStock(productId: string) {
 *     // 从缓存获取库存
 *     return await this.redis.get<number>(`stock:${productId}`);
 *   }
 *
 *   async updateStock(productId: string, stock: number) {
 *     // 更新库存缓存（10秒过期）
 *     await this.redis.set(`stock:${productId}`, stock, 10000);
 *   }
 * }
 * ```
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: any;  // ioredis client
  private readonly host: string;
  private readonly port: number;
  private readonly password?: string;

  constructor(private configService: ConfigService) {
    // 从环境变量读取配置
    this.host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    this.port = this.configService.get<number>('REDIS_PORT') || 6379;
    this.password = this.configService.get<string>('REDIS_PASSWORD');
  }

  /**
   * 模块初始化：连接 Redis
   */
  async onModuleInit() {
    try {
      // 动态加载 ioredis（避免在未安装时报错）
      const Redis = require('ioredis');

      this.client = new Redis({
        host: this.host,
        port: this.port,
        password: this.password,
        retryStrategy: (times: number) => {
          // 重试策略：最多重试 3 次，每次间隔 1 秒
          if (times > 3) {
            this.logger.error('Redis 连接失败，已达到最大重试次数');
            return null;  // 停止重试
          }
          return 1000;  // 1秒后重试
        },
      });

      // 监听连接事件
      this.client.on('connect', () => {
        this.logger.log(`✅ Redis 已连接 (${this.host}:${this.port})`);
      });

      this.client.on('error', (error: any) => {
        this.logger.error('Redis 连接错误:', error);
      });

    } catch (error) {
      this.logger.error('❌ Redis 初始化失败，请检查是否安装 ioredis:', error);
    }
  }

  /**
   * 模块销毁：关闭 Redis 连接
   */
  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis 连接已关闭');
    }
  }

  // ============================================
  // 分布式锁（Distributed Lock）
  // ============================================

  /**
   * 获取分布式锁
   *
   * 使用 SETNX + PX 命令实现分布式锁，确保并发安全。
   * 支持自动重试机制。
   *
   * @param key - 锁的键（如 'product:123', 'order:456'）
   * @param ttl - 锁的过期时间（毫秒），防止死锁，默认 5000ms
   * @param retryTimes - 重试次数，默认 3 次
   * @param retryDelay - 重试间隔（毫秒），默认 100ms
   * @returns 锁的值（用于释放锁），如果获取失败返回 null
   *
   * @example
   * ```typescript
   * const lockValue = await redis.acquireLock('inventory:product-123', 5000);
   * if (!lockValue) {
   *   throw new Error('系统繁忙，请稍后重试');
   * }
   * try {
   *   // 执行需要加锁的业务逻辑
   * } finally {
   *   await redis.releaseLock('inventory:product-123', lockValue);
   * }
   * ```
   */
  async acquireLock(
    key: string,
    ttl: number = 5000,
    retryTimes: number = 3,
    retryDelay: number = 100,
  ): Promise<string | null> {
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}_${Math.random()}`;  // 唯一锁值

    for (let i = 0; i < retryTimes; i++) {
      try {
        // 使用 SET key value PX ttl NX（原子操作）
        // NX: Only set if not exists
        // PX: Expiration in milliseconds
        const result = await this.client.set(lockKey, lockValue, 'PX', ttl, 'NX');
        if (result === 'OK') {
          this.logger.debug(`✅ 获取锁成功: ${lockKey}`);
          return lockValue;
        } else {
          this.logger.debug(`⚠️  锁已被占用: ${lockKey} (重试 ${i + 1}/${retryTimes})`);
        }
      } catch (error) {
        this.logger.error(`❌ 获取锁异常 (重试 ${i + 1}/${retryTimes}): ${lockKey}`, error);
      }

      // 如果不是最后一次重试，等待后继续
      if (i < retryTimes - 1) {
        await this.sleep(retryDelay);
      }
    }

    this.logger.warn(`❌ 获取锁失败（已达最大重试次数）: ${lockKey}`);
    return null;
  }

  /**
   * 释放分布式锁
   *
   * 使用 Lua 脳本确保只有锁的持有者才能释放锁，防止误释放。
   *
   * Lua 脚本逻辑：
   * - 如果锁的值匹配，则删除锁（释放成功）
   * - 如果锁的值不匹配，则不删除（防止误释放其他进程的锁）
   *
   * @param key - 锁的键
   * @param value - 锁的值（必须与 acquireLock 返回的值一致）
   * @returns 是否成功释放
   *
   * @example
   * ```typescript
   * const lockValue = await redis.acquireLock('order:123');
   * // ... 业务逻辑 ...
   * await redis.releaseLock('order:123', lockValue);  // 安全释放
   * ```
   */
  async releaseLock(key: string, value: string): Promise<boolean> {
    const lockKey = `lock:${key}`;

    try {
      // Lua 脳本：确保只有锁的持有者才能释放
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.client.eval(script, 1, lockKey, value);

      if (result === 1) {
        this.logger.debug(`✅ 释放锁成功: ${lockKey}`);
        return true;
      } else {
        this.logger.warn(`⚠️  释放锁失败（锁已过期或被其他进程持有）: ${lockKey}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ 释放锁异常: ${lockKey}`, error);
      return false;
    }
  }

  /**
   * 使用分布式锁执行任务
   *
   * 这是一个便捷方法，自动处理锁的获取和释放。
   *
   * @param key - 锁的键
   * @param task - 要执行的任务函数
   * @param ttl - 锁的过期时间（毫秒）
   * @returns 任务执行结果，如果获取锁失败则抛出异常
   *
   * @example
   * ```typescript
   * const result = await redis.withLock('product:123', async () => {
   *   // 在锁的保护下执行业务逻辑
   *   await inventoryService.decrement(productId, 1);
   *   await orderService.create(productId, userId);
   *   return { orderId: '...' };
   * }, 5000);
   * ```
   */
  async withLock<T>(
    key: string,
    task: () => Promise<T>,
    ttl: number = 5000,
  ): Promise<T> {
    const lockValue = await this.acquireLock(key, ttl);
    if (!lockValue) {
      throw new Error('获取分布式锁失败，请稍后重试');
    }

    try {
      return await task();
    } finally {
      await this.releaseLock(key, lockValue);
    }
  }

  // ============================================
  // 原子库存扣减（Atomic Stock Decrement）
  // ============================================

  /**
   * 原子扣减库存
   *
   * 使用 Lua 脳本确保库存扣减的原子性和一致性：
   * - 检查库存是否足够
   * - 如果足够，扣减并返回剩余库存
   * - 如果不足，返回 -1 表示库存不足
   *
   * @param productId - 产品 ID
   * @param quantity - 扣减数量，默认 1
   * @returns 扣减后的库存数量，-1 表示库存不足
   *
   * @example
   * ```typescript
   * const remainingStock = await redis.decrStock('product-123', 1);
   * if (remainingStock === -1) {
   *   throw new Error('库存不足');
   * }
   * console.log(`剩余库存: ${remainingStock}`);
   * ```
   */
  async decrStock(productId: string, quantity: number = 1): Promise<number> {
    const stockKey = `stock:${productId}`;

    try {
      // Lua 脳本：原子检查并扣减
      const script = `
        local stock = redis.call("GET", KEYS[1])
        if not stock then
          return -1
        end
        stock = tonumber(stock)
        if stock < ARGV[1] then
          return -1
        end
        return redis.call("DECRBY", KEYS[1], ARGV[1])
      `;

      const result = await this.client.eval(script, 1, stockKey, quantity);
      this.logger.debug(`✅ 扣减库存成功: ${productId}, 数量: ${quantity}, 剩余: ${result}`);
      return result as number;
    } catch (error) {
      this.logger.error(`❌ 扣减库存失败: ${productId}`, error);
      return -1;
    }
  }

  /**
   * 设置库存（初始化库存缓存）
   *
   * @param productId - 产品 ID
   * @param stock - 库存数量
   *
   * @example
   * ```typescript
   * await redis.setStock('product-123', 100);
   * ```
   */
  async setStock(productId: string, stock: number): Promise<void> {
    const stockKey = `stock:${productId}`;
    await this.client.set(stockKey, stock);
    this.logger.debug(`✅ 设置库存: ${productId}, 数量: ${stock}`);
  }

  /**
   * 获取库存（从缓存读取）
   *
   * @param productId - 产品 ID
   * @returns 库存数量，如果不存在返回 null
   */
  async getStock(productId: string): Promise<number | null> {
    const stockKey = `stock:${productId}`;
    const stock = await this.client.get(stockKey);
    return stock ? parseInt(stock, 10) : null;
  }

  // ============================================
  // 缓存管理（Cache Management）
  // ============================================

  /**
   * 设置缓存
   *
   * @param key - 缓存键
   * @param value - 缓存值（会自动序列化为 JSON）
   * @param ttl - 过期时间（毫秒），可选
   *
   * @example
   * ```typescript
   * // 设置永久缓存
   * await redis.set('user:123', { name: 'John', email: 'john@example.com' });
   *
   * // 设置临时缓存（10秒过期）
   * await redis.set('session:abc', { userId: '123' }, 10000);
   * ```
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);

      if (ttl) {
        // 使用 PSETEX（毫秒级过期）
        await this.client.psetex(key, ttl, serialized);
      } else {
        // 永久存储
        await this.client.set(key, serialized);
      }

      this.logger.debug(`✅ 设置缓存: ${key} (TTL: ${ttl || '∞'}ms)`);
    } catch (error) {
      this.logger.error(`❌ 设置缓存失败: ${key}`, error);
    }
  }

  /**
   * 获取缓存
   *
   * @param key - 缓存键
   * @returns 缓存值（自动反序列化），如果不存在返回 null
   *
   * @example
   * ```typescript
   * const user = await redis.get<User>('user:123');
   * if (user) {
   *   console.log(user.name);  // 'John'
   * }
   * ```
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`❌ 获取缓存失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 删除缓存
   *
   * @param key - 缓存键
   *
   * @example
   * ```typescript
   * await redis.del('session:abc');
   * ```
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
      this.logger.debug(`✅ 删除缓存: ${key}`);
    } catch (error) {
      this.logger.error(`❌ 删除缓存失败: ${key}`, error);
    }
  }

  /**
   * 批量删除缓存（按模式匹配）
   *
   * @param pattern - 匹配模式（如 'user:*', 'session:*'）
   *
   * @example
   * ```typescript
   * // 删除所有用户缓存
   * await redis.delPattern('user:*');
   * ```
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
        this.logger.debug(`✅ 批量删除缓存: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      this.logger.error(`❌ 批量删除缓存失败: ${pattern}`, error);
    }
  }

  /**
   * 检查缓存是否存在
   *
   * @param key - 缓存键
   * @returns 是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`❌ 检查缓存存在失败: ${key}`, error);
      return false;
    }
  }

  // ============================================
  // 辅助方法
  // ============================================

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
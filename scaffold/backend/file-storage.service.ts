/**
 * File Storage Service - 策略模式的文件存储抽象层
 *
 * 支持多种存储后端：
 * - Local Storage: 本地文件系统（适合开发环境）
 * - Aliyun OSS: 阿里云对象存储（适合生产环境）
 * - AWS S3: 亚马逊 S3（适合国际化项目）
 * - Tencent COS: 腾讯云对象存储（可扩展）
 *
 * 核心功能：
 * - 文件上传与删除
 * - 签名 URL 生成（私有文件访问）
 * - 客户端直传凭证生成（减少服务器带宽）
 * - 文件类型验证
 *
 * @example
 * ```typescript
 * // 配置环境变量
 * FILE_STORAGE_PROVIDER=aliyun-oss
 * OSS_REGION=oss-cn-hangzhou
 * OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
 * OSS_ACCESS_KEY_ID=your-key-id
 * OSS_ACCESS_KEY_SECRET=your-key-secret
 * OSS_BUCKET=your-bucket-name
 *
 * // 在服务中使用
 * import { FileStorageService } from '@scaffold/backend/file-storage';
 *
 * @Injectable()
 * export class MediaService {
 *   constructor(private fileStorage: FileStorageService) {}
 *
 *   async uploadImage(file: UploadedFile) {
 *     // 验证文件类型
 *     if (!this.fileStorage.validateImageType(file.mimetype)) {
 *       throw new Error('仅支持图片文件');
 *     }
 *
 *     // 上传到 'images' 目录
 *     const result = await this.fileStorage.upload(file, 'images');
 *     return result.url;
 *   }
 *
 *   async getPrivateImageUrl(filePath: string) {
 *     // 获取签名 URL（1小时有效）
 *     return this.fileStorage.getSignedUrl(filePath, 3600);
 *   }
 *
 *   async getUploadCredentials(userId: string) {
 *     // 生成客户端直传凭证
 *     return this.fileStorage.getUploadCredentials(`users/${userId}`);
 *   }
 * }
 * ```
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as pathModule from 'path';

// ============================================
// 文件存储接口定义
// ============================================

/**
 * 上传文件接口（标准 multipart/form-data 文件对象）
 */
export interface UploadedFile {
  fieldname: string;       // 表单字段名
  originalname: string;    // 原始文件名
  encoding: string;        // 文件编码
  mimetype: string;        // MIME 类型
  size: number;            // 文件大小（字节）
  buffer: Buffer;          // 文件内容 Buffer
}

/**
 * 上传结果
 */
export interface UploadResult {
  url: string;             // 文件访问 URL
  fileName: string;        // 原始文件名
  fileSize: number;        // 文件大小
  mimeType: string;        // MIME 类型
  path?: string;           // 文件存储路径（可选）
}

/**
 * 客户端直传凭证（用于减少服务器带宽）
 */
export interface UploadCredentials {
  accessKeyId: string;
  accessKeySecret?: string;
  securityToken?: string;
  expiration: string;      // 过期时间
  bucket: string;          // 存储桶名称
  region: string;          // 区域
  endpoint: string;        // 服务端点
  policy?: string;         // 上传策略（OSS）
  signature?: string;      // 签名
  [key: string]: any;      // 其他凭证字段
}

/**
 * 文件存储策略接口
 */
export interface IFileStorage {
  /** 上传文件 */
  upload(file: UploadedFile, dirPath: string): Promise<UploadResult>;
  /** 删除文件 */
  delete(filePath: string): Promise<void>;
  /** 获取签名 URL（私有文件访问） */
  getSignedUrl(filePath: string, expiresIn?: number): Promise<string>;
  /** 获取客户端直传凭证 */
  getUploadCredentials(dirPath: string): Promise<UploadCredentials>;
}

// ============================================
// 文件存储服务（策略模式）
// ============================================

@Injectable()
export class FileStorageService implements IFileStorage {
  private readonly logger = new Logger(FileStorageService.name);
  private strategy: IFileStorage;
  private uploadPath: string;

  constructor(private config: ConfigService) {
    // 从环境变量读取配置
    const provider = config.get<string>('FILE_STORAGE_PROVIDER', 'local');
    this.uploadPath = config.get<string>('UPLOAD_PATH', './uploads') || './uploads';

    // 根据配置选择存储策略
    switch (provider) {
      case 'aliyun-oss':
        this.logger.log('✅ Using Aliyun OSS storage provider');
        this.strategy = new AliyunOssStrategy(config);
        break;
      case 'aws-s3':
        this.logger.log('✅ Using AWS S3 storage provider');
        this.strategy = new AwsS3Strategy(config);
        break;
      case 'local':
        this.logger.log(`✅ Using local storage provider: ${this.uploadPath}`);
        this.strategy = new LocalStorageStrategy(this.uploadPath, config);
        break;
      default:
        this.logger.warn(`⚠️  Unknown provider '${provider}', falling back to local storage`);
        this.strategy = new LocalStorageStrategy(this.uploadPath, config);
    }
  }

  /**
   * 上传文件
   *
   * @param file - 上传的文件对象
   * @param dirPath - 存储目录路径（如 'images', 'videos/user-123'）
   * @returns 上传结果（包含 URL）
   */
  async upload(file: UploadedFile, dirPath: string): Promise<UploadResult> {
    return this.strategy.upload(file, dirPath);
  }

  /**
   * 删除文件
   *
   * @param filePath - 文件路径或 URL
   */
  async delete(filePath: string): Promise<void> {
    return this.strategy.delete(filePath);
  }

  /**
   * 获取签名 URL（用于私有文件访问）
   *
   * @param filePath - 文件路径或 URL
   * @param expiresIn - 过期时间（秒），默认 3600（1小时）
   * @returns 签名后的访问 URL
   */
  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
    return this.strategy.getSignedUrl(filePath, expiresIn);
  }

  /**
   * 获取上传凭证（用于客户端直传）
   *
   * 使用客户端直传可以减少服务器带宽消耗，提高上传速度。
   *
   * @param dirPath - 上传目录路径
   * @returns 上传凭证（包含 policy、signature 等）
   */
  async getUploadCredentials(dirPath: string): Promise<UploadCredentials> {
    return this.strategy.getUploadCredentials(dirPath);
  }

  /**
   * 获取预览 URL（用于前端显示）
   *
   * 对于私有文件，自动生成签名 URL。
   * 对于公开文件，直接返回原始 URL。
   *
   * @param filePath - 文件路径或 URL
   * @param expiresIn - 过期时间（秒），默认 3600
   * @returns 可访问的 URL
   */
  async getPreviewUrl(filePath: string, expiresIn = 3600): Promise<string> {
    try {
      return await this.strategy.getSignedUrl(filePath, expiresIn);
    } catch (error) {
      this.logger.warn(`获取预览 URL 失败: ${filePath}`, error);
      return filePath;  // 失败时返回原始 URL
    }
  }

  /**
   * 验证图片类型
   *
   * @param mimeType - MIME 类型
   * @returns 是否为允许的图片类型
   */
  validateImageType(mimeType: string): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    return allowedTypes.includes(mimeType);
  }

  /**
   * 验证视频类型
   *
   * @param mimeType - MIME 类型
   * @returns 是否为允许的视频类型
   */
  validateVideoType(mimeType: string): boolean {
    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
    return allowedTypes.includes(mimeType);
  }

  /**
   * 验证文档类型
   *
   * @param mimeType - MIME 类型
   * @returns 是否为允许的文档类型
   */
  validateDocumentType(mimeType: string): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    return allowedTypes.includes(mimeType);
  }
}

// ============================================
// 本地存储策略
// ============================================

class LocalStorageStrategy implements IFileStorage {
  constructor(
    private basePath: string,
    private config?: ConfigService,
  ) {}

  async upload(file: UploadedFile, dirPath: string): Promise<UploadResult> {
    const fullPath = pathModule.join(this.basePath, dirPath);

    // 确保目录存在
    await fs.mkdir(fullPath, { recursive: true });

    // 生成唯一文件名（时间戳 + 随机字符串）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = pathModule.extname(file.originalname);
    const fileName = `${timestamp}-${randomStr}${ext}`;
    const filePath = pathModule.join(fullPath, fileName);

    // 写入文件
    await fs.writeFile(filePath, file.buffer);

    // 生成访问 URL（从环境变量获取服务器地址）
    const serverUrl = this.config?.get<string>('SERVER_URL', 'http://localhost:3000');
    const url = `${serverUrl}/${dirPath}/${fileName}`;

    return {
      url,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      path: filePath,
    };
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = pathModule.join(this.basePath, filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      console.warn(`删除文件失败: ${filePath}`, error);
    }
  }

  async getSignedUrl(filePath: string): Promise<string> {
    // 本地文件直接返回路径
    return `/${filePath}`;
  }

  async getUploadCredentials(dirPath: string): Promise<UploadCredentials> {
    // 本地存储不支持客户端直传
    throw new Error('本地存储不支持客户端直传，请使用服务器端上传');
  }
}

// ============================================
// 阿里云 OSS 存储策略
// ============================================

class AliyunOssStrategy implements IFileStorage {
  private client: any;
  private bucket: string;

  constructor(config: ConfigService) {
    // 读取 OSS 配置
    const region = config.get<string>('OSS_REGION', 'oss-cn-hangzhou');
    const endpoint = config.get<string>('OSS_ENDPOINT');
    const accessKeyId = config.get<string>('OSS_ACCESS_KEY_ID');
    const accessKeySecret = config.get<string>('OSS_ACCESS_KEY_SECRET');
    const bucket = config.get<string>('OSS_BUCKET');

    // 验证必需配置
    if (!endpoint || !accessKeyId || !accessKeySecret || !bucket) {
      const missing = [];
      if (!endpoint) missing.push('OSS_ENDPOINT');
      if (!accessKeyId) missing.push('OSS_ACCESS_KEY_ID');
      if (!accessKeySecret) missing.push('OSS_ACCESS_KEY_SECRET');
      if (!bucket) missing.push('OSS_BUCKET');
      throw new Error(`❌ OSS 配置不完整，缺少环境变量: ${missing.join(', ')}`);
    }

    // 动态加载 ali-oss（避免在本地环境强制依赖）
    const OSS = require('ali-oss');

    // 创建 OSS 客户端
    this.client = new OSS({
      region,
      endpoint,
      accessKeyId,
      accessKeySecret,
      bucket,
    });

    this.bucket = bucket;
  }

  async upload(file: UploadedFile, dirPath: string): Promise<UploadResult> {
    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = pathModule.extname(file.originalname);
    const fileName = `${timestamp}-${randomStr}${ext}`;
    const objectName = pathModule.posix.join(dirPath, fileName);

    // 上传到 OSS
    await this.client.put(objectName, file.buffer, {
      headers: {
        'Content-Type': file.mimetype,
      },
    });

    // 返回 OSS URL
    const url = `https://${this.bucket}.${this.client.options.region}.aliyuncs.com/${objectName}`;

    return {
      url,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };
  }

  async delete(filePath: string): Promise<void> {
    try {
      // 提取对象名（去掉 URL 前缀）
      let objectName = filePath;
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        const url = new URL(filePath);
        objectName = url.pathname.substring(1);
      }
      await this.client.delete(objectName);
    } catch (error) {
      console.warn(`删除 OSS 文件失败: ${filePath}`, error);
    }
  }

  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
    try {
      // 提取对象名
      let objectName = filePath;
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        const url = new URL(filePath);
        objectName = url.pathname.substring(1);
      }

      // 生成签名 URL
      const url = await this.client.signatureUrl(objectName, { expires: expiresIn });
      return url;
    } catch (error) {
      console.error('获取 OSS 签名 URL 失败:', error);
      return filePath;  // 失败时返回原始 URL
    }
  }

  async getUploadCredentials(dirPath: string): Promise<UploadCredentials> {
    try {
      const timestamp = Date.now();
      const expiration = new Date(timestamp + 3600 * 1000).toISOString(); // 1小时有效期

      const accessKeyId = (this.client as any).options.accessKeyId;
      const accessKeySecret = (this.client as any).options.accessKeySecret;

      // 构建 Post Policy（限制上传路径和文件大小）
      const policy = {
        expiration,
        conditions: [
          ['starts-with', '$key', `${dirPath}/`],  // 限制上传路径
          ['content-length-range', 0, 10485760],    // 限制文件大小（10MB）
        ],
      };

      // Policy 转 base64
      const policyBase64 = Buffer.from(JSON.stringify(policy)).toString('base64');

      // HMAC-SHA1 签名
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha1', accessKeySecret)
        .update(policyBase64)
        .digest('base64');

      return {
        accessKeyId,
        expiration,
        bucket: this.bucket,
        region: this.client.options.region,
        endpoint: `https://${this.bucket}.${this.client.options.region}.aliyuncs.com`,
        policy: policyBase64,
        signature,
      };
    } catch (error) {
      console.error('生成上传凭证失败:', error);
      throw new Error('生成上传凭证失败');
    }
  }
}

// ============================================
// AWS S3 存储策略（可扩展）
// ============================================

class AwsS3Strategy implements IFileStorage {
  private s3Client: any;
  private bucket: string;

  constructor(config: ConfigService) {
    // TODO: 实现 AWS S3 客户端初始化
    // 需要：AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET
    throw new Error('AWS S3 存储策略尚未实现，请使用 aliyun-oss 或 local');
  }

  async upload(file: UploadedFile, dirPath: string): Promise<UploadResult> {
    // TODO: 实现 AWS S3 上传
    throw new Error('AWS S3 上传未实现');
  }

  async delete(filePath: string): Promise<void> {
    // TODO: 实现 AWS S3 删除
    throw new Error('AWS S3 删除未实现');
  }

  async getSignedUrl(filePath: string, expiresIn?: number): Promise<string> {
    // TODO: 实现 AWS S3 签名 URL
    throw new Error('AWS S3 签名 URL 未实现');
  }

  async getUploadCredentials(dirPath: string): Promise<UploadCredentials> {
    // TODO: 实现 AWS S3 客户端直传凭证
    throw new Error('AWS S3 客户端直传未实现');
  }
}
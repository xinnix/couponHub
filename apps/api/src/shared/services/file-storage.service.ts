import { Injectable, Logger, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as pathModule from 'path';
const OSS = require('ali-oss');

// ============================================
// 文件存储接口
// ============================================

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  path?: string;
}

export interface UploadCredentials {
  accessKeyId: string;
  accessKeySecret: string;
  securityToken: string;
  expiration: string;
  bucket: string;
  region: string;
  endpoint: string;
  policy: string;
  signature: string;
  xOssSignatureVersion: string;
  xOssCredential: string;
}

export interface IFileStorage {
  upload(file: UploadedFile, dirPath: string): Promise<UploadResult>;
  delete(filePath: string): Promise<void>;
  getSignedUrl(filePath: string, expiresIn?: number): Promise<string>;
  getUploadCredentials(dirPath: string): Promise<UploadCredentials>;
}

// ============================================
// 文件存储服务
// ============================================

@Injectable({ scope: Scope.TRANSIENT })
export class FileStorageService implements IFileStorage {
  private readonly logger = new Logger(FileStorageService.name);
  private strategy: IFileStorage;
  private uploadPath: string;

  constructor(private config: ConfigService) {
    const provider = config.get<string>('FILE_STORAGE_PROVIDER', 'local');
    this.uploadPath = config.get<string>('UPLOAD_PATH', './uploads') || './uploads';

    // 根据配置选择存储策略
    switch (provider) {
      case 'aliyun-oss':
        this.logger.log('Using aliyun-oss storage provider');
        this.strategy = new AliyunOssStrategy(config);
        break;
      default:
        this.logger.log(`Using local storage provider: ${provider}`);
        this.strategy = new LocalStorageStrategy(this.uploadPath, config);
    }
  }

  async upload(file: UploadedFile, dirPath: string): Promise<UploadResult> {
    return this.strategy.upload(file, dirPath);
  }

  async delete(filePath: string): Promise<void> {
    return this.strategy.delete(filePath);
  }

  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
    return this.strategy.getSignedUrl(filePath, expiresIn);
  }

  /**
   * 获取上传凭证（用于客户端直传）
   */
  async getUploadCredentials(dirPath: string): Promise<UploadCredentials> {
    return this.strategy.getUploadCredentials(dirPath);
  }

  /**
   * 获取预览 URL（用于私有文件的签名 URL）
   */
  async getPreviewUrl(filePath: string, expiresIn = 3600): Promise<string> {
    try {
      return await this.strategy.getSignedUrl(filePath, expiresIn);
    } catch (error) {
      console.error('获取预览 URL 失败:', error);
      return filePath;
    }
  }

  /**
   * 验证文件类型
   */
  validateImageType(mimeType: string): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(mimeType);
  }

  validateVideoType(mimeType: string): boolean {
    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime'];
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

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = pathModule.extname(file.originalname);
    const fileName = `${timestamp}-${randomStr}${ext}`;
    const filePath = pathModule.join(fullPath, fileName);

    // 写入文件
    await fs.writeFile(filePath, file.buffer);

    // 返回完整的 URL（包含服务器地址）
    // 从环境变量或默认值获取服务器地址
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
    throw new Error('本地存储不支持客户端直传');
  }
}

// ============================================
// 阿里云 OSS 存储策略
// ============================================

class AliyunOssStrategy implements IFileStorage {
  private client: any;
  private bucket: string;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>('OSS_ENDPOINT');
    const accessKeyId = config.get<string>('OSS_ACCESS_KEY_ID');
    const accessKeySecret = config.get<string>('OSS_ACCESS_KEY_SECRET');
    const bucket = config.get<string>('OSS_BUCKET');
    const region = config.get<string>('OSS_REGION', 'oss-cn-hangzhou');

    if (!endpoint || !accessKeyId || !accessKeySecret || !bucket) {
      const missing = [];
      if (!endpoint) missing.push('OSS_ENDPOINT');
      if (!accessKeyId) missing.push('OSS_ACCESS_KEY_ID');
      if (!accessKeySecret) missing.push('OSS_ACCESS_KEY_SECRET');
      if (!bucket) missing.push('OSS_BUCKET');
      throw new Error(`OSS 配置不完整，缺少环境变量: ${missing.join(', ')}`);
    }

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
      await this.client.delete(filePath);
    } catch (error) {
      console.warn(`删除 OSS 文件失败: ${filePath}`, error);
    }
  }

  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
    try {
      // 如果 filePath 是完整 URL，提取对象名
      let objectName = filePath;
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        const url = new URL(filePath);
        objectName = url.pathname.substring(1); // 去掉开头的 /
      }

      const url = await this.client.signatureUrl(objectName, { expires: expiresIn });
      return url;
    } catch (error) {
      console.error('获取 OSS 签名 URL 失败:', error);
      // 如果获取签名失败，返回原始 URL
      return filePath;
    }
  }

  async getUploadCredentials(dirPath: string): Promise<UploadCredentials> {
    try {
      const timestamp = Date.now();
      const expiration = new Date(timestamp + 3600 * 1000).toISOString();

      // 生成临时访问凭证
      const accessKeyId = (this.client as any).options.accessKeyId;
      const accessKeySecret = (this.client as any).options.accessKeySecret;
      const securityToken = `temp-token-${timestamp}`;

      // 获取当前日期（UTC格式，用于credential）
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

      // 提取region (如 oss-cn-hangzhou -> cn-hangzhou)
      const region = this.client.options.region.replace('oss-', '');

      // 构建 policy（简化条件，避免V4签名复杂度）
      const policy = {
        expiration,
        conditions: [
          { bucket: this.bucket },
          ['starts-with', '$key', `${dirPath}/`],
        ],
      };

      // 将policy转为base64
      const policyBase64 = Buffer.from(JSON.stringify(policy)).toString('base64');

      // 使用 OSS V1 签名（更简单且兼容性更好）
      // 签名 = base64(hmac-sha1(accessKeySecret, policyBase64))
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha1', accessKeySecret)
        .update(policyBase64)
        .digest('base64');

      return {
        accessKeyId,
        accessKeySecret,
        securityToken,
        expiration,
        bucket: this.bucket,
        region: this.client.options.region,
        endpoint: `https://${this.bucket}.${this.client.options.region}.aliyuncs.com`,
        policy: policyBase64,
        signature,
        xOssSignatureVersion: 'OSS4-HMAC-SHA256',
        xOssCredential: `${accessKeyId}/${dateStr}/${region}/oss/aliyun_v4_request`,
      };
    } catch (error) {
      console.error('获取上传凭证失败:', error);
      throw new Error('获取上传凭证失败');
    }
  }
}

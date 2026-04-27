/**
 * OSS Uploader Utilities - OSS 直传上传工具类
 *
 * 使用阿里云 OSS Post Policy 签名方式实现前端直传：
 * - 从后端获取上传凭证（policy + signature）
 * - 直接上传文件到 OSS（不经过服务器）
 * - 减少服务器带宽消耗，提高上传速度
 *
 * 配合后端 File Storage Service 使用：
 * - 后端：FileStorageService.getUploadCredentials(dirPath)
 * - 前端：OSSUploader.upload(file, type)
 *
 * @example
 * ```typescript
 * import { OSSUploader } from '@scaffold/frontend/oss-uploader-utils';
 *
 * // 单文件上传
 * const result = await OSSUploader.upload(file, 'merchant_logo');
 * console.log(result.url);  // https://bucket.oss.aliyuncs.com/images/merchant_logo/xxx.jpg
 *
 * // 批量上传
 * const results = await OSSUploader.uploadMultiple(files, 'news_gallery');
 *
 * // 文件验证
 * if (!OSSUploader.validateFileType(file, ['image/jpeg', 'image/png'])) {
 *   throw new Error('仅支持 JPG、PNG 格式');
 * }
 * ```
 */

import { trpcClient } from './data-provider';

/**
 * 上传凭证（从后端获取）
 */
export interface UploadCredentials {
  accessKeyId: string;
  accessKeySecret?: string;
  securityToken?: string;
  expiration: string;      // 过期时间
  bucket: string;          // 存储桶名称
  region: string;          // 区域
  endpoint: string;        // OSS 服务端点
  policy?: string;         // Post Policy（base64）
  signature?: string;      // 签名
  [key: string]: any;      // 其他字段
}

/**
 * 上传结果
 */
export interface UploadResult {
  url: string;             // 文件访问 URL
  fileName: string;        // 原始文件名
  fileSize: number;        // 文件大小（字节）
}

/**
 * 上传类型（用于确定存储路径）
 *
 * 可根据项目需求扩展，例如：
 * - merchant_logo: 商户 Logo（单图）
 * - merchant_gallery: 商户画廊（多图）
 * - news_banner: 新闻头图
 * - news_content: 新闻内容图片
 * - avatar: 用户头像
 */
export type UploadType =
  | 'merchant_logo'
  | 'merchant_gallery'
  | 'news_banner'
  | 'news_content'
  | 'avatar'
  | 'product_image'
  | 'category_icon';

/**
 * OSS 直传上传工具类
 */
export class OSSUploader {
  /**
   * 上传文件到 OSS
   *
   * 流程：
   * 1. 从后端获取上传凭证（policy + signature）
   * 2. 构建 FormData（包含 policy、signature、file）
   * 3. POST 到 OSS endpoint
   * 4. 返回文件 URL
   *
   * @param file - 要上传的文件
   * @param type - 上传类型（用于确定存储路径）
   * @returns 上传结果（包含 URL）
   *
   * @example
   * ```typescript
   * const result = await OSSUploader.upload(file, 'merchant_logo');
   * console.log(result.url);
   * ```
   */
  static async upload(file: File, type: UploadType): Promise<UploadResult> {
    // 1. 从后端获取上传凭证（调用 tRPC）
    const credentials = await trpcClient.upload.getUploadCredentials.query({ type });

    // 2. 生成唯一文件名（时间戳 + 随机字符串）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const fileName = `${timestamp}-${randomStr}${ext}`;

    // 构建存储路径（如 images/merchant_logo/xxx.jpg）
    const key = `images/${type}/${fileName}`;

    // 3. 构建 FormData（OSS Post Policy 格式）
    const formData = new FormData();
    formData.append('key', key);                              // 文件存储路径
    formData.append('policy', credentials.policy || '');      // 上传策略
    formData.append('OSSAccessKeyId', credentials.accessKeyId); // AccessKey ID
    formData.append('signature', credentials.signature || ''); // 签名
    formData.append('success_action_status', '200');          // 返回 200 状态码

    // 如果使用 STS Token（临时凭证），添加 security token
    if (credentials.securityToken) {
      formData.append('x-oss-security-token', credentials.securityToken);
    }

    // 文件本身
    formData.append('file', file);

    // 4. POST 到 OSS endpoint
    const response = await fetch(credentials.endpoint, {
      method: 'POST',
      body: formData,
    });

    // 验证响应
    if (!response.ok) {
      throw new Error(`上传失败: ${response.status} ${response.statusText}`);
    }

    // 5. 构建文件 URL
    const url = `${credentials.endpoint}/${key}`;

    return {
      url,
      fileName: file.name,
      fileSize: file.size,
    };
  }

  /**
   * 批量上传文件
   *
   * @param files - 文件列表
   * @param type - 上传类型
   * @returns 上传结果列表
   *
   * @example
   * ```typescript
   * const results = await OSSUploader.uploadMultiple([file1, file2], 'news_gallery');
   * console.log(results.map(r => r.url));
   * ```
   */
  static async uploadMultiple(files: File[], type: UploadType): Promise<UploadResult[]> {
    return Promise.all(files.map(file => this.upload(file, type)));
  }

  /**
   * 验证文件类型
   *
   * @param file - 文件对象
   * @param allowedTypes - 允许的 MIME 类型列表
   * @returns 是否合法
   *
   * @example
   * ```typescript
   * if (!OSSUploader.validateFileType(file, ['image/jpeg', 'image/png'])) {
   *   throw new Error('仅支持 JPG、PNG 格式');
   * }
   * ```
   */
  static validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  }

  /**
   * 验证文件大小
   *
   * @param file - 文件对象
   * @param maxSize - 最大大小（字节）
   * @returns 是否合法
   *
   * @example
   * ```typescript
   * if (!OSSUploader.validateFileSize(file, 10 * 1024 * 1024)) {
   *   throw new Error('文件大小不能超过 10MB');
   * }
   * ```
   */
  static validateFileSize(file: File, maxSize: number): boolean {
    return file.size <= maxSize;
  }

  /**
   * 验证文件类型和大小（便捷方法）
   *
   * @param file - 文件对象
   * @param options - 验证选项
   * @returns 是否合法
   *
   * @example
   * ```typescript
   * const isValid = OSSUploader.validateFile(file, {
   *   allowedTypes: ['image/jpeg', 'image/png'],
   *   maxSize: 5 * 1024 * 1024,
   * });
   * ```
   */
  static validateFile(
    file: File,
    options: {
      allowedTypes?: string[];
      maxSize?: number;
    },
  ): boolean {
    const { allowedTypes, maxSize } = options;

    if (allowedTypes && !this.validateFileType(file, allowedTypes)) {
      return false;
    }

    if (maxSize && !this.validateFileSize(file, maxSize)) {
      return false;
    }

    return true;
  }
}
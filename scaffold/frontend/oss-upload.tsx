/**
 * OSS Upload Component - 前端直传文件上传组件
 *
 * 配合后端 File Storage Service 使用，实现客户端直传 OSS：
 * - 减少服务器带宽消耗
 * - 提高上传速度（直传云存储）
 * - 支持文件类型和大小验证
 * - 支持预览和删除
 *
 * @example
 * ```tsx
 * import { OSSUpload } from '@scaffold/frontend/oss-upload';
 *
 * // 在表单中使用
 * <Form.Item label="商户Logo" name="logoUrl">
 *   <OSSUpload type="merchant_logo" accept="image/jpeg,image/png" />
 * </Form.Item>
 *
 * // 自定义配置
 * <OSSUpload
 *   type="news_banner"
 *   maxFileSize={10 * 1024 * 1024}  // 10MB
 *   accept="image/jpeg,image/png,image/webp"
 *   showPreview={true}
 * />
 * ```
 */

import React, { useState } from 'react';
import { Upload, Button, App, Image } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { OSSUploader } from './oss-uploader-utils';
import type { UploadType } from './oss-uploader-utils';

/**
 * OSS Upload 组件 Props
 */
export interface OSSUploadProps {
  /** 当前上传的文件 URL */
  value?: string;
  /** 文件 URL 变化回调 */
  onChange?: (url: string) => void;
  /** 上传类型（用于确定存储路径） */
  type: UploadType;
  /** 最大文件大小（字节），默认 5MB */
  maxFileSize?: number;
  /** 接受的文件类型（MIME），默认支持常见图片格式 */
  accept?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否显示预览，默认 true */
  showPreview?: boolean;
}

/**
 * OSS 直传上传组件
 *
 * 使用阿里云 OSS Post Policy 签名方式实现前端直传。
 * 文件直接上传到 OSS，不经过后端服务器，减少带宽消耗。
 *
 * @example
 * ```tsx
 * // 基本使用
 * <OSSUpload type="merchant_logo" />
 *
 * // 在表单中使用（配合 Ant Design Form）
 * <Form.Item label="图片" name="imageUrl">
 *   <OSSUpload type="news_banner" />
 * </Form.Item>
 *
 * // 自定义配置
 * <OSSUpload
 *   type="avatar"
 *   maxFileSize={2 * 1024 * 1024}  // 2MB
 *   accept="image/jpeg,image/png"
 *   showPreview={true}
 * />
 * ```
 */
export const OSSUpload: React.FC<OSSUploadProps> = ({
  value,
  onChange,
  type,
  maxFileSize = 5 * 1024 * 1024,  // 默认 5MB
  accept = 'image/jpeg,image/png,image/gif,image/webp',
  disabled = false,
  showPreview = true,
}) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  // 初始化文件列表（如果已有 URL）
  const [fileList, setFileList] = useState<UploadFile[]>(
    value ? [{
      uid: '-1',
      name: 'uploaded-image',
      status: 'done',
      url: value,
    }] : []
  );

  /**
   * 自定义上传处理
   *
   * 使用 OSS Post Policy 签名方式直传 OSS
   */
  const customUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;

    try {
      setLoading(true);

      // 1. 验证文件类型
      const allowedTypes = accept.split(',');
      if (!OSSUploader.validateFileType(file, allowedTypes)) {
        throw new Error(`文件类型不支持，仅支持: ${accept}`);
      }

      // 2. 验证文件大小
      if (!OSSUploader.validateFileSize(file, maxFileSize)) {
        throw new Error(`文件大小不能超过 ${Math.floor(maxFileSize / 1024 / 1024)}MB`);
      }

      // 3. 上传文件到 OSS（使用后端提供的凭证）
      const result = await OSSUploader.upload(file, type);

      // 4. 更新文件列表
      setFileList([{
        uid: file.uid,
        name: file.name,
        status: 'done',
        url: result.url,
      }]);

      // 5. 触发 onChange（通知父组件）
      onChange?.(result.url);

      onSuccess(result, file);
      message.success('上传成功');
    } catch (error: any) {
      onError(error);
      message.error(error.message || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 删除文件
   */
  const handleRemove = () => {
    setFileList([]);
    onChange?.('');
  };

  return (
    <div>
      {/* 显示预览或上传按钮 */}
      {value && showPreview ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 图片预览 */}
          <Image
            src={value}
            alt="uploaded"
            width={100}
            height={100}
            style={{ objectFit: 'cover', borderRadius: '4px' }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFMygf..." // 默认占位图
          />

          {/* 删除按钮 */}
          {!disabled && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleRemove}
              loading={loading}
            >
              删除
            </Button>
          )}
        </div>
      ) : (
        /* 上传按钮 */
        <Upload
          fileList={fileList}
          customRequest={customUpload}
          accept={accept}
          disabled={disabled || loading}
          maxCount={1}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />} loading={loading} disabled={disabled}>
            {loading ? '上传中...' : '上传图片'}
          </Button>
        </Upload>
      )}

      {/* 提示信息 */}
      <div style={{ marginTop: '8px', color: '#999', fontSize: '12px' }}>
        支持 JPG、PNG、GIF、WEBP 格式，最大 {Math.floor(maxFileSize / 1024 / 1024)}MB
      </div>
    </div>
  );
};

/**
 * 多图片上传组件（可扩展）
 *
 * @example
 * ```tsx
 * <OSSUploadMultiple
 *   type="merchant_gallery"
 *   value={imageUrls}
 *   onChange={(urls) => console.log(urls)}
 *   maxCount={5}
 * />
 * ```
 */
export const OSSUploadMultiple: React.FC<{
  value?: string[];
  onChange?: (urls: string[]) => void;
  type: UploadType;
  maxCount?: number;
  maxFileSize?: number;
  accept?: string;
}> = ({
  value = [],
  onChange,
  type,
  maxCount = 5,
  maxFileSize = 5 * 1024 * 1024,
  accept = 'image/jpeg,image/png,image/gif,image/webp',
}) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const [fileList, setFileList] = useState<UploadFile[]>(
    value.map((url, index) => ({
      uid: `${index}`,
      name: `image-${index}`,
      status: 'done',
      url,
    }))
  );

  const customUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;

    try {
      setLoading(true);

      // 验证文件
      const allowedTypes = accept.split(',');
      if (!OSSUploader.validateFileType(file, allowedTypes)) {
        throw new Error('文件类型不支持');
      }
      if (!OSSUploader.validateFileSize(file, maxFileSize)) {
        throw new Error(`文件大小不能超过 ${Math.floor(maxFileSize / 1024 / 1024)}MB`);
      }

      // 上传
      const result = await OSSUploader.upload(file, type);

      // 更新列表
      const newFileList = [...fileList, {
        uid: file.uid,
        name: file.name,
        status: 'done',
        url: result.url,
      }];
      setFileList(newFileList);

      // 触发 onChange
      onChange?.(newFileList.map(f => f.url as string));

      onSuccess(result, file);
      message.success('上传成功');
    } catch (error: any) {
      onError(error);
      message.error(error.message || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (file: UploadFile) => {
    const newFileList = fileList.filter(f => f.uid !== file.uid);
    setFileList(newFileList);
    onChange?.(newFileList.map(f => f.url as string));
  };

  return (
    <Upload
      fileList={fileList}
      customRequest={customUpload}
      accept={accept}
      maxCount={maxCount}
      multiple
      onRemove={handleRemove}
      listType="picture-card"
    >
      {fileList.length < maxCount && (
        <Button icon={<UploadOutlined />} loading={loading}>
          上传
        </Button>
      )}
    </Upload>
  );
};
/**
 * 图片优化服务
 * 提供图片压缩、缩略图生成、格式转换等功能
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class ImageOptimizer {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../../uploads');
    this.thumbnailsDir = path.join(this.uploadsDir, 'thumbnails');
    this.mediumDir = path.join(this.uploadsDir, 'medium');
    
    // 确保目录存在
    this.ensureDirectories();
  }

  /**
   * 确保必要的目录存在
   */
  async ensureDirectories() {
    try {
      await fs.mkdir(this.thumbnailsDir, { recursive: true });
      await fs.mkdir(this.mediumDir, { recursive: true });
      logger.info('图片目录初始化完成');
    } catch (error) {
      logger.error('创建图片目录失败', { error: error.message });
    }
  }

  /**
   * 处理上传的图片
   * @param {Buffer} buffer - 图片buffer
   * @param {string} originalName - 原始文件名
   * @returns {Object} 包含各种尺寸图片的路径
   */
  async processImage(buffer, originalName = 'image') {
    const startTime = Date.now();
    const filename = this.generateFilename(originalName);
    
    try {
      // 获取原图信息
      const metadata = await sharp(buffer).metadata();
      logger.info('处理图片', {
        filename,
        originalSize: `${(buffer.length / 1024).toFixed(2)}KB`,
        dimensions: `${metadata.width}x${metadata.height}`,
        format: metadata.format
      });

      // 并行生成多个尺寸
      const [thumbnail, medium, webp] = await Promise.all([
        this.generateThumbnail(buffer, filename),
        this.generateMedium(buffer, filename),
        this.generateWebP(buffer, filename)
      ]);

      const duration = Date.now() - startTime;
      logger.info('图片处理完成', {
        filename,
        duration: `${duration}ms`,
        sizes: {
          thumbnail: thumbnail.size,
          medium: medium.size,
          webp: webp.size
        }
      });

      return {
        thumbnail: thumbnail.path,
        medium: medium.path,
        webp: webp.path,
        original: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        }
      };
    } catch (error) {
      logger.error('图片处理失败', {
        filename,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 生成缩略图 (200x200)
   */
  async generateThumbnail(buffer, filename) {
    const outputPath = path.join(this.thumbnailsDir, `${filename}-thumb.jpg`);
    
    await sharp(buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({
        quality: 80,
        progressive: true
      })
      .toFile(outputPath);

    const stats = await fs.stat(outputPath);
    
    return {
      path: `/uploads/thumbnails/${filename}-thumb.jpg`,
      size: `${(stats.size / 1024).toFixed(2)}KB`
    };
  }

  /**
   * 生成中等尺寸 (800x800)
   */
  async generateMedium(buffer, filename) {
    const outputPath = path.join(this.mediumDir, `${filename}.jpg`);
    
    await sharp(buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 85,
        progressive: true
      })
      .toFile(outputPath);

    const stats = await fs.stat(outputPath);
    
    return {
      path: `/uploads/medium/${filename}.jpg`,
      size: `${(stats.size / 1024).toFixed(2)}KB`
    };
  }

  /**
   * 生成WebP格式
   */
  async generateWebP(buffer, filename) {
    const outputPath = path.join(this.mediumDir, `${filename}.webp`);
    
    await sharp(buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({
        quality: 85
      })
      .toFile(outputPath);

    const stats = await fs.stat(outputPath);
    
    return {
      path: `/uploads/medium/${filename}.webp`,
      size: `${(stats.size / 1024).toFixed(2)}KB`
    };
  }

  /**
   * 生成唯一文件名
   */
  generateFilename(originalName) {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    
    return `${name}-${timestamp}-${random}`;
  }

  /**
   * 批量优化现有图片
   */
  async optimizeExistingImages() {
    logger.info('开始批量优化现有图片...');
    
    try {
      const files = await fs.readdir(this.uploadsDir);
      const imageFiles = files.filter(f => 
        /\.(jpg|jpeg|png|gif)$/i.test(f) && !f.includes('-thumb')
      );

      logger.info(`找到 ${imageFiles.length} 个图片文件`);

      let processed = 0;
      let errors = 0;

      for (const file of imageFiles) {
        try {
          const filePath = path.join(this.uploadsDir, file);
          const buffer = await fs.readFile(filePath);
          
          await this.processImage(buffer, file);
          processed++;
          
          if (processed % 10 === 0) {
            logger.info(`已处理 ${processed}/${imageFiles.length} 个图片`);
          }
        } catch (error) {
          errors++;
          logger.error(`处理图片失败: ${file}`, { error: error.message });
        }
      }

      logger.info('批量优化完成', {
        total: imageFiles.length,
        processed,
        errors
      });

      return { total: imageFiles.length, processed, errors };
    } catch (error) {
      logger.error('批量优化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 清理未使用的图片
   */
  async cleanupUnusedImages(usedImages) {
    logger.info('开始清理未使用的图片...');
    
    try {
      const files = await fs.readdir(this.uploadsDir);
      const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

      let deleted = 0;

      for (const file of imageFiles) {
        const filePath = `/uploads/${file}`;
        
        if (!usedImages.includes(filePath)) {
          try {
            await fs.unlink(path.join(this.uploadsDir, file));
            deleted++;
          } catch (error) {
            logger.error(`删除图片失败: ${file}`, { error: error.message });
          }
        }
      }

      logger.info('清理完成', {
        total: imageFiles.length,
        deleted,
        remaining: imageFiles.length - deleted
      });

      return { total: imageFiles.length, deleted };
    } catch (error) {
      logger.error('清理失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取图片统计信息
   */
  async getStatistics() {
    try {
      const files = await fs.readdir(this.uploadsDir);
      const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

      let totalSize = 0;
      for (const file of imageFiles) {
        const stats = await fs.stat(path.join(this.uploadsDir, file));
        totalSize += stats.size;
      }

      const thumbnails = await fs.readdir(this.thumbnailsDir).catch(() => []);
      const mediumImages = await fs.readdir(this.mediumDir).catch(() => []);

      return {
        totalImages: imageFiles.length,
        totalSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
        thumbnails: thumbnails.length,
        mediumImages: mediumImages.length
      };
    } catch (error) {
      logger.error('获取统计信息失败', { error: error.message });
      return null;
    }
  }
}

// 单例模式
const imageOptimizer = new ImageOptimizer();

module.exports = imageOptimizer;

/**
 * Cloudinary Image Upload Service
 * Handles image uploads, transformations, and management
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'clubswap_listings';

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  resourceType: string;
}

export const cloudinaryService = {
  /**
   * Upload image from base64 string
   */
  uploadBase64: async (
    base64Image: string,
    folder: string = 'listings',
    publicId?: string
  ): Promise<UploadResult> => {
    try {
      const result = await cloudinary.uploader.upload(base64Image, {
        folder,
        public_id: publicId,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 900, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      });

      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: result.resource_type,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  },

  /**
   * Upload image from URL
   */
  uploadFromUrl: async (
    imageUrl: string,
    folder: string = 'listings',
    publicId?: string
  ): Promise<UploadResult> => {
    try {
      const result = await cloudinary.uploader.upload(imageUrl, {
        folder,
        public_id: publicId,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 900, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      });

      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        resourceType: result.resource_type,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  },

  /**
   * Upload listing photo
   */
  uploadListingPhoto: async (
    listingId: string,
    imageData: string,
    position: number
  ): Promise<UploadResult> => {
    const publicId = `${listingId}_${position}`;
    return cloudinaryService.uploadBase64(imageData, 'listings', publicId);
  },

  /**
   * Upload avatar photo
   */
  uploadAvatar: async (userId: string, imageData: string): Promise<UploadResult> => {
    const publicId = `avatar_${userId}`;
    return cloudinaryService.uploadBase64(imageData, 'avatars', publicId);
  },

  /**
   * Delete image
   */
  deleteImage: async (publicId: string): Promise<boolean> => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw error;
    }
  },

  /**
   * Delete multiple images
   */
  deleteImages: async (publicIds: string[]): Promise<boolean> => {
    try {
      const result = await cloudinary.api.delete_resources(publicIds);
      return result.deleted && Object.keys(result.deleted).length === publicIds.length;
    } catch (error) {
      console.error('Cloudinary batch delete error:', error);
      throw error;
    }
  },

  /**
   * Get optimized image URL with transformations
   */
  getOptimizedUrl: (
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
      format?: string;
    } = {}
  ): string => {
    if (!cloudName) {
      throw new Error('Cloudinary not configured');
    }

    const {
      width = 800,
      height = 600,
      crop = 'fill',
      quality = 'auto:good',
      format = 'auto',
    } = options;

    return cloudinary.url(publicId, {
      transformation: [
        { width, height, crop },
        { quality },
        { fetch_format: format },
      ],
    });
  },

  /**
   * Get thumbnail URL
   */
  getThumbnailUrl: (publicId: string, size: number = 200): string => {
    return cloudinaryService.getOptimizedUrl(publicId, {
      width: size,
      height: size,
      crop: 'thumb',
    });
  },

  /**
   * Generate responsive image URLs for different screen sizes
   */
  getResponsiveUrls: (publicId: string): {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    original: string;
  } => {
    return {
      thumbnail: cloudinaryService.getOptimizedUrl(publicId, { width: 200, height: 200 }),
      small: cloudinaryService.getOptimizedUrl(publicId, { width: 400, height: 300 }),
      medium: cloudinaryService.getOptimizedUrl(publicId, { width: 800, height: 600 }),
      large: cloudinaryService.getOptimizedUrl(publicId, { width: 1200, height: 900 }),
      original: cloudinary.url(publicId),
    };
  },

  /**
   * Upload multiple images (batch)
   */
  uploadMultiple: async (
    images: Array<{ data: string; folder?: string; publicId?: string }>
  ): Promise<UploadResult[]> => {
    const uploadPromises = images.map(({ data, folder, publicId }) =>
      cloudinaryService.uploadBase64(data, folder, publicId)
    );

    return Promise.all(uploadPromises);
  },

  /**
   * Generate upload signature for client-side uploads
   */
  generateUploadSignature: (folder: string): {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
  } => {
    const timestamp = Math.round(Date.now() / 1000);
    const params = {
      timestamp,
      folder,
      upload_preset: uploadPreset,
    };

    const signature = cloudinary.utils.api_sign_request(params, apiSecret!);

    return {
      signature,
      timestamp,
      cloudName: cloudName!,
      apiKey: apiKey!,
      folder,
    };
  },
};

export default cloudinaryService;

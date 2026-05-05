import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 1,            // Target max size 1MB
    maxWidthOrHeight: 1600, // HD resolution but optimized
    useWebWorker: true,     // Improved performance
    fileType: 'image/jpeg', // Better compression for photos
    initialQuality: 0.85,    // Good starting quality
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    // Convert blob back to file with proper extension
    return new File([compressedBlob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Compression error:', error);
    // If compression fails, return original file as fallback
    return file;
  }
};

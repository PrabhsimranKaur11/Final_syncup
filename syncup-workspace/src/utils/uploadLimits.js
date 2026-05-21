/** Max attachment size (bytes). Keep in sync with syncup-backend/routes/message.routes.js */
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB (videos)
export const MAX_FILE_SIZE_MB = 100;
export const MAX_NON_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB for other files
export const MAX_NON_VIDEO_SIZE_MB = 50;

export const formatFileSize = (bytes) => {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const isVideoFile = (file) => {
  if (!file) return false;
  const type = file.type || '';
  const name = (file.name || '').toLowerCase();
  return type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(name);
};

export const getMaxBytesForFile = (file) =>
  (isVideoFile(file) ? MAX_FILE_SIZE_BYTES : MAX_NON_VIDEO_SIZE_BYTES);

export const getMaxMbForFile = (file) =>
  (isVideoFile(file) ? MAX_FILE_SIZE_MB : MAX_NON_VIDEO_SIZE_MB);

/**
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export const validateFileSize = (file) => {
  if (!file) return { ok: false, message: 'No file selected.' };
  const maxBytes = getMaxBytesForFile(file);
  const maxMb = getMaxMbForFile(file);
  if (file.size > maxBytes) {
    const actual = formatFileSize(file.size);
    const hint = isVideoFile(file)
      ? ' Try compressing the video or trimming it before uploading.'
      : '';
    return {
      ok: false,
      message: `"${file.name}" is ${actual} — max ${maxMb} MB${isVideoFile(file) ? ' for videos' : ''}.${hint}`,
    };
  }
  return { ok: true };
};

export const fileDisplayCategory = (fileType, fileName = '') => {
  if (!fileType && !fileName) return 'file';
  const type = String(fileType || '');
  const name = String(fileName || '').toLowerCase();
  if (type === 'image' || type.startsWith('image/')) return 'image';
  if (type.startsWith('video/') || type === 'video' || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(name)) {
    return 'video';
  }
  if (type.startsWith('audio/') || type === 'audio') return 'audio';
  return 'file';
};

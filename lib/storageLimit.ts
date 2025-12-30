import { getUserStorageUsage } from './storageMonitoring';

export const STORAGE_LIMITS = {
  MAX_TOTAL_STORAGE_BYTES: 100 * 1024 * 1024,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  MAX_TOTAL_STORAGE_MB: 100,
  MAX_FILE_SIZE_MB: 10,
  WARNING_THRESHOLD_PERCENT: 80,
};

export interface StorageCheckResult {
  allowed: boolean;
  currentUsage: number;
  availableSpace: number;
  fileSize: number;
  message?: string;
  warningMessage?: string;
}

export async function checkStorageLimit(
  userId: string,
  fileSizeBytes: number
): Promise<StorageCheckResult> {
  const currentUsage = await getUserStorageUsage(userId);
  const availableSpace = STORAGE_LIMITS.MAX_TOTAL_STORAGE_BYTES - currentUsage.totalSizeBytes;
  const wouldExceedLimit = currentUsage.totalSizeBytes + fileSizeBytes > STORAGE_LIMITS.MAX_TOTAL_STORAGE_BYTES;

  if (fileSizeBytes > STORAGE_LIMITS.MAX_FILE_SIZE_BYTES) {
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
    return {
      allowed: false,
      currentUsage: currentUsage.totalSizeBytes,
      availableSpace,
      fileSize: fileSizeBytes,
      message: `File is too large (${fileSizeMB} MB). Maximum file size is ${STORAGE_LIMITS.MAX_FILE_SIZE_MB} MB.`,
    };
  }

  if (wouldExceedLimit) {
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
    const availableMB = (availableSpace / (1024 * 1024)).toFixed(2);
    return {
      allowed: false,
      currentUsage: currentUsage.totalSizeBytes,
      availableSpace,
      fileSize: fileSizeBytes,
      message: `Not enough storage space. File size: ${fileSizeMB} MB, Available: ${availableMB} MB. You've used ${currentUsage.totalSize} of ${STORAGE_LIMITS.MAX_TOTAL_STORAGE_MB} MB.`,
    };
  }

  const newUsagePercent = ((currentUsage.totalSizeBytes + fileSizeBytes) / STORAGE_LIMITS.MAX_TOTAL_STORAGE_BYTES) * 100;
  let warningMessage: string | undefined;

  if (newUsagePercent >= STORAGE_LIMITS.WARNING_THRESHOLD_PERCENT) {
    const remainingMB = (availableSpace - fileSizeBytes) / (1024 * 1024);
    warningMessage = `After this upload, you'll have ${remainingMB.toFixed(2)} MB remaining (${(100 - newUsagePercent).toFixed(0)}% free).`;
  }

  return {
    allowed: true,
    currentUsage: currentUsage.totalSizeBytes,
    availableSpace,
    fileSize: fileSizeBytes,
    warningMessage,
  };
}

export function formatStorageMessage(
  currentBytes: number,
  limitBytes: number = STORAGE_LIMITS.MAX_TOTAL_STORAGE_BYTES
): string {
  const usedMB = (currentBytes / (1024 * 1024)).toFixed(2);
  const limitMB = (limitBytes / (1024 * 1024)).toFixed(0);
  const percent = ((currentBytes / limitBytes) * 100).toFixed(0);

  return `Using ${usedMB} MB of ${limitMB} MB (${percent}%)`;
}

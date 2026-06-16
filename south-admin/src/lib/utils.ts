import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBalance(amount: number, currency: string): string {
  return amount.toLocaleString('ar-SA');
}

export function formatNumber(num: number): string {
  return num.toLocaleString('ar-SA');
}

export const currencySymbols: Record<string, string> = {
  YER: 'ر.ي',
  SAR: 'ر.س',
  USD: '$',
};

export const currencyNames: Record<string, string> = {
  YER: 'الريال اليمني',
  SAR: 'الريال السعودي',
  USD: 'الدولار الأمريكي',
};

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
  if (diff < 2592000) return `منذ ${Math.floor(diff / 604800)} أسبوع`;
  return date.toLocaleDateString('ar-SA');
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function generateGiftCode(length = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'SW-';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function compressBase64Image(base64: string, maxWidth = 200, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64;
  });
}

export function formatDateAr(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function logActivity(type: string, action: string, details: string, adminId: string, adminName: string) {
  // This will be called from components that have access to Firebase
  // The actual Firebase write is in the components
  return {
    id: generateId(),
    type,
    action,
    details,
    adminId,
    adminName,
    timestamp: new Date().toISOString(),
  };
}

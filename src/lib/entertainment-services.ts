// Entertainment Services Data - محفظة الجنوب
// All categories, services, and products are now loaded dynamically from Firebase
// This file is kept for type compatibility only - all data is managed via admin panel

export interface EntertainmentPackage {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  priceUSD: number;
  description: string;
  descriptionAr: string;
  descriptionEn: string;
  active: boolean;
}

export interface EntertainmentService {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  category: string;
  subCategory: string;
  packages: EntertainmentPackage[];
  active: boolean;
  commissionRate: number;
  steamAppId?: number;
}

export interface EntertainmentCategory {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
}

// Empty arrays - all data is now managed through Firebase + Admin Panel
export const ENTERTAINMENT_CATEGORIES: EntertainmentCategory[] = [];
export const ENTERTAINMENT_SERVICES: EntertainmentService[] = [];

// Default commission rate (overridden by admin settings)
export const DEFAULT_COMMISSION_RATE = 3;

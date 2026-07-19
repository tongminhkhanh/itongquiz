import type { GiftCategory, GiftOrderStatus } from '../../../types/giftShop.types';
import type { GiftCatalogFormState } from './types';

export const CATEGORY_OPTIONS: Array<{ value: GiftCategory; label: string }> = [
  { value: 'SNACK', label: 'Khu Ăn Vặt' },
  { value: 'SUPPLY', label: 'Văn Phòng Phẩm' },
  { value: 'PRIVILEGE', label: 'Đặc Quyền Lớp' },
];

export const STATUS_OPTIONS: Array<{ value: GiftOrderStatus | 'ALL'; label: string }> = [
  { value: 'VOUCHER_ISSUED', label: 'Chờ trao quà' },
  { value: 'DELIVERED', label: 'Đã trao' },
  { value: 'CANCELLED_REFUNDED', label: 'Đã hủy/hoàn xu' },
  { value: 'ALL', label: 'Tất cả' },
];

export const CATEGORY_LABEL_MAP: Record<GiftCategory, string> = {
  SNACK: 'Khu Ăn Vặt',
  SUPPLY: 'Văn Phòng Phẩm',
  PRIVILEGE: 'Đặc Quyền Lớp',
};

export const EMPTY_CATALOG_FORM: GiftCatalogFormState = {
  name: '',
  category: 'SNACK',
  priceCoins: '',
  imageUrl: '',
};

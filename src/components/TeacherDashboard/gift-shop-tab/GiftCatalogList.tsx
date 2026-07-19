import { Pencil, Trash2 } from 'lucide-react';
import type { GiftCatalogItem } from '../../../types/giftShop.types';
import { CATEGORY_LABEL_MAP } from './giftShopConfig';

interface Props {
  catalog: GiftCatalogItem[];
  onEdit: (item: GiftCatalogItem) => void;
  onDelete: (item: GiftCatalogItem) => void;
}

export const GiftCatalogList = ({ catalog, onEdit, onDelete }: Props) => (
  <div className="mt-4 space-y-2">
    {catalog.map(item => (
      <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
        <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-contain bg-slate-50 p-1" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 truncate">{item.name}</p>
          <p className="text-xs text-slate-500">{CATEGORY_LABEL_MAP[item.category]} • {item.priceCoins} Xu</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="w-4 h-4" /> Sửa
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-sm font-bold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" /> Xóa
          </button>
        </div>
      </div>
    ))}
  </div>
);

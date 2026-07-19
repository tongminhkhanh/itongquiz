import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { PlusCircle } from 'lucide-react';
import type { GiftCategory } from '../../../types/giftShop.types';
import { CATEGORY_OPTIONS } from './giftShopConfig';
import type { GiftCatalogFormState } from './types';

interface Props {
  form: GiftCatalogFormState;
  setForm: Dispatch<SetStateAction<GiftCatalogFormState>>;
  editingItemId: string | null;
  onSubmit: (event: FormEvent) => Promise<void>;
  onCancelEdit: () => void;
}

export const GiftCatalogForm = ({ form, setForm, editingItemId, onSubmit, onCancelEdit }: Props) => (
  <form onSubmit={(event) => void onSubmit(event)} className="grid grid-cols-1 md:grid-cols-4 gap-3">
    <input
      value={form.name}
      onChange={(event) => setForm(prev => ({ ...prev, name: event.target.value }))}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
      placeholder="Tên quà"
    />
    <select
      value={form.category}
      onChange={(event) => setForm(prev => ({ ...prev, category: event.target.value as GiftCategory }))}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
    >
      {CATEGORY_OPTIONS.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
    <input
      value={form.priceCoins}
      onChange={(event) => setForm(prev => ({ ...prev, priceCoins: event.target.value }))}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
      placeholder="Giá xu"
      type="number"
      min={1}
    />
    <input
      value={form.imageUrl}
      onChange={(event) => setForm(prev => ({ ...prev, imageUrl: event.target.value }))}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 md:col-span-3"
      placeholder="Link ảnh (Cloudinary/CDN)"
    />
    <div className="flex items-center gap-2">
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700"
      >
        <PlusCircle className="w-4 h-4" /> {editingItemId ? 'Cập nhật quà' : 'Thêm quà'}
      </button>
      {editingItemId && (
        <button
          type="button"
          onClick={onCancelEdit}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
        >
          Hủy sửa
        </button>
      )}
    </div>
  </form>
);

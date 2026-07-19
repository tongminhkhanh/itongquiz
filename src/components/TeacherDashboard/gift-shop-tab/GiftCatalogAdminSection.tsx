import type { GiftCatalogItem } from '../../../types/giftShop.types';
import type { useGiftCatalogEditor } from './useGiftCatalogEditor';
import { GiftCatalogForm } from './GiftCatalogForm';
import { GiftCatalogList } from './GiftCatalogList';

interface Props {
  catalog: GiftCatalogItem[];
  editor: ReturnType<typeof useGiftCatalogEditor>;
}

export const GiftCatalogAdminSection = ({ catalog, editor }: Props) => (
  <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
    <h3 className="text-lg font-black text-slate-800 mb-3">Quản kho (Admin)</h3>
    <GiftCatalogForm
      form={editor.form}
      setForm={editor.setForm}
      editingItemId={editor.editingItemId}
      onSubmit={editor.submit}
      onCancelEdit={editor.resetAdminForm}
    />
    <GiftCatalogList catalog={catalog} onEdit={editor.startEditing} onDelete={editor.remove} />
  </section>
);

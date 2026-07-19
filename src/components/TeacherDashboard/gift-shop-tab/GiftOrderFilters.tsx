import type { GiftOrderStatus } from '../../../types/giftShop.types';
import { STATUS_OPTIONS } from './giftShopConfig';

interface Props {
  isAdmin: boolean;
  statusFilter: GiftOrderStatus | 'ALL';
  setStatusFilter: (status: GiftOrderStatus | 'ALL') => void;
  classFilter: string;
  setClassFilter: (classId: string) => void;
}

export const GiftOrderFilters = ({
  isAdmin,
  statusFilter,
  setStatusFilter,
  classFilter,
  setClassFilter,
}: Props) => (
  <div className="flex items-center gap-2 flex-wrap">
    <select
      value={statusFilter}
      onChange={(event) => setStatusFilter(event.target.value as GiftOrderStatus | 'ALL')}
      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold"
    >
      {STATUS_OPTIONS.map(option => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
    {isAdmin && (
      <input
        value={classFilter}
        onChange={(event) => setClassFilter(event.target.value)}
        className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm"
        placeholder="Lọc classId (vd: class_3a)"
      />
    )}
  </div>
);

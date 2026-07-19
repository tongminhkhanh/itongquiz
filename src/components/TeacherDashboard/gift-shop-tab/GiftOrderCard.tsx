import { CheckCircle2, XCircle } from 'lucide-react';
import type { GiftOrder } from '../../../types/giftShop.types';

interface Props {
  order: GiftOrder;
  isLoading: boolean;
  onDeliver: (orderId: string) => Promise<void>;
  onCancel: (orderId: string) => Promise<void>;
}

const statusClassName = (status: GiftOrder['status']) => {
  if (status === 'VOUCHER_ISSUED') return 'bg-blue-50 text-blue-700';
  if (status === 'DELIVERED') return 'bg-emerald-50 text-emerald-700';
  return 'bg-red-50 text-red-700';
};

export const GiftOrderCard = ({ order, isLoading, onDeliver, onCancel }: Props) => (
  <div className="rounded-xl border border-slate-200 p-3 md:p-4">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="font-bold text-slate-800">{order.studentName} • {order.className || order.classId}</p>
        <p className="text-sm text-slate-600">{order.itemSnapshot.name} • {order.priceCoins} Xu</p>
        <p className="text-xs text-slate-500 mt-1">Voucher: <span className="font-mono">{order.voucherCode}</span></p>
      </div>
      <span className={`text-[10px] px-2 py-1 rounded-full font-black ${statusClassName(order.status)}`}>
        {order.status}
      </span>
    </div>
    {order.status === 'VOUCHER_ISSUED' && (
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => void onDeliver(order.id)}
          disabled={isLoading}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60"
        >
          <CheckCircle2 className="w-4 h-4" /> Đã trao quà
        </button>
        <button
          onClick={() => void onCancel(order.id)}
          disabled={isLoading}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 disabled:opacity-60"
        >
          <XCircle className="w-4 h-4" /> Hủy & hoàn xu
        </button>
      </div>
    )}
  </div>
);

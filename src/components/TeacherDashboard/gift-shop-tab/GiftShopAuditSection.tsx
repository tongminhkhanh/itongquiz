import type { GiftShopEventLog } from '../../../types/giftShop.types';

interface Props {
  mode: string;
  events: GiftShopEventLog[];
}

export const GiftShopAuditSection = ({ mode, events }: Props) => (
  <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
    <h3 className="text-lg font-black text-slate-800 mb-3">Audit log ({mode})</h3>
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {events.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có sự kiện.</p>
      ) : (
        events.map(event => (
          <div key={event.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-xs font-bold text-slate-700">{event.type}</p>
            <p className="text-[11px] text-slate-500">{new Date(event.createdAt).toLocaleString('vi-VN')}</p>
          </div>
        ))
      )}
    </div>
  </section>
);

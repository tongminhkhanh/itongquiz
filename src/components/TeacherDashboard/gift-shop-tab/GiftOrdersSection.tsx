import type { GiftOrder } from '../../../types/giftShop.types';
import type { GiftShopFiltersState } from './types';
import { GiftOrderCard } from './GiftOrderCard';
import { GiftOrderFilters } from './GiftOrderFilters';

interface Props {
  isAdmin: boolean;
  orders: GiftOrder[];
  isLoading: boolean;
  filters: GiftShopFiltersState;
  onDeliver: (orderId: string) => Promise<void>;
  onCancel: (orderId: string) => Promise<void>;
}

export const GiftOrdersSection = ({ isAdmin, orders, isLoading, filters, onDeliver, onCancel }: Props) => (
  <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5">
    <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
      <h3 className="text-lg font-black text-slate-800">Duyệt đơn quà</h3>
      <GiftOrderFilters
        isAdmin={isAdmin}
        statusFilter={filters.statusFilter}
        setStatusFilter={filters.setStatusFilter}
        classFilter={filters.classFilter}
        setClassFilter={filters.setClassFilter}
      />
    </div>
    {orders.length === 0 ? (
      <p className="text-sm text-slate-500">Không có đơn phù hợp bộ lọc hiện tại.</p>
    ) : (
      <div className="space-y-3">
        {orders.map(order => (
          <GiftOrderCard
            key={order.id}
            order={order}
            isLoading={isLoading}
            onDeliver={onDeliver}
            onCancel={onCancel}
          />
        ))}
      </div>
    )}
  </section>
);

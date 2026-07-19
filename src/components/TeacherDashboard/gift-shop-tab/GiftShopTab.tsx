import React from 'react';
import { useAuthStore } from '../../../../stores/authStore';
import { useGiftShopStore } from '../../../stores/useGiftShopStore';
import { giftShopService } from '../../../services/giftShop.service';
import { GiftCatalogAdminSection } from './GiftCatalogAdminSection';
import { GiftOrdersSection } from './GiftOrdersSection';
import { GiftShopAuditSection } from './GiftShopAuditSection';
import { GiftShopErrorBanner } from './GiftShopErrorBanner';
import { GiftShopHeader } from './GiftShopHeader';
import { GiftShopLoadingIndicator } from './GiftShopLoadingIndicator';
import { useGiftCatalogEditor } from './useGiftCatalogEditor';
import { useGiftOrderActions } from './useGiftOrderActions';
import { useGiftShopFilters } from './useGiftShopFilters';
import { useGiftShopRefresh } from './useGiftShopRefresh';

const GiftShopTab: React.FC = () => {
  const authStore = useAuthStore();
  const store = useGiftShopStore();
  const filters = useGiftShopFilters({
    username: authStore.username,
    isAdmin: authStore.isAdmin,
    teacherClass: authStore.teacherClass,
  });
  const refreshAll = useGiftShopRefresh({
    isAdmin: authStore.isAdmin,
    query: filters.query,
    loadCatalog: store.loadCatalog,
    loadManagedOrders: store.loadManagedOrders,
    loadEventLogs: store.loadEventLogs,
  });
  const catalogEditor = useGiftCatalogEditor({
    actor: filters.actor,
    saveCatalogItem: store.saveCatalogItem,
    removeCatalogItem: store.removeCatalogItem,
  });
  const orderActions = useGiftOrderActions({
    actor: filters.actor,
    query: filters.query,
    deliverOrder: store.deliverOrder,
    cancelOrder: store.cancelOrder,
  });

  return (
    <div className="space-y-5">
      <GiftShopHeader isLoading={store.isLoading} onRefresh={refreshAll} />
      <GiftShopErrorBanner error={store.error} onClose={store.clearError} />
      {authStore.isAdmin && (
        <GiftCatalogAdminSection catalog={store.catalog} editor={catalogEditor} />
      )}
      <GiftOrdersSection
        isAdmin={authStore.isAdmin}
        orders={store.managedOrders}
        isLoading={store.isLoading}
        filters={filters}
        onDeliver={orderActions.deliver}
        onCancel={orderActions.cancel}
      />
      {authStore.isAdmin && (
        <GiftShopAuditSection mode={giftShopService.getMode()} events={store.eventLogs} />
      )}
      <GiftShopLoadingIndicator isLoading={store.isLoading} />
    </div>
  );
};

export default GiftShopTab;

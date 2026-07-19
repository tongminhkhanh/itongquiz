import { RefreshCw } from 'lucide-react';

interface Props {
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

export const GiftShopHeader = ({ isLoading, onRefresh }: Props) => (
  <div className="flex items-center justify-between gap-3 flex-wrap">
    <div>
      <p className="text-xs font-black uppercase tracking-wider text-indigo-500">Tiệm Tạp Hóa</p>
      <h2 className="text-2xl font-black text-slate-800">Duyệt đơn & quản kho quà</h2>
    </div>
    <button
      onClick={() => void onRefresh()}
      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50"
    >
      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      Làm mới
    </button>
  </div>
);

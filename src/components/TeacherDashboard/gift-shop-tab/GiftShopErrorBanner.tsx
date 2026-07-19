interface Props {
  error: string | null;
  onClose: () => void;
}

export const GiftShopErrorBanner = ({ error, onClose }: Props) => error ? (
  <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold flex items-center justify-between">
    <span>{error}</span>
    <button className="underline" onClick={onClose}>Đóng</button>
  </div>
) : null;

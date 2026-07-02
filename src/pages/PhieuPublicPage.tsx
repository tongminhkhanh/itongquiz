import React, { useEffect, useState } from 'react';
import { Loader2, Printer } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/common';
import { PhieuKetQuaCard } from '../features/homework/components/PhieuKetQuaCard';
import { phieuService } from '../features/homework/services/phieuService';
import { PublicPhieuResult } from '../features/homework/types/phieu.types';

const PhieuPublicPage: React.FC = () => {
  const { publicToken } = useParams<{ publicToken: string }>();
  const [data, setData] = useState<PublicPhieuResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!publicToken) {
        setError('Link phieu khong hop le.');
        setLoading(false);
        return;
      }

      try {
        setData(await phieuService.getPublicPhieu(publicToken));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Khong the tai phieu.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [publicToken]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="font-bold text-slate-500">Dang tai phieu ket qua...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-800">Khong tim thay phieu</h1>
          <p className="text-slate-500 mt-3">{error || 'Phieu co the da het han hoac da bi thu hoi.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-5">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-indigo-600">ThiTong</p>
            <h1 className="text-2xl font-black text-slate-800">{data.title}</h1>
          </div>
          <Button
            variant="secondary"
            onClick={() => window.print()}
            className="rounded-2xl"
            icon={<Printer className="w-4 h-4" />}
          >
            In phieu
          </Button>
        </header>

        <PhieuKetQuaCard phieu={data.phieu} />
      </div>
    </main>
  );
};

export default PhieuPublicPage;

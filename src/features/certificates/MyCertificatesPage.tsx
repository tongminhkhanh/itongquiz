import React, { useEffect, useState } from 'react';

interface MyCertificate {
  id: string;
  title: string;
  image_url: string;
  received_at: string;
  teacher_name: string;
  score?: string;
}

export default function MyCertificatesPage() {
  const [certificates, setCertificates] = useState<MyCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyCertificates = async () => {
      try {
        const res = await fetch('/api/my-certificates');
        
        if (!res.ok) {
          throw new Error('Không thể tải chứng nhận');
        }

        const data = await res.json();
        setCertificates(data.certificates || []);
      } catch (err: any) {
        console.error('Lỗi tải chứng nhận:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMyCertificates();
  }, []);

  if (loading) {
    return <div className="max-w-5xl mx-auto p-8 text-center">Đang tải chứng nhận...</div>;
  }

  if (error) {
    return <div className="max-w-5xl mx-auto p-8 text-center text-red-600">Lỗi: {error}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-8">Chứng nhận của tôi</h1>

      {certificates.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-medium text-gray-700">Chưa có chứng nhận nào</h3>
          <p className="text-gray-500 mt-2">Hãy cố gắng hơn nữa để nhận chứng nhận!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden group">
              <div className="relative h-56 bg-gray-100">
                {cert.image_url ? (
                  <img 
                    src={cert.image_url} 
                    alt={cert.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Chứng nhận đang xử lý
                  </div>
                )}
              </div>

              <div className="p-5">
                <h3 className="font-semibold text-lg mb-1 line-clamp-2">{cert.title}</h3>
                
                <div className="text-sm text-gray-500 mb-4">
                  Nhận từ: {cert.teacher_name}<br />
                  {new Date(cert.received_at).toLocaleDateString('vi-VN')}
                </div>

                {cert.score && (
                  <div className="text-sm text-blue-600 font-medium mb-4">
                    Điểm: {cert.score}
                  </div>
                )}

                <div className="flex gap-3">
                  <a 
                    href={cert.image_url} 
                    target="_blank" 
                    className="flex-1 py-2.5 text-center border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                  >
                    Xem
                  </a>
                  <a 
                    href={cert.image_url} 
                    download 
                    className="flex-1 py-2.5 text-center bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors"
                  >
                    Tải về
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Batch {
  id: string;
  title: string;
  status: string;
  created_at: string;
  total_students: number;
}

export default function CertificateListPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await fetch('/api/certificate-batches');
        const data = await res.json();
        setBatches(data.batches || []);
      } catch (error) {
        console.error('Lỗi tải danh sách chứng nhận:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Danh sách chứng nhận</h1>
          <p className="text-gray-600 mt-1">Quản lý các batch chứng nhận đã tạo</p>
        </div>
        <Link
          to="/teacher/certificates/create"
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-medium"
        >
          + Tạo chứng nhận mới
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Đang tải...</div>
      ) : batches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border">
          <p className="text-gray-500 mb-4">Bạn chưa tạo chứng nhận nào.</p>
          <Link 
            to="/teacher/certificates/create" 
            className="text-blue-600 hover:underline font-medium"
          >
            Tạo chứng nhận đầu tiên
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-4 font-medium text-gray-700">Tiêu đề</th>
                <th className="text-left px-6 py-4 font-medium text-gray-700">Ngày tạo</th>
                <th className="text-center px-6 py-4 font-medium text-gray-700">Số học sinh</th>
                <th className="text-center px-6 py-4 font-medium text-gray-700">Trạng thái</th>
                <th className="text-right px-6 py-4 font-medium text-gray-700">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{batch.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(batch.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4 text-center">{batch.total_students}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium
                      ${batch.status === 'sent' ? 'bg-green-100 text-green-700' : 
                        batch.status === 'sending' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-red-100 text-red-700'}
                    `}>
                      {batch.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      to={`/teacher/certificates/${batch.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Xem chi tiết →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
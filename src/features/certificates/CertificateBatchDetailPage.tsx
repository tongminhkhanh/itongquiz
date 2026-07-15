import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function CertificateBatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [batch, setBatch] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/certificate-batches/${batchId}`);
        const data = await res.json();
        
        if (data.batch) {
          setBatch(data.batch);
          setStudents(data.students || []);
        }
      } catch (error) {
        console.error('Lỗi tải chi tiết batch:', error);
      } finally {
        setLoading(false);
      }
    };

    if (batchId) {
      fetchDetail();
    }
  }, [batchId]);

  if (loading) {
    return <div className="p-8 text-center">Đang tải chi tiết...</div>;
  }

  if (!batch) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600">Không tìm thấy batch</h2>
        <Link to="/teacher/certificates" className="text-blue-600 mt-4 inline-block">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <Link to="/teacher/certificates" className="text-blue-600 hover:underline">
          ← Quay lại danh sách chứng nhận
        </Link>
        <h1 className="text-3xl font-bold mt-2">{batch.title}</h1>
        <p className="text-gray-600">Ngày tạo: {new Date(batch.created_at).toLocaleString('vi-VN')}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">
            Danh sách học sinh ({students.length})
          </h3>
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium
            ${batch.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
          `}>
            {batch.status}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-gray-600">
                <th className="py-4 px-4">Học sinh</th>
                <th className="py-4 px-4">Điểm</th>
                <th className="py-4 px-4">Chứng nhận</th>
                <th className="py-4 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((student, index) => (
                <tr key={index}>
                  <td className="py-4 px-4 font-medium">{student.student_name}</td>
                  <td className="py-4 px-4">{student.student_score || '-'}</td>
                  <td className="py-4 px-4">
                    {student.image_url ? (
                      <a 
                        href={student.image_url} 
                        target="_blank" 
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Xem ảnh
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">Đang xử lý...</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {student.image_url && (
                      <a 
                        href={student.image_url} 
                        download 
                        className="px-4 py-2 text-sm border rounded-xl hover:bg-gray-50"
                      >
                        Tải về
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';

export default function TemplateManagementPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    setLoading(true);

    try {
      const res = await fetch('/api/certificate-templates/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        alert('Upload template thành công!');
        form.reset();
        // TODO: Refresh danh sách template
      } else {
        alert('Upload thất bại');
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-8">Quản lý Mẫu Chứng nhận</h1>

      {/* Upload Form */}
      <div className="bg-white rounded-2xl shadow-sm border p-8 mb-8">
        <h3 className="font-semibold text-xl mb-6">Upload Template Mới</h3>
        
        <form onSubmit={handleUpload} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Tên template</label>
            <input 
              type="text" 
              name="name" 
              required 
              className="w-full border rounded-2xl px-5 py-3.5" 
              placeholder="Ví dụ: Mùa Hè 2026"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Mô tả</label>
            <textarea 
              name="description" 
              rows={3} 
              className="w-full border rounded-2xl px-5 py-3.5"
              placeholder="Mô tả ngắn về mẫu chứng nhận..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">File ảnh nền (PNG/JPG)</label>
            <input 
              type="file" 
              name="file" 
              accept="image/*" 
              required 
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-2xl file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="mt-4 px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-semibold disabled:opacity-60"
          >
            {loading ? 'Đang upload...' : 'Upload Template'}
          </button>
        </form>
      </div>

      {/* Danh sách Template */}
      <div className="bg-white rounded-2xl shadow-sm border p-8">
        <h3 className="font-semibold text-xl mb-6">Danh sách Template</h3>
        
        {templates.length === 0 ? (
          <p className="text-gray-500">Chưa có template nào. Hãy upload template đầu tiên.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates.map((tpl, index) => (
              <div key={index} className="border rounded-2xl p-5">
                <h4 className="font-semibold">{tpl.name}</h4>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{tpl.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
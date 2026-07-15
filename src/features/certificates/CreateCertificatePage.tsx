import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Student {
  student_id: string;
  student_name: string;
  student_score?: string;
}

interface Template {
  id: string;
  name: string;
  preview_url?: string;
}

interface Class {
  id: string;
  name: string;
}

interface FormData {
  title: string;
  custom_note: string;
  issue_date: string;
}

export default function CreateCertificatePage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // State
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [studentsInClass, setStudentsInClass] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    custom_note: '',
    issue_date: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Fetch templates khi component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/certificate-templates');
        const data = await res.json();
        setTemplates(data.templates || []);
      } catch (error) {
        console.error('Lỗi tải template:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, []);

  // Fetch danh sách lớp
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch('/api/classes'); // API danh sách lớp
        const data = await res.json();
        setClasses(data.classes || []);
      } catch (error) {
        console.error('Lỗi tải danh sách lớp:', error);
        // Fallback demo data
        setClasses([{ id: 'demo-class', name: 'Lớp 6A' }]);
      }
    };

    fetchClasses();
  }, []);

  // Fetch học sinh khi chọn lớp
  const handleClassSelect = async (classId: string) => {
    setSelectedClassId(classId);
    setSelectedStudents([]);

    try {
      const res = await fetch(`/api/classes/${classId}/students`);
      const data = await res.json();
      setStudentsInClass(data.students || []);
    } catch (error) {
      console.error('Lỗi tải học sinh:', error);
      // Demo data
      setStudentsInClass([
        { student_id: 's1', student_name: 'Nguyễn Văn A', student_score: '9.0' },
        { student_id: 's2', student_name: 'Trần Thị B', student_score: '8.5' },
        { student_id: 's3', student_name: 'Lê Văn C', student_score: '7.8' },
      ]);
    }
  };

  // Fetch học sinh khi chọn lớp (demo - cần API thật sau)
  const handleClassSelect = async (classId: string) => {
    setSelectedClassId(classId);
    setSelectedStudents([]);

    // TODO: Thay thế bằng API thật: GET /api/classes/${classId}/students
    // Hiện tại dùng dữ liệu demo
    const demoStudents: Student[] = [
      { student_id: 's1', student_name: 'Nguyễn Văn A', student_score: '9.0' },
      { student_id: 's2', student_name: 'Trần Thị B', student_score: '8.5' },
      { student_id: 's3', student_name: 'Lê Văn C', student_score: '7.8' },
    ];
    setStudentsInClass(demoStudents);
  };

  // Chuyển bước
  const goToStep = (step: number) => {
    if (step >= 1 && step <= 5) setCurrentStep(step);
  };

  // Submit
  const handleSubmit = async () => {
    if (!selectedTemplate || selectedStudents.length === 0 || !formData.title) return;

    setIsSubmitting(true);

    try {
      const payload = {
        template_id: selectedTemplate.id,
        title: formData.title,
        custom_note: formData.custom_note,
        class_id: selectedClassId || null,
        students: selectedStudents,
      };

      const res = await fetch('/api/certificate-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        alert('Tạo chứng nhận thành công!');
        navigate('/teacher/certificates');
      } else {
        alert('Lỗi: ' + (data.error || 'Không thể tạo'));
      }
    } catch (error) {
      alert('Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tạo chứng nhận mới</h1>
        <button onClick={() => navigate(-1)} className="text-gray-600">
          ← Quay lại
        </button>
      </div>

      {/* Step Indicator */}
      <div className="flex justify-center gap-3 mb-10">
        {[1,2,3,4,5].map(step => (
          <div
            key={step}
            onClick={() => goToStep(step)}
            className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium cursor-pointer
              ${currentStep === step ? 'bg-blue-600 text-white' : currentStep > step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}
            `}
          >
            {step}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-8">
        {/* Bước 1: Chọn lớp */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Bước 1: Chọn lớp</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {classes.length > 0 ? classes.map(cls => (
                <div
                  key={cls.id}
                  onClick={() => handleClassSelect(cls.id)}
                  className={`p-6 border-2 rounded-2xl cursor-pointer ${selectedClassId === cls.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
                >
                  {cls.name}
                </div>
              )) : (
                <div onClick={() => handleClassSelect('demo-class')} className="p-6 border-2 rounded-2xl cursor-pointer border-blue-600 bg-blue-50">
                  Lớp 6A (Demo)
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bước 2: Chọn học sinh */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Bước 2: Chọn học sinh</h2>
            {studentsInClass.length > 0 ? (
              <div className="space-y-3">
                {studentsInClass.map(student => {
                  const isSelected = selectedStudents.some(s => s.student_id === student.student_id);
                  return (
                    <div
                      key={student.student_id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedStudents(selectedStudents.filter(s => s.student_id !== student.student_id));
                        } else {
                          setSelectedStudents([...selectedStudents, student]);
                        }
                      }}
                      className={`p-4 border rounded-2xl flex justify-between cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div>
                        <div className="font-medium">{student.student_name}</div>
                        <div className="text-sm text-gray-500">{student.student_score}</div>
                      </div>
                      <input type="checkbox" checked={isSelected} readOnly />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">Vui lòng chọn lớp ở bước trước.</p>
            )}
          </div>
        )}

        {/* Bước 3: Chọn template */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Bước 3: Chọn mẫu chứng nhận</h2>
            {loadingTemplates ? (
              <p>Đang tải template...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {templates.length > 0 ? templates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`border-2 rounded-2xl p-6 cursor-pointer ${selectedTemplate?.id === template.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
                  >
                    <div className="h-32 bg-gray-100 rounded-xl mb-4 flex items-center justify-center">
                      Preview
                    </div>
                    <p className="font-semibold text-center">{template.name}</p>
                  </div>
                )) : (
                  <p className="text-gray-500 col-span-3">Chưa có template nào. Vui lòng upload template trước.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bước 4 & 5 giữa nguyên */}
        {currentStep === 4 && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Bước 4: Tùy chỉnh</h2>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="Tiêu đề chứng nhận"
              className="w-full border rounded-2xl px-5 py-3.5 mb-4"
            />
            <textarea
              value={formData.custom_note}
              onChange={e => setFormData({ ...formData, custom_note: e.target.value })}
              placeholder="Lời nhận xét"
              className="w-full border rounded-2xl px-5 py-3.5 h-32"
            />
          </div>
        )}

        {currentStep === 5 && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Bước 5: Xác nhận</h2>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl text-lg font-semibold"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Tạo & Gửi chứng nhận'}
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <button onClick={() => goToStep(currentStep - 1)} disabled={currentStep === 1} className="px-8 py-3">
          ← Quay lại
        </button>
        {currentStep < 5 && (
          <button
            onClick={() => goToStep(currentStep + 1)}
            disabled={currentStep === 2 && selectedStudents.length === 0 || currentStep === 3 && !selectedTemplate}
            className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-semibold disabled:opacity-50"
          >
            Tiếp tục →
          </button>
        )}
      </div>
    </div>
  );
}
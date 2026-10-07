// src/pages/ExamsPage.tsx
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Examen } from '../types';
import { DataTable, Column } from '../components/Common/DataTable';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { useToast } from '../components/Common/Toast';

export const ExamsPage: React.FC = () => {
  const { showToast } = useToast();
  const [exams, setExams] = useState<Examen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Examen | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    coeficient: '',
  });

  const fetchExams = async () => {
    try {
      setLoading(true);
      const data = await apiService.getExams();
      setExams(data.examens || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل الامتحانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type || !formData.coeficient) {
      showToast('يرجى ملء جميع الحقول', 'error');
      return;
    }

    setSaving(true);
    try {
      const data = {
        type: formData.type,
        coeficient: parseInt(formData.coeficient),
      };

      if (editingExam) {
        await apiService.updateExam(editingExam.num, data);
        showToast('تم تحديث الامتحان بنجاح', 'success');
      } else {
        await apiService.createExam(data);
        showToast('تم إنشاء الامتحان بنجاح', 'success');
      }

      setShowModal(false);
      resetForm();
      fetchExams();
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ الامتحان', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (exam: Examen) => {
    setEditingExam(exam);
    setFormData({
      type: exam.type,
      coeficient: exam.coeficient.toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (num: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الامتحان؟')) return;
    try {
      await apiService.deleteExam(num);
      showToast('تم حذف الامتحان بنجاح', 'success');
      fetchExams();
    } catch (err: any) {
      showToast(err.message || 'فشل حذف الامتحان', 'error');
    }
  };

  const resetForm = () => {
    setFormData({ type: '', coeficient: '' });
    setEditingExam(null);
  };

  const columns: Column<Examen>[] = [
    { key: 'num', header: '#' },
    { key: 'type', header: 'النوع' },
    {
      key: 'coeficient',
      header: 'المعامل',
      render: (value) => (
        <span style={{ fontWeight: '600', color: '#2a6df4' }}>{value}</span>
      ),
    },
    {
      key: 'num',
      header: 'الإجراءات',
      render: (_, item) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-outline"
            style={{ padding: '4px 12px', fontSize: '12px' }}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(item);
            }}
          >
            <i className="fas fa-edit"></i>
          </button>
          <button
            className="btn-danger"
            style={{ padding: '4px 12px', fontSize: '12px' }}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.num);
            }}
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchExams} />;

  return (
    <div className="page-content">
      <header className="content-header">
        <h1>الامتحانات</h1>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <i className="fas fa-plus"></i> إنشاء امتحان
        </button>
      </header>

      <div className="card">
        {exams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <i className="fas fa-file-alt" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>لم يتم العثور على امتحانات. انقر "إنشاء امتحان" لإضافة واحد.</p>
          </div>
        ) : (
          <DataTable<Examen> columns={columns} data={exams} />
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExam ? 'تعديل الامتحان' : 'إنشاء امتحان جديد'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>نوع الامتحان *</label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="مثال: التكوين الأول، الديفور الثاني"
                  required
                />
              </div>

              <div className="form-group">
                <label>المعامل *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.coeficient}
                  onChange={(e) => setFormData({ ...formData, coeficient: e.target.value })}
                  placeholder="أدخل معامل الامتحان"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin"></i> جاري الحفظ...</>
                  ) : (
                    editingExam ? 'تحديث' : 'إنشاء'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

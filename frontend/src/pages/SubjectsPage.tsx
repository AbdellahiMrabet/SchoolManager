// src/pages/SubjectsPage.tsx
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Matiere } from '../types';
import { DataTable, Column } from '../components/Common/DataTable';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { useToast } from '../components/Common/Toast';

export const SubjectsPage: React.FC = () => {
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState<Matiere[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Matiere | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    language: '',
  });

  // Language options
  const languageOptions = [
    '',
    'العربية',
    'french',
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSubjects();
      setSubjects(response.matieres || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل المواد');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || formData.description.trim() === '') {
      showToast('يرجى إدخال وصف المادة', 'error');
      return;
    }

    setSaving(true);
    try {
      const data = {
        description: formData.description.trim(),
        language: formData.language,
      };

      if (editingSubject) {
        await apiService.updateSubject(editingSubject.identifient, data);
        showToast('تم تحديث المادة بنجاح', 'success');
      } else {
        await apiService.createSubject(data);
        showToast('تم إضافة المادة بنجاح', 'success');
      }
      
      setShowModal(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ المادة', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (subject: Matiere) => {
    setEditingSubject(subject);
    setFormData({
      description: subject.description,
      language: subject.language,
    });
    setShowModal(true);
  };

  const handleDelete = async (identifient: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المادة؟')) return;
    try {
      await apiService.deleteSubject(identifient);
      showToast('تم حذف المادة بنجاح', 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حذف المادة', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      language: '',
    });
    setEditingSubject(null);
  };

  const getLanguageBadge = (language: string) => {
    const colors: { [key: string]: string } = {
      'English': '#2a6df4',
      'French': '#f472b6',
      'Spanish': '#f59e0b',
      'German': '#10b981',
      'Italian': '#ef4444',
      'Portuguese': '#22d3ee',
      'Russian': '#8b5cf6',
      'Chinese': '#ef4444',
      'Japanese': '#f472b6',
      'Arabic': '#10b981',
      'Hindi': '#f59e0b',
      'Other': '#94a3b8'
    };
    
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '20px',
        backgroundColor: colors[language] || '#94a3b8',
        color: 'white',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {language}
      </span>
    );
  };

  const columns: Column<Matiere>[] = [
    { key: 'identifient', header: '#' },
    { key: 'description', header: 'اسم المادة' },
    { 
      key: 'language', 
      header: 'اللغة',
      render: (value) => getLanguageBadge(value)
    },
    {
      key: 'identifient',
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
              handleDelete(item.identifient);
            }}
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;

  return (
    <div className="page-content">
      <header className="content-header">
        <h1>المواد</h1>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <i className="fas fa-plus"></i> إضافة مادة
        </button>
      </header>

      <div className="card">
        {subjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <i className="fas fa-book" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>لم يتم العثور على مواد. انقر "إضافة مادة" لإنشاء واحدة.</p>
          </div>
        ) : (
          <DataTable<Matiere> columns={columns} data={subjects} />
        )}
      </div>

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSubject ? 'تعديل المادة' : 'إضافة مادة جديدة'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>وصف المادة *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="مثال: الرياضيات، الفيزيكية، اللغة الإنجليزية"
                  required
                  autoFocus
                />
                <small style={{ color: '#64748b', marginTop: '4px' }}>
                  أدخل اسم المادة الفريد
                </small>
              </div>

              <div className="form-group">
                <label>اللغة</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                >
                  {languageOptions.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#64748b', marginTop: '4px' }}>
                  اختر لغة التدريس لهذه المادة
                </small>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin"></i> جاري الحفظ...</>
                  ) : (
                    editingSubject ? 'تحديث' : 'إنشاء'
                  )} مادة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
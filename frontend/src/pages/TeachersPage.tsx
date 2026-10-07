// src/pages/TeachersPage.tsx
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Professeur, Matiere } from '../types';
import { DataTable, Column } from '../components/Common/DataTable';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { useToast } from '../components/Common/Toast';

export const TeachersPage: React.FC = () => {
  const { showToast } = useToast();
  const [teachers, setTeachers] = useState<Professeur[]>([]);
  const [subjects, setSubjects] = useState<Matiere[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Professeur | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    matiere_id: '' as string,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teachersRes, subjectsRes] = await Promise.all([
        apiService.getTeachers(),
        apiService.getSubjects()
      ]);
      setTeachers(teachersRes.professeurs || []);
      setSubjects(subjectsRes.matieres || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل المعلمين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom.trim() || !formData.prenom.trim() || !formData.email.trim()) {
      showToast('يرجى إدخال الاسم واللقب والبريد الإلكتروني', 'error');
      return;
    }

    setSaving(true);
    try {
      const data = {
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        email: formData.email.trim(),
        telephone: formData.telephone.trim() || undefined,
        matiere_id: formData.matiere_id ? parseInt(formData.matiere_id) : undefined,
      };

      if (editingTeacher) {
        await apiService.updateTeacher(editingTeacher.id, data);
        showToast('تم تحديث المعلم بنجاح', 'success');
      } else {
        await apiService.createTeacher(data);
        showToast('تم إضافة المعلم بنجاح', 'success');
      }
      
      setShowModal(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ المعلم', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (teacher: Professeur) => {
    setEditingTeacher(teacher);
    setFormData({
      nom: teacher.nom,
      prenom: teacher.prenom,
      email: teacher.email,
      telephone: teacher.telephone || '',
      matiere_id: teacher.matiere_id?.toString() || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المعلم؟')) return;
    try {
      await apiService.deleteTeacher(id);
      showToast('تم حذف المعلم بنجاح', 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حذف المعلم', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      matiere_id: '',
    });
    setEditingTeacher(null);
  };

  const columns: Column<Professeur>[] = [
    { key: 'id', header: '#' },
    { key: 'nom', header: 'الاسم' },
    { key: 'prenom', header: 'اللقب' },
    { key: 'email', header: 'البريد الإلكتروني' },
    { key: 'telephone', header: 'الهاتف' },
    { 
      key: 'matiere', 
      header: 'المادة',
      render: (value) => value || '-'
    },
    {
      key: 'id',
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
              handleDelete(item.id);
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
        <h1>المعلمون</h1>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <i className="fas fa-plus"></i> إضافة معلم
        </button>
      </header>

      <div className="card">
        {teachers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <i className="fas fa-chalkboard-teacher" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>لم يتم العثور على معلمين. انقر "إضافة معلم" لإنشاء واحد.</p>
          </div>
        ) : (
          <DataTable<Professeur> columns={columns} data={teachers} />
        )}
      </div>

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTeacher ? 'تعديل المعلم' : 'إضافة معلم جديد'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>الاسم *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="الاسم family"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>اللقب *</label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  placeholder="اللقب first name"
                  required
                />
              </div>

              <div className="form-group">
                <label>البريد الإلكتروني *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="teacher@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>الهاتف</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  placeholder="+222 XX-XX-XX-XX"
                />
              </div>

              <div className="form-group">
                <label>المادة</label>
                <select
                  value={formData.matiere_id}
                  onChange={(e) => setFormData({ ...formData, matiere_id: e.target.value })}
                >
                  <option value="">اختر المادة (اختياري)</option>
                  {subjects.map((subject) => (
                    <option key={subject.identifient} value={subject.identifient}>
                      {subject.description}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#64748b', marginTop: '4px' }}>
                  اختر المادة التي يدرسها هذا المعلم
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
                    editingTeacher ? 'تحديث' : 'إنشاء'
                  )} معلم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

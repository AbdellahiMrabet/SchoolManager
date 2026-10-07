// src/pages/CoefficientsPage.tsx
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Coefficient, Classe, Matiere, Niveau } from '../types';
import { DataTable, Column } from '../components/Common/DataTable';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { useToast } from '../components/Common/Toast';

export const CoefficientsPage: React.FC = () => {
  const { showToast } = useToast();
  const [coefficients, setCoefficients] = useState<Coefficient[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [subjects, setSubjects] = useState<Matiere[]>([]);
  const [levels, setLevels] = useState<Niveau[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCoefficient, setEditingCoefficient] = useState<Coefficient | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    mat_id: '',
    cl_id: '',
    valeur: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [coeffRes, classesRes, subjectsRes, levelsRes] = await Promise.all([
        apiService.getCoefficients(),
        apiService.getClasses(),
        apiService.getSubjects(),
        apiService.getLevels(),
      ]);
      
      setCoefficients(coeffRes.coefficients || []);
      setClasses(classesRes.classes || []);
      setSubjects(subjectsRes.matieres || []);
      setLevels(levelsRes.levels || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper functions to get names from IDs
  const getSubjectName = (id: number): string => {
    const subject = subjects.find(s => s.identifient === id);
    return subject?.description || `المادة ${id}`;
  };

  const getClassName = (id: number): string => {
    const cls = classes.find(c => c.id === id);
    if (cls) {
      return cls.abrev ? `${cls.label} (${cls.abrev})` : cls.label;
    }
    return `الفصل ${id}`;
  };

  const getLevelName = (id: number): string => {
    const level = levels.find(l => l.id === id);
    return level?.description || `المستوى ${id}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.mat_id || !formData.cl_id || !formData.valeur) {
      showToast('يرجى ملء جميع الحقول', 'error');
      return;
    }

    setSaving(true);
    try {
      const selectedClass = classes.find(c => c.id === parseInt(formData.cl_id));
      if (!selectedClass) {
        showToast('الفصل المحدد غير موجود', 'error');
        setSaving(false);
        return;
      }

      const data = {
        mat_id: parseInt(formData.mat_id),
        cl_id: parseInt(formData.cl_id),
        niv_id: selectedClass.niv_id,
        valeur: parseFloat(formData.valeur),
      };

      if (editingCoefficient) {
        await apiService.updateCoefficient(editingCoefficient.id, data);
        showToast('تم تحديث الضارب بنجاح', 'success');
      } else {
        await apiService.createCoefficient(data);
        showToast('تم إنشاء الضارب بنجاح', 'success');
      }
      
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ الضارب', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (coefficient: Coefficient) => {
    setEditingCoefficient(coefficient);
    setFormData({
      mat_id: coefficient.mat_id.toString(),
      cl_id: coefficient.cl_id.toString(),
      valeur: coefficient.valeur.toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الضارب؟')) return;
    try {
      await apiService.deleteCoefficient(id);
      showToast('تم حذف الضارب بنجاح', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حذف الضارب', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      mat_id: '',
      cl_id: '',
      valeur: '',
    });
    setEditingCoefficient(null);
  };

  // Updated columns with proper names instead of IDs
  const columns: Column<Coefficient>[] = [
    { key: 'id', header: '#' },
    {
      key: 'mat_id',
      header: 'المادة',
      render: (value, item) => getSubjectName(item.mat_id),
    },
    {
      key: 'cl_id',
      header: 'الفصل',
      render: (value, item) => getClassName(item.cl_id),
    },
    {
      key: 'niv_id',
      header: 'المستوى',
      render: (value, item) => getLevelName(item.niv_id),
    },
    { 
      key: 'valeur', 
      header: 'المعامل',
      render: (value) => (
        <span style={{ fontWeight: '600', color: '#2a6df4' }}>
          {value}
        </span>
      )
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
        <h1>الضوارب</h1>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <i className="fas fa-plus"></i> إضافة ضارب
        </button>
      </header>

      <div className="card">
        {coefficients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <i className="fas fa-calculator" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>لم يتم العثور على ضوارب. انقر "إضافة ضارب" لإنشاء واحد.</p>
          </div>
        ) : (
          <DataTable<Coefficient> columns={columns} data={coefficients} />
        )}
      </div>

      {/* Modal for Create/Edit - Level removed */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCoefficient ? 'تعديل الضارب' : 'إضافة ضارب جديد'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>المادة *</label>
                <select
                  value={formData.mat_id}
                  onChange={(e) => setFormData({ ...formData, mat_id: e.target.value })}
                  required
                >
                  <option value="">اختر المادة</option>
                  {subjects.map((subject) => (
                    <option key={subject.identifient} value={subject.identifient}>
                      {subject.description}
                    </option>
                  ))}
                </select>
                {subjects.length === 0 && (
                  <small style={{ color: '#b34033' }}>
                    ⚠️ لا توجد مواد متاحة. يرجى إضافة مواد أولاً.
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>الفصل *</label>
                <select
                  value={formData.cl_id}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      cl_id: e.target.value,
                    });
                  }}
                  required
                >
                  <option value="">اختر الفصل</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.label}{cls.abrev ? ` (${cls.abrev})` : ''}
                      {cls.niveau?.description ? ` - ${cls.niveau.description}` : ''}
                    </option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <small style={{ color: '#b34033' }}>
                    ⚠️ لا توجد فصول متاحة. يرجى إضافة فصول أولاً.
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>قيمة المعامل *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.valeur}
                  onChange={(e) => setFormData({ ...formData, valeur: e.target.value })}
                  placeholder="أدخل قيمة المعامل (مثال: 2.5)"
                  required
                />
              </div>

              {/* Show selected info preview with auto-detected level */}
              {formData.mat_id && formData.cl_id && (
                <div style={{ 
                  padding: '12px 16px', 
                  background: '#f0fdf4', 
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0',
                  fontSize: '14px',
                  color: '#166534'
                }}>
                  <i className="fas fa-check-circle"></i>
                  <strong> معاينة:</strong>
                  <span style={{ marginLeft: '8px' }}>
                    {getSubjectName(parseInt(formData.mat_id))} - 
                    {getClassName(parseInt(formData.cl_id))}
                    {(() => {
                      const cls = classes.find(c => c.id === parseInt(formData.cl_id));
                      return cls?.niv_id ? ` (المستوى: ${getLevelName(cls.niv_id)})` : '';
                    })()}
                  </span>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin"></i> جاري الحفظ...</>
                  ) : (
                    editingCoefficient ? 'تحديث' : 'إنشاء'
                  )} ضارب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
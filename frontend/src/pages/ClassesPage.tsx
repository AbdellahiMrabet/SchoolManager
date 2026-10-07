// src/pages/ClassesPage.tsx
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Classe, Niveau } from '../types';
import { DataTable, Column } from '../components/Common/DataTable';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { useToast } from '../components/Common/Toast';

export const ClassesPage: React.FC = () => {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<Classe[]>([]);
  const [levels, setLevels] = useState<Niveau[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Classe | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    abrev: '',
    fil: '',
    nb_mx_el: '',
    niv_id: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, levelsRes] = await Promise.all([
        apiService.getClasses(),
        apiService.getLevels(),
      ]);
      setClasses(classesRes.classes || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        label: formData.label,
        abrev: formData.abrev || null,
        fil: formData.fil,
        nb_mx_el: parseInt(formData.nb_mx_el),
        niv_id: parseInt(formData.niv_id),
      };

      if (editingClass) {
        await apiService.updateClass(editingClass.id, data);
        showToast('تم تحديث الفصل بنجاح', 'success');
      } else {
        await apiService.createClass(data);
        showToast('تم إنشاء الفصل بنجاح', 'success');
      }
      
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ الفصل', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cls: Classe) => {
    setEditingClass(cls);
    setFormData({
      label: cls.label,
      abrev: cls.abrev || '',
      fil: cls.fil,
      nb_mx_el: cls.nb_mx_el.toString(),
      niv_id: cls.niv_id.toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الفصل؟')) return;
    try {
      await apiService.deleteClass(id);
      showToast('تم حذف الفصل بنجاح', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حذف الفصل', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      abrev: '',
      fil: '',
      nb_mx_el: '',
      niv_id: '',
    });
    setEditingClass(null);
  };

  const columns: Column<Classe>[] = [
    { key: 'id', header: '#' },
    { key: 'label', header: 'الاسم' },
    { key: 'abrev', header: 'الاختصار' },
    { 
      key: 'niv_id', 
      header: 'المستوى',
      render: (value, item) => {
        const level = levels.find(l => l.id === item.niv_id);
        return level?.description || value;
      }
    },
    { key: 'fil', header: 'الشعبة' },
    { key: 'nb_mx_el', header: 'الحد الأقصى للطلاب' },
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
        <h1>الفصول</h1>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <i className="fas fa-plus"></i> إنشاء فصل
        </button>
      </header>

      <div className="card">
        {classes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <i className="fas fa-building-columns" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>لم يتم العثور على فصول. انقر "إنشاء فصل" لإضافة واحد.</p>
          </div>
        ) : (
          <DataTable<Classe> columns={columns} data={classes} />
        )}
      </div>

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingClass ? 'تعديل الفصل' : 'إنشاء فصل جديد'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>اسم الفصل *</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="مثال: 10أ، 9ب، إلخ"
                  required
                />
              </div>

              <div className="form-group">
                <label>الاختصار</label>
                <input
                  type="text"
                  value={formData.abrev}
                  onChange={(e) => setFormData({ ...formData, abrev: e.target.value })}
                  placeholder="مثال: 10أ، 9ب"
                />
              </div>

              <div className="form-group">
                <label>المستوى *</label>
                <select
                  value={formData.niv_id}
                  onChange={(e) => setFormData({ ...formData, niv_id: e.target.value })}
                  required
                >
                  <option value="">اختر المستوى</option>
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>الحد الأقصى للطلاب *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.nb_mx_el}
                  onChange={(e) => setFormData({ ...formData, nb_mx_el: e.target.value })}
                  placeholder="مثال: 30"
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
                    editingClass ? 'تحديث' : 'إنشاء'
                  )} فصل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
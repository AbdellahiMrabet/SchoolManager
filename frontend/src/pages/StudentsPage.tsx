// src/pages/StudentsPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiService } from '../services/api';
import { Eleve, Classe } from '../types';
import { DataTable, Column } from '../components/Common/DataTable';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { useToast } from '../components/Common/Toast';
import { SearchableSelect } from '../components/Common/SearchableSelect';

export const StudentsPage: React.FC = () => {
  const location = useLocation();
  const { showToast } = useToast();
  const [students, setStudents] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Eleve | null>(null);
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importClsId, setImportClsId] = useState('');
  const [importDateEntree, setImportDateEntree] = useState('');
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<'text' | 'excel'>('text');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    nom: '',
    residence: '',
    tel: '',
    nom_tut: '',
    date_entre: '',
    date_sortie: '',
    cls_id: '',
    etat: '1',
  });

  // Check URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') {
      resetForm();
      setShowModal(true);
      window.history.replaceState({}, '', '/students');
    }
  }, [location]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsRes, classesRes] = await Promise.all([
        apiService.getStudents(),
        apiService.getClasses(),
      ]);
      setStudents(studentsRes.eleves || []);
      setClasses(classesRes.classes || []);
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

  // Helper function to get class display name with abbreviation
  const getClassDisplay = (clsId: number): string => {
    const cls = classes.find(c => c.id === clsId);
    if (cls) {
      return cls.abrev ? `${cls.label} (${cls.abrev})` : cls.label;
    }
    return `الصف ${clsId}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom || !formData.residence || !formData.tel || 
        !formData.nom_tut || !formData.date_entre || !formData.cls_id) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    setSaving(true);
    try {
      const data = {
        nom: formData.nom,
        residence: formData.residence,
        tel: formData.tel,
        nom_tut: formData.nom_tut,
        date_entre: formData.date_entre,
        date_sortie: formData.date_sortie,
        cls_id: parseInt(formData.cls_id),
        etat: parseInt(formData.etat),
      };

      if (editingStudent) {
        await apiService.updateStudent(editingStudent.numero, data);
        showToast('تم تحديث الطالب بنجاح', 'success');
      } else {
        await apiService.createStudent(data);
        showToast('تم إضافة الطالب بنجاح', 'success');
      }
      
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ الطالب', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (student: Eleve) => {
    setEditingStudent(student);
    setFormData({
      nom: student.nom,
      residence: student.residence,
      tel: student.tel,
      nom_tut: student.nom_tut,
      date_entre: student.date_entre,
      date_sortie: student.date_sortie,
      cls_id: student.cls_id.toString(),
      etat: student.etat?.toString() || '1',
    });
    setShowModal(true);
  };

  const handleDelete = async (numero: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;
    try {
      await apiService.deleteStudent(numero);
      showToast('تم حذف الطالب بنجاح', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حذف الطالب', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      residence: '',
      tel: '',
      nom_tut: '',
    date_entre: new Date().toISOString().split('T')[0],
      date_sortie: '',
      cls_id: '',
      etat: '1',
    });
    setEditingStudent(null);
  };

  const handleImport = async () => {
    if (!importClsId) {
      showToast('يرجى اختيار الفصل', 'error');
      return;
    }

    if (importMode === 'excel') {
      await handleImportExcel();
      return;
    }

    if (!importText.trim()) {
      showToast('يرجى إدخال بيانات الطلاب', 'error');
      return;
    }

    const lines = importText.trim().split('\n').filter(l => l.trim());
    const students = lines.map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        nom: parts[0] || '',
        tel: parts[1] || '',
        nom_tut: parts[2] || '',
        residence: parts[3] || '',
      };
    });

    setImporting(true);
    try {
      const res: any = await apiService.importStudents(
        parseInt(importClsId),
        importDateEntree || new Date().toISOString().split('T')[0],
        students
      );
      showToast(res.message || 'تم الاستيراد بنجاح', 'success');
      if (res.errors?.length > 0) {
        showToast(`${res.errors.length} صفوف تم تخطيها`, 'error');
      }
      setShowImportModal(false);
      setImportText('');
      setImportClsId('');
      setImportFile(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل الاستيراد', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleImportExcel = async () => {
    if (!importClsId) {
      showToast('يرجى اختيار الفصل', 'error');
      return;
    }
    if (!importFile) {
      showToast('يرجى اختيار ملف Excel', 'error');
      return;
    }

    setImporting(true);
    try {
      const res = await apiService.importStudentsExcel(
        parseInt(importClsId),
        importDateEntree || new Date().toISOString().split('T')[0],
        importFile
      );
      showToast(res.message || 'تم الاستيراد بنجاح', 'success');
      if (res.errors?.length > 0) {
        showToast(`${res.errors.length} صفوف تم تخطيها`, 'error');
      }
      setShowImportModal(false);
      setImportFile(null);
      setImportClsId('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل الاستيراد', 'error');
    } finally {
      setImporting(false);
    }
  };

  const columns: Column<Eleve>[] = [
    { key: 'numero', header: '#' },
    { key: 'nom', header: 'الاسم' },
    { key: 'residence', header: 'الإقامة' },
    { key: 'tel', header: 'الهاتف' },
    { 
      key: 'cls_id', 
      header: 'الفصل',
      render: (value, item) => getClassDisplay(item.cls_id),
    },
    { 
      key: 'etat', 
      header: 'الحالة',
      render: (value) => {
        const status = value === 1 ? 'نشط' : value === 0 ? 'غير نشط' : 'غير معروف';
        const className = value === 0 ? 'status-badge absent' : 'status-badge';
        return <span className={className}>{status}</span>;
      }
    },
    {
      key: 'numero',
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
              handleDelete(item.numero);
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

  const filteredStudents = searchQuery
    ? students.filter(s =>
        s.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.tel.includes(searchQuery) ||
        (s.nom_tut && s.nom_tut.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : students;

  return (
    <div className="page-content">
      <header className="content-header">
        <h1>الطلاب</h1>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <i className="fas fa-plus"></i> إضافة طالب
        </button>
        <button
          className="btn-outline"
          onClick={() => setShowImportModal(true)}
          style={{ marginLeft: '8px' }}
        >
          <i className="fas fa-file-import"></i> استيراد طلاب
        </button>
      </header>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="بحث عن طالب..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      </div>

      <div className="card">
        {filteredStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <i className="fas fa-user-graduate" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>{searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لم يتم العثور على طلاب. انقر "إضافة طالب" لإنشاء واحد.'}</p>
          </div>
        ) : (
          <DataTable<Eleve> columns={columns} data={filteredStudents} />
        )}
      </div>

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingStudent ? 'تعديل الطالب' : 'إضافة طالب جديد'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>الاسم الكامل *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="أدخل اسم الطالب"
                  required
                />
              </div>

              <div className="form-group">
                <label>الإقامة *</label>
                <input
                  type="text"
                  value={formData.residence}
                  onChange={(e) => setFormData({ ...formData, residence: e.target.value })}
                  placeholder="أدخل العنوان"
                  required
                />
              </div>

              <div className="form-group">
                <label>رقم الهاتف *</label>
                <input
                  type="tel"
                  value={formData.tel}
                  onChange={(e) => setFormData({ ...formData, tel: e.target.value })}
                  placeholder="أدخل رقم الهاتف"
                  required
                />
              </div>

              <div className="form-group">
                <label>اسم الولي *</label>
                <input
                  type="text"
                  value={formData.nom_tut}
                  onChange={(e) => setFormData({ ...formData, nom_tut: e.target.value })}
                  placeholder="أدخل اسم الولي"
                  required
                />
              </div>

              <div className="form-group">
                <label>الفصل *</label>
                <SearchableSelect
                  value={formData.cls_id}
                  onChange={(value) => setFormData({ ...formData, cls_id: value })}
                  options={classes.map(cls => ({
                    value: cls.id.toString(),
                    label: `${cls.label}${cls.abrev ? ` (${cls.abrev})` : ''}${cls.niveau?.description ? ` - ${cls.niveau.description}` : ''}`,
                  }))}
                  placeholder="اختر الفصل"
                  isClearable={false}
                  noOptionsMessage="لا توجد فصول متاحة"
                />
                {classes.length === 0 && (
                  <small style={{ color: '#b34033' }}>
                    ⚠️ لا توجد فصول متاحة. يرجى إضافة فصول أولاً.
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>تاريخ الدخول *</label>
                <input
                  type="date"
                  value={formData.date_entre}
                  onChange={(e) => setFormData({ ...formData, date_entre: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>الحالة</label>
                <select
                  value={formData.etat}
                  onChange={(e) => setFormData({ ...formData, etat: e.target.value })}
                >
                  <option value="1">نشط</option>
                  <option value="0">غير نشط</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin"></i> جاري الحفظ...</>
                  ) : (
                    editingStudent ? 'تحديث' : 'إنشاء'
                  )} طالب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>استيراد طلاب</h2>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>الفصل *</label>
                <select value={importClsId} onChange={e => setImportClsId(e.target.value)} required>
                  <option value="">اختر الفصل</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.label}{cls.abrev ? ` (${cls.abrev})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>تاريخ الدخول</label>
                <input
                  type="date"
                  value={importDateEntree}
                  onChange={e => setImportDateEntree(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>طريقة الاستيراد</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className={importMode === 'text' ? 'btn-primary' : 'btn-outline'}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setImportMode('text')}
                  >
                    <i className="fas fa-paste"></i> نص
                  </button>
                  <button
                    type="button"
                    className={importMode === 'excel' ? 'btn-primary' : 'btn-outline'}
                    style={{ flex: 1, padding: '8px' }}
                    onClick={() => setImportMode('excel')}
                  >
                    <i className="fas fa-file-excel"></i> ملف Excel
                  </button>
                </div>
              </div>

              {importMode === 'text' ? (
                <>
                  <div className="form-group">
                    <label>بيانات الطلاب (سطر واحد لكل طالب)</label>
                    <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 8px' }}>
                      الصيغة: الاسم, رقم الهاتف, اسم الولي, الإقامة
                    </p>
                    <textarea
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      placeholder="أدخل بيانات الطلاب هنا..."
                      rows={10}
                      style={{ width: '100%', fontFamily: 'monospace', direction: 'rtl' }}
                    />
                  </div>

                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                    {importText.trim().split('\n').filter(l => l.trim()).length} طالب سيتم استيرادهم
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label>ملف Excel</label>
                  <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 8px' }}>
                    العمود الأول: الرقم، العمود الثاني: اسم الطالب
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={e => setImportFile(e.target.files?.[0] || null)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  {importFile && (
                    <div style={{ fontSize: '12px', color: '#4ade80', marginTop: '8px' }}>
                      <i className="fas fa-check-circle"></i> {importFile.name}
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowImportModal(false)}>
                  إلغاء
                </button>
                <button className="btn-primary" onClick={handleImport} disabled={importing}>
                  {importing ? (
                    <><i className="fas fa-spinner fa-spin"></i> جاري الاستيراد...</>
                  ) : (
                    <><i className="fas fa-file-import"></i> استيراد</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
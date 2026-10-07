// src/pages/ExpensesPage.tsx
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Depense, DepenseStats } from '../types';
import { DataTable, Column } from '../components/Common/DataTable';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { useToast } from '../components/Common/Toast';

const CATEGORIES = [
  'أدوات مكتبية',
  'صيانة',
  'كهرباء',
  'ماء',
  'تأمين',
  'إيجار',
  'مواصلات',
  'طعام',
  'طباعة',
  'أخرى',
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'نقدي' },
  { value: 'transfer', label: 'تحويل بنكي' },
  { value: 'check', label: 'شيك' },
  { value: 'mobile', label: 'دفع إلكتروني' },
];

export const ExpensesPage: React.FC = () => {
  const { showToast } = useToast();
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [stats, setStats] = useState<DepenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDepense, setEditingDepense] = useState<Depense | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');

  const [formData, setFormData] = useState({
    categorie: CATEGORIES[0],
    montant: '',
    date_depense: new Date().toISOString().split('T')[0],
    description: '',
    beneficiaire: '',
    methode_paiement: 'cash',
    reference: '',
    observations: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [depensesRes, statsRes] = await Promise.all([
        apiService.getDepenses({
          categorie: filterCategorie || undefined,
          date_debut: filterDateDebut || undefined,
          date_fin: filterDateFin || undefined,
        }),
        apiService.getDepensesStats({
          categorie: filterCategorie || undefined,
          date_debut: filterDateDebut || undefined,
          date_fin: filterDateFin || undefined,
        }),
      ]);
      setDepenses(depensesRes.depenses || []);
      setStats(statsRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات المصروفات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterCategorie, filterDateDebut, filterDateFin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categorie || !formData.montant || !formData.date_depense) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    setSaving(true);
    try {
      const data = {
        categorie: formData.categorie,
        montant: parseFloat(formData.montant),
        date_depense: formData.date_depense,
        description: formData.description || undefined,
        beneficiaire: formData.beneficiaire || undefined,
        methode_paiement: formData.methode_paiement || undefined,
        reference: formData.reference || undefined,
        observations: formData.observations || undefined,
      };

      if (editingDepense) {
        await apiService.updateDepense(editingDepense.id, data);
        showToast('تم تحديث المصروف بنجاح', 'success');
      } else {
        await apiService.createDepense(data);
        showToast('تم تسجيل المصروف بنجاح', 'success');
      }

      setShowModal(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ بيانات المصروف', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (depense: Depense) => {
    setEditingDepense(depense);
    setFormData({
      categorie: depense.categorie,
      montant: depense.montant.toString(),
      date_depense: depense.date_depense,
      description: depense.description || '',
      beneficiaire: depense.beneficiaire || '',
      methode_paiement: depense.methode_paiement || 'cash',
      reference: depense.reference || '',
      observations: depense.observations || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    try {
      await apiService.deleteDepense(id);
      showToast('تم حذف المصروف بنجاح', 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حذف المصروف', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      categorie: CATEGORIES[0],
      montant: '',
      date_depense: new Date().toISOString().split('T')[0],
      description: '',
      beneficiaire: '',
      methode_paiement: 'cash',
      reference: '',
      observations: '',
    });
    setEditingDepense(null);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-MA', { style: 'decimal' }).format(amount);
  };

  const columns: Column<Depense>[] = [
    { key: 'id', header: '#' },
    { key: 'categorie', header: 'الفئة' },
    {
      key: 'montant',
      header: 'المبلغ',
      render: (value) => (
        <span style={{ color: '#dc2626', fontWeight: 600 }}>
          -{formatAmount(value)} MRU
        </span>
      )
    },
    { key: 'date_depense', header: 'التاريخ' },
    {
      key: 'description',
      header: 'الوصف',
      render: (value) => value || '-'
    },
    {
      key: 'beneficiaire',
      header: 'المستفيد',
      render: (value) => value || '-'
    },
    {
      key: 'methode_paiement',
      header: 'طريقة الدفع',
      render: (value) => {
        const labels: { [key: string]: string } = {
          cash: 'نقدي',
          transfer: 'تحويل بنكي',
          check: 'شيك',
          mobile: 'دفع إلكتروني',
        };
        return labels[value] || value || '-';
      }
    },
    {
      key: 'id',
      header: 'الإجراءات',
      render: (_, item) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="btn-outline"
            style={{ padding: '4px 10px', fontSize: '11px' }}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(item);
            }}
          >
            <i className="fas fa-edit"></i>
          </button>
          <button
            className="btn-danger"
            style={{ padding: '4px 10px', fontSize: '11px' }}
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
        <h1>المصروفات</h1>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <i className="fas fa-plus"></i> إضافة مصروف
        </button>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>
              {formatAmount(stats.total_depenses)} MRU
            </div>
            <div style={{ color: '#64748b', fontSize: '14px' }}>إجمالي المصروفات</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb' }}>
              {stats.nombre}
            </div>
            <div style={{ color: '#64748b', fontSize: '14px' }}>عدد المصروفات</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#ca8a04' }}>
              {formatAmount(stats.moyenne)} MRU
            </div>
            <div style={{ color: '#64748b', fontSize: '14px' }}>المتوسط</div>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {stats && stats.categories.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '14px', color: '#64748b' }}>توزيع المصروفات حسب الفئة</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {stats.categories.map((cat) => (
              <div key={cat.categorie} style={{
                padding: '8px 16px',
                background: '#f1f5f9',
                borderRadius: '8px',
                fontSize: '13px',
              }}>
                <strong>{cat.categorie}</strong>: {formatAmount(cat.montant)} MRU ({cat.nombre})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>الفئة</label>
            <select
              value={filterCategorie}
              onChange={(e) => setFilterCategorie(e.target.value)}
            >
              <option value="">جميع الفئات</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>من تاريخ</label>
            <input
              type="date"
              value={filterDateDebut}
              onChange={(e) => setFilterDateDebut(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>إلى تاريخ</label>
            <input
              type="date"
              value={filterDateFin}
              onChange={(e) => setFilterDateFin(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card">
        {depenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <i className="fas fa-receipt" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>لم يتم العثور على مصروفات. انقر "إضافة مصروف" لإنشاء واحد.</p>
          </div>
        ) : (
          <DataTable<Depense> columns={columns} data={depenses} />
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingDepense ? 'تعديل المصروف' : 'إضافة مصروف جديد'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>الفئة *</label>
                  <select
                    value={formData.categorie}
                    onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                    required
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>المبلغ (MRU) *</label>
                  <input
                    type="number"
                    value={formData.montant}
                    onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>التاريخ *</label>
                <input
                  type="date"
                  value={formData.date_depense}
                  onChange={(e) => setFormData({ ...formData, date_depense: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>الوصف</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف المصروف..."
                />
              </div>

              <div className="form-group">
                <label>المستفيد</label>
                <input
                  type="text"
                  value={formData.beneficiaire}
                  onChange={(e) => setFormData({ ...formData, beneficiaire: e.target.value })}
                  placeholder="اسم المستفيد أو المورّد..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>طريقة الدفع</label>
                  <select
                    value={formData.methode_paiement}
                    onChange={(e) => setFormData({ ...formData, methode_paiement: e.target.value })}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>المرجع</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="رقم الإيصال أو التحويل..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>ملاحظات</label>
                <textarea
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="ملاحظات إضافية..."
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin"></i> جاري الحفظ...</>
                  ) : (
                    editingDepense ? 'تحديث' : 'تسجيل المصروف'
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

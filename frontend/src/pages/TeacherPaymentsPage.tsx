// src/pages/TeacherPaymentsPage.tsx
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { SalaireProfesseur, Professeur, SalaireProfesseurStats } from '../types';
import { DataTable, Column } from '../components/Common/DataTable';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { useToast } from '../components/Common/Toast';

const MONTH_NAMES: { [key: number]: string } = {
  1: 'جانفي', 2: 'فيفري', 3: 'مارس', 4: 'أفريل',
  5: 'ماي', 6: 'جوان', 7: 'جويلية', 8: 'أوت',
  9: 'سبتمبر', 10: 'أكتوبر', 11: 'نوفمبر', 12: 'ديسمبر'
};

export const TeacherPaymentsPage: React.FC = () => {
  const { showToast } = useToast();
  const [salaires, setSalaires] = useState<SalaireProfesseur[]>([]);
  const [teachers, setTeachers] = useState<Professeur[]>([]);
  const [stats, setStats] = useState<SalaireProfesseurStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingSalaire, setEditingSalaire] = useState<SalaireProfesseur | null>(null);
  const [selectedSalaire, setSelectedSalaire] = useState<SalaireProfesseur | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterAnnee, setFilterAnnee] = useState(new Date().getFullYear());
  const [filterStatut, setFilterStatut] = useState('');

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const paymentMethods = [
    { value: 'cash', label: 'نقدي' },
    { value: 'transfer', label: 'تحويل بنكي' },
    { value: 'check', label: 'شيك' },
    { value: 'mobile', label: 'دفع إلكتروني' },
  ];

  const [formData, setFormData] = useState({
    professeur_id: '',
    mois: new Date().getMonth() + 1,
    annee: currentYear,
    montant_total: '',
    date_paiement: new Date().toISOString().split('T')[0],
    observations: '',
  });

  const [paymentData, setPaymentData] = useState({
    montant: '',
    date_paiement: new Date().toISOString().split('T')[0],
    methode_paiement: 'cash',
    reference: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salairesRes, teachersRes, statsRes] = await Promise.all([
        apiService.getSalairesProfesseurs({
          annee: filterAnnee,
          statut: filterStatut || undefined,
        }),
        apiService.getTeachers(),
        apiService.getSalairesProfesseurStats({
          annee: filterAnnee,
        }),
      ]);
      setSalaires(salairesRes.salaires || []);
      setTeachers(teachersRes.professeurs || []);
      setStats(statsRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات الرواتب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterAnnee, filterStatut]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.professeur_id || !formData.montant_total) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    setSaving(true);
    try {
      const data = {
        professeur_id: parseInt(formData.professeur_id),
        mois: formData.mois,
        annee: formData.annee,
        montant_total: parseFloat(formData.montant_total),
        date_paiement: formData.date_paiement,
        observations: formData.observations || undefined,
      };

      if (editingSalaire) {
        await apiService.updateSalaireProfesseur(editingSalaire.id, data);
        showToast('تم تحديث راتب الأستاذ بنجاح', 'success');
      } else {
        await apiService.createSalaireProfesseur(data);
        showToast('تم إضافة راتب الأستاذ بنجاح', 'success');
      }

      setShowModal(false);
      resetForm();
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ بيانات الراتب', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSalaire || !paymentData.montant) {
      showToast('يرجى إدخال مبلغ الدفع', 'error');
      return;
    }

    setSaving(true);
    try {
      await apiService.addPaiementSalaire(selectedSalaire.id, {
        montant: parseFloat(paymentData.montant),
        date_paiement: paymentData.date_paiement,
        methode_paiement: paymentData.methode_paiement,
        reference: paymentData.reference || undefined,
      });
      showToast('تم تسجيل الدفع بنجاح', 'success');
      setShowPaymentModal(false);
      setSelectedSalaire(null);
      resetPaymentForm();
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل تسجيل الدفع', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (salaire: SalaireProfesseur) => {
    setEditingSalaire(salaire);
    setFormData({
      professeur_id: salaire.professeur_id.toString(),
      mois: salaire.mois,
      annee: salaire.annee,
      montant_total: salaire.montant_total.toString(),
      date_paiement: salaire.date_paiement || new Date().toISOString().split('T')[0],
      observations: salaire.observations || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف سجل الراتب؟')) return;
    try {
      await apiService.deleteSalaireProfesseur(id);
      showToast('تم حذف سجل الراتب بنجاح', 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حذف سجل الراتب', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      professeur_id: '',
      mois: new Date().getMonth() + 1,
      annee: currentYear,
      montant_total: '',
      date_paiement: new Date().toISOString().split('T')[0],
      observations: '',
    });
    setEditingSalaire(null);
  };

  const resetPaymentForm = () => {
    setPaymentData({
      montant: '',
      date_paiement: new Date().toISOString().split('T')[0],
      methode_paiement: 'cash',
      reference: '',
    });
  };

  const getStatusBadge = (statut: string) => {
    const styles: { [key: string]: React.CSSProperties } = {
      paye: { background: '#dcfce7', color: '#166534' },
      partiel: { background: '#fef9c3', color: '#854d0e' },
      non_paye: { background: '#fee2e2', color: '#991b1b' },
    };
    const labels: { [key: string]: string } = {
      paye: 'مدفوع',
      partiel: 'جزئي',
      non_paye: 'غير مدفوع',
    };
    return (
      <span style={{
        ...styles[statut],
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
      }}>
        {labels[statut] || statut}
      </span>
    );
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-MA', { style: 'decimal' }).format(amount);
  };

  const columns: Column<SalaireProfesseur>[] = [
    { key: 'id', header: '#' },
    {
      key: 'professeur_nom',
      header: 'الأستاذ',
      render: (value) => value || '-'
    },
    {
      key: 'mois',
      header: 'الشهر',
      render: (value) => MONTH_NAMES[value] || value
    },
    { key: 'annee', header: 'السنة' },
    {
      key: 'montant_total',
      header: 'المبلغ الإجمالي',
      render: (value) => `${formatAmount(value)} MRU`
    },
    {
      key: 'montant_paye',
      header: 'المبلغ المدفوع',
      render: (value) => `${formatAmount(value)} MRU`
    },
    {
      key: 'restant',
      header: 'المتبقي',
      render: (value) => (
        <span style={{ color: value > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
          {formatAmount(value || 0)} MRU
        </span>
      )
    },
    {
      key: 'statut',
      header: 'الحالة',
      render: (value) => getStatusBadge(value)
    },
    {
      key: 'id',
      header: 'الإجراءات',
      render: (_, item) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          {item.statut !== 'paye' && (
            <button
              className="btn-success"
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSalaire(item);
                setPaymentData({
                  ...paymentData,
                  montant: item.restant?.toString() || '',
                });
                setShowPaymentModal(true);
              }}
            >
              <i className="fas fa-money-bill-wave"></i>
            </button>
          )}
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
        <h1>رواتب المعلمين</h1>
        <button
          className="btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <i className="fas fa-plus"></i> إضافة راتب
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
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#2563eb' }}>
              {stats.total}
            </div>
            <div style={{ color: '#64748b', fontSize: '14px' }}>إجمالي السجلات</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#16a34a' }}>
              {formatAmount(stats.montant_paye)} MRU
            </div>
            <div style={{ color: '#64748b', fontSize: '14px' }}>المبلغ المدفوع</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>
              {formatAmount(stats.montant_restant)} MRU
            </div>
            <div style={{ color: '#64748b', fontSize: '14px' }}>المبلغ المتبقي</div>
          </div>
          <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '14px' }}>
              <span style={{ color: '#16a34a' }}>{stats.payes} مدفوع</span>
              <span style={{ color: '#ca8a04' }}>{stats.partiels} جزئي</span>
              <span style={{ color: '#dc2626' }}>{stats.non_payes} غير مدفوع</span>
            </div>
            <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>توزيع الحالات</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>السنة</label>
            <select
              value={filterAnnee}
              onChange={(e) => setFilterAnnee(parseInt(e.target.value))}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>الحالة</label>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
            >
              <option value="">جميع الحالات</option>
              <option value="paye">مدفوع</option>
              <option value="partiel">جزئي</option>
              <option value="non_paye">غير مدفوع</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card">
        {salaires.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <i className="fas fa-money-check-alt" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>لم يتم العثور على سجلات رواتب. انقر "إضافة راتب" لإنشاء واحدة.</p>
          </div>
        ) : (
          <DataTable<SalaireProfesseur> columns={columns} data={salaires} />
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSalaire ? 'تعديل راتب الأستاذ' : 'إضافة راتب جديد'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>الأستاذ *</label>
                <select
                  value={formData.professeur_id}
                  onChange={(e) => setFormData({ ...formData, professeur_id: e.target.value })}
                  required
                  disabled={!!editingSalaire}
                >
                  <option value="">اختر الأستاذ</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.nom} {teacher.prenom}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>الشهر *</label>
                  <select
                    value={formData.mois}
                    onChange={(e) => setFormData({ ...formData, mois: parseInt(e.target.value) })}
                    required
                    disabled={!!editingSalaire}
                  >
                    {Object.entries(MONTH_NAMES).map(([key, name]) => (
                      <option key={key} value={key}>{name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>السنة *</label>
                  <select
                    value={formData.annee}
                    onChange={(e) => setFormData({ ...formData, annee: parseInt(e.target.value) })}
                    required
                    disabled={!!editingSalaire}
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>المبلغ الإجمالي (MRU) *</label>
                <input
                  type="number"
                  value={formData.montant_total}
                  onChange={(e) => setFormData({ ...formData, montant_total: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
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
                    editingSalaire ? 'تحديث' : 'إنشاء'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedSalaire && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>دفع راتب الأستاذ</h2>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ padding: '0 24px', marginBottom: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: '#64748b' }}>الأستاذ: <strong>{selectedSalaire.professeur_nom}</strong></div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>الفترة: <strong>{MONTH_NAMES[selectedSalaire.mois]} {selectedSalaire.annee}</strong></div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>المبلغ الإجمالي: <strong>{formatAmount(selectedSalaire.montant_total)} MRU</strong></div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>المدفوع: <strong>{formatAmount(selectedSalaire.montant_paye)} MRU</strong></div>
                <div style={{ fontSize: '16px', color: '#dc2626', fontWeight: '700' }}>المتبقي: {formatAmount(selectedSalaire.restant || 0)} MRU</div>
              </div>
            </div>
            <form onSubmit={handlePayment} className="modal-form">
              <div className="form-group">
                <label>مبلغ الدفع (MRU) *</label>
                <input
                  type="number"
                  value={paymentData.montant}
                  onChange={(e) => setPaymentData({ ...paymentData, montant: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  max={selectedSalaire.restant || 0}
                  step="0.01"
                  required
                />
                <small style={{ color: '#64748b' }}>الحد الأقصى: {formatAmount(selectedSalaire.restant || 0)} MRU</small>
              </div>

              <div className="form-group">
                <label>تاريخ الدفع *</label>
                <input
                  type="date"
                  value={paymentData.date_paiement}
                  onChange={(e) => setPaymentData({ ...paymentData, date_paiement: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>طريقة الدفع</label>
                <select
                  value={paymentData.methode_paiement}
                  onChange={(e) => setPaymentData({ ...paymentData, methode_paiement: e.target.value })}
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>المرجع</label>
                <input
                  type="text"
                  value={paymentData.reference}
                  onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                  placeholder="رقم الشيك أو رقم التحويل..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowPaymentModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin"></i> جاري الحفظ...</>
                  ) : (
                    'تسجيل الدفع'
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

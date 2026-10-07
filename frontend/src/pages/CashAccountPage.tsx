// src/pages/CashAccountPage.tsx
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { CompteCash, TransactionCash, TransactionCashStats } from '../types';
import { DataTable, Column } from '../components/Common/DataTable';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { useToast } from '../components/Common/Toast';

export const CashAccountPage: React.FC = () => {
  const { showToast } = useToast();
  const [compte, setCompte] = useState<CompteCash | null>(null);
  const [transactions, setTransactions] = useState<TransactionCash[]>([]);
  const [stats, setStats] = useState<TransactionCashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [transactionForm, setTransactionForm] = useState({
    type_transaction: 'entree' as 'entree' | 'sortie',
    montant: '',
    date_transaction: new Date().toISOString().split('T')[0],
    description: '',
    methode_paiement: 'cash',
    reference: '',
  });

  const paymentMethods = [
    { value: 'cash', label: 'نقدي' },
    { value: 'transfer', label: 'تحويل بنكي' },
    { value: 'check', label: 'شيك' },
    { value: 'mobile', label: 'دفع إلكتروني' },
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [comptesRes, transactionsRes, statsRes] = await Promise.all([
        apiService.getComptesCash(),
        apiService.getTransactionsCash({
          type_transaction: filterType || undefined,
          date_debut: filterDateDebut || undefined,
          date_fin: filterDateFin || undefined,
        }),
        apiService.getTransactionCashStats({
          date_debut: filterDateDebut || undefined,
          date_fin: filterDateFin || undefined,
        }),
      ]);

      const comptes = comptesRes.comptes_cash || [];
      if (comptes.length > 0) {
        setCompte(comptes[0]);
      } else {
        const newCompte = await apiService.createCompteCash({
          nom: 'الصندوق الرئيسي',
          solde: 0,
          date_creation: new Date().toISOString().split('T')[0],
          description: 'الصندوق الرئيسي للمدرسة',
        });
        setCompte(newCompte);
      }

      setTransactions(transactionsRes.transactions_cash || []);
      setStats(statsRes);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل بيانات الصندوق');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, filterDateDebut, filterDateFin]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!compte || !transactionForm.montant) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    const montant = parseFloat(transactionForm.montant);
    if (montant <= 0) {
      showToast('المبلغ يجب أن يكون أكبر من صفر', 'error');
      return;
    }

    if (transactionForm.type_transaction === 'sortie' && compte.solde < montant) {
      showToast('الرصيد غير كافٍ', 'error');
      return;
    }

    setSaving(true);
    try {
      await apiService.createTransactionCash({
        compte_id: compte.id,
        type_transaction: transactionForm.type_transaction,
        montant,
        date_transaction: transactionForm.date_transaction,
        description: transactionForm.description || undefined,
        methode_paiement: transactionForm.methode_paiement,
        reference: transactionForm.reference || undefined,
      });

      showToast('تم تسجيل العملية بنجاح', 'success');
      setShowTransactionModal(false);
      resetTransactionForm();
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل تسجيل العملية', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه العملية؟')) return;
    try {
      await apiService.deleteTransactionCash(id);
      showToast('تم حذف العملية بنجاح', 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.message || 'فشل حذف العملية', 'error');
    }
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      type_transaction: 'entree',
      montant: '',
      date_transaction: new Date().toISOString().split('T')[0],
      description: '',
      methode_paiement: 'cash',
      reference: '',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-MA', { style: 'decimal' }).format(amount);
  };

  const getSourceLabel = (source: string | null) => {
    const labels: { [key: string]: string } = {
      frais_inscription: 'رسوم تسجيل',
      manuelle: 'يدوية',
    };
    return labels[source || ''] || source || '-';
  };

  const columns: Column<TransactionCash>[] = [
    { key: 'id', header: '#' },
    {
      key: 'type_transaction',
      header: 'النوع',
      render: (value) => (
        <span style={{
          color: value === 'entree' ? '#16a34a' : '#dc2626',
          fontWeight: 600,
        }}>
          {value === 'entree' ? 'دخل' : 'صرف'}
        </span>
      )
    },
    {
      key: 'montant',
      header: 'المبلغ',
      render: (value, item) => (
        <span style={{
          color: item.type_transaction === 'entree' ? '#16a34a' : '#dc2626',
          fontWeight: 600,
        }}>
          {item.type_transaction === 'entree' ? '+' : '-'}{formatAmount(value)} MRU
        </span>
      )
    },
    { key: 'date_transaction', header: 'التاريخ' },
    {
      key: 'description',
      header: 'الوصف',
      render: (value) => value || '-'
    },
    {
      key: 'source',
      header: 'المصدر',
      render: (value) => getSourceLabel(value)
    },
    {
      key: 'methode_paiement',
      header: 'طريقة الدفع',
      render: (value) => {
        const labels: { [key: string]: string } = {
          cash: 'نقدي',
          transfer: 'تحويل',
          check: 'شيك',
          mobile: 'إلكتروني',
        };
        return labels[value || ''] || value || '-';
      }
    },
    {
      key: 'id',
      header: 'الإجراءات',
      render: (_, item) => (
        !item.source ? (
          <button
            className="btn-danger"
            style={{ padding: '4px 10px', fontSize: '11px' }}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTransaction(item.id);
            }}
          >
            <i className="fas fa-trash"></i>
          </button>
        ) : null
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;

  return (
    <div className="page-content">
      <header className="content-header">
        <h1>إدارة الصندوق</h1>
        <button
          className="btn-primary"
          onClick={() => {
            resetTransactionForm();
            setShowTransactionModal(true);
          }}
        >
          <i className="fas fa-plus"></i> عملية جديدة
        </button>
      </header>

      {/* Balance Card */}
      {compte && (
        <div className="card" style={{
          marginBottom: '24px',
          padding: '32px',
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          color: 'white',
          borderRadius: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>{compte.nom}</div>
              <div style={{ fontSize: '36px', fontWeight: '800' }}>
                {formatAmount(compte.solde)} MRU
              </div>
              <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '4px' }}>الرصيد الحالي</div>
            </div>
            <div style={{ display: 'flex', gap: '32px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>
                  +{formatAmount(stats?.total_entrees || 0)}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>إجمالي الدخل</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>
                  -{formatAmount(stats?.total_sorties || 0)}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>إجمالي الصرف</div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>
                  {stats?.nombre_total || 0}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>عدد العمليات</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>نوع العملية</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">جميع العمليات</option>
              <option value="entree">دخل</option>
              <option value="sortie">صرف</option>
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

      {/* Transactions Table */}
      <div className="card">
        <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>سجل العمليات</h3>
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <i className="fas fa-wallet" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>لا توجد عمليات مسجلة بعد.</p>
          </div>
        ) : (
          <DataTable<TransactionCash> columns={columns} data={transactions} />
        )}
      </div>

      {/* New Transaction Modal */}
      {showTransactionModal && (
        <div className="modal-overlay" onClick={() => setShowTransactionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>عملية جديدة</h2>
              <button className="modal-close" onClick={() => setShowTransactionModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateTransaction} className="modal-form">
              <div className="form-group">
                <label>نوع العملية *</label>
                <select
                  value={transactionForm.type_transaction}
                  onChange={(e) => setTransactionForm({
                    ...transactionForm,
                    type_transaction: e.target.value as 'entree' | 'sortie'
                  })}
                  required
                >
                  <option value="entree">دخل (إيداع)</option>
                  <option value="sortie">صرف (سحب)</option>
                </select>
              </div>

              <div className="form-group">
                <label>المبلغ (MRU) *</label>
                <input
                  type="number"
                  value={transactionForm.montant}
                  onChange={(e) => setTransactionForm({ ...transactionForm, montant: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
                {transactionForm.type_transaction === 'sortie' && compte && (
                  <small style={{ color: '#64748b' }}>الرصيد المتاح: {formatAmount(compte.solde)} MRU</small>
                )}
              </div>

              <div className="form-group">
                <label>التاريخ *</label>
                <input
                  type="date"
                  value={transactionForm.date_transaction}
                  onChange={(e) => setTransactionForm({ ...transactionForm, date_transaction: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>الوصف</label>
                <input
                  type="text"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  placeholder="وصف العملية..."
                />
              </div>

              <div className="form-group">
                <label>طريقة الدفع</label>
                <select
                  value={transactionForm.methode_paiement}
                  onChange={(e) => setTransactionForm({ ...transactionForm, methode_paiement: e.target.value })}
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
                  value={transactionForm.reference}
                  onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
                  placeholder="رقم المرجع..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowTransactionModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin"></i> جاري الحفظ...</>
                  ) : (
                    'تسجيل العملية'
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

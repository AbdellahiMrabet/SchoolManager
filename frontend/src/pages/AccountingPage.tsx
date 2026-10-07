import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

interface Compte {
  id: number;
  numero: string;
  classe: number;
  libelle: string;
  type_compte: string;
}

interface EcritureLigne {
  id: number;
  date: string;
  libelle: string;
  debit: number;
  credit: number;
}

interface GrandLivreCompte {
  compte_numero: string;
  compte_libelle: string;
  lignes: EcritureLigne[];
  total_debit: number;
  total_credit: number;
}

interface BalanceLigne {
  compte_numero: string;
  compte_libelle: string;
  classe: number;
  total_debit: number;
  total_credit: number;
  solde_debit: number;
  solde_credit: number;
}

interface BilanLigne {
  compte_numero: string;
  compte_libelle: string;
  classe: number;
  montant: number;
}

interface Ecriture {
  id: number;
  date_ecriture: string;
  libelle: string;
  source_type: string;
  source_id: number;
  lignes: Array<{
    id: number;
    compte_numero: string;
    debit: number;
    credit: number;
    compte?: { libelle: string };
  }>;
}

export const AccountingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'plan' | 'journal' | 'grand-livre' | 'balance' | 'bilan' | 'resultat'>('bilan');
  const [planComptable, setPlanComptable] = useState<Compte[]>([]);
  const [ecritures, setEcritures] = useState<Ecriture[]>([]);
  const [grandLivre, setGrandLivre] = useState<GrandLivreCompte[]>([]);
  const [balance, setBalance] = useState<BalanceLigne[]>([]);
  const [bilan, setBilan] = useState<{ bilan_actif: BilanLigne[]; bilan_passif: BilanLigne[]; total_actif: number; total_passif: number } | null>(null);
  const [compteResultat, setCompteResultat] = useState<{ produits: any[]; charges: any[]; total_produits: number; total_charges: number; resultat: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [selectedCompte, setSelectedCompte] = useState('');

  useEffect(() => {
    loadTabData();
  }, [activeTab, dateDebut, dateFin, selectedCompte]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'plan':
          const planRes: any = await apiService.getPlanComptable();
          setPlanComptable(planRes.plan_comptable || []);
          break;
        case 'journal':
          const ecritRes: any = await apiService.getEcritures(dateDebut || undefined, dateFin || undefined);
          setEcritures(ecritRes.ecritures || []);
          break;
        case 'grand-livre':
          const glRes: any = await apiService.getGrandLivre(dateDebut || undefined, dateFin || undefined, selectedCompte || undefined);
          setGrandLivre(glRes.grand_livre || []);
          break;
        case 'balance':
          const balRes: any = await apiService.getBalance();
          setBalance(balRes.balance || []);
          break;
        case 'bilan':
          const bilanRes: any = await apiService.getBilan();
          setBilan(bilanRes);
          break;
        case 'resultat':
          const resRes: any = await apiService.getCompteResultat();
          setCompteResultat(resRes);
          break;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res: any = await apiService.syncEcritures();
      alert(`تمت مزامنة ${res.count} قيد/قيود`);
      loadTabData();
    } catch (err: any) {
      alert('خطأ: ' + (err.message || 'فشل المزامنة'));
    } finally {
      setSyncing(false);
    }
  };

  const formatNum = (n: number) => n.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const tabs = [
    { key: 'bilan', label: 'الميزانية العمومية (Bilan)' },
    { key: 'resultat', label: 'حساب النتائج (Compte de Résultat)' },
    { key: 'grand-livre', label: 'الدفتر الأكبر (Grand Livre)' },
    { key: 'balance', label: 'ميزان المراجعة (Balance)' },
    { key: 'journal', label: 'دفتر اليومية (Journal)' },
    { key: 'plan', label: 'الدليل المحاسبي (Plan Comptable)' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>المحاسبة (OHADA)</h1>
        <button className="btn-primary" onClick={handleSync} disabled={syncing}>
          {syncing ? 'جاري المزامنة...' : 'مزامنة القيود'}
        </button>
      </div>

      <div className="tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key as any)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(activeTab === 'journal' || activeTab === 'grand-livre') && (
        <div className="filter-bar" style={{ display: 'flex', gap: '12px', margin: '16px 0', flexWrap: 'wrap' }}>
          <div className="form-group">
            <label>من تاريخ</label>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
          </div>
          <div className="form-group">
            <label>إلى تاريخ</label>
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} />
          </div>
          {activeTab === 'grand-livre' && (
            <div className="form-group">
              <label>الحساب</label>
              <select value={selectedCompte} onChange={e => setSelectedCompte(e.target.value)}>
                <option value="">جميع الحسابات</option>
                {planComptable.map(c => (
                  <option key={c.numero} value={c.numero}>{c.numero} - {c.libelle}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</div>
      ) : (
        <div className="table-container">
          {activeTab === 'plan' && <PlanComptableView data={planComptable} />}
          {activeTab === 'journal' && <JournalView data={ecritures} />}
          {activeTab === 'grand-livre' && <GrandLivreView data={grandLivre} />}
          {activeTab === 'balance' && <BalanceView data={balance} />}
          {activeTab === 'bilan' && bilan && <BilanView data={bilan} formatNum={formatNum} />}
          {activeTab === 'resultat' && compteResultat && <CompteResultatView data={compteResultat} formatNum={formatNum} />}
        </div>
      )}
    </div>
  );
};

const PlanComptableView: React.FC<{ data: Compte[] }> = ({ data }) => (
  <table className="data-table">
    <thead>
      <tr>
        <th>الرقم</th>
        <th>ال classe</th>
        <th>البيان</th>
        <th>النوع</th>
      </tr>
    </thead>
    <tbody>
      {data.map(c => (
        <tr key={c.numero}>
          <td><strong>{c.numero}</strong></td>
          <td>{c.classe}</td>
          <td>{c.libelle}</td>
          <td>{c.type_compte === 'bilan' ? 'ميزانية' : c.type_compte === 'produit' ? 'إيراد' : 'مصروف'}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const JournalView: React.FC<{ data: Ecriture[] }> = ({ data }) => (
  <table className="data-table">
    <thead>
      <tr>
        <th>#</th>
        <th>التاريخ</th>
        <th>البيان</th>
        <th>المبلغ</th>
      </tr>
    </thead>
    <tbody>
      {data.map(e => {
        const totalDebit = e.lignes?.reduce((s, l) => s + (l.debit || 0), 0) || 0;
        return (
          <React.Fragment key={e.id}>
            <tr>
              <td>{e.id}</td>
              <td>{e.date_ecriture}</td>
              <td><strong>{e.libelle}</strong></td>
              <td>{totalDebit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}</td>
            </tr>
            {e.lignes?.map(l => (
              <tr key={l.id} style={{ backgroundColor: '#f8f9fa' }}>
                <td></td>
                <td></td>
                <td style={{ paddingRight: '24px' }}>
                  {l.compte_numero} - {l.compte?.libelle || ''}
                </td>
                <td>
                  {l.debit > 0 && <span style={{ color: '#16a34a' }}>DA {l.debit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}</span>}
                  {l.credit > 0 && <span style={{ color: '#dc2626' }}> cr {l.credit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}</span>}
                </td>
              </tr>
            ))}
          </React.Fragment>
        );
      })}
    </tbody>
  </table>
);

const GrandLivreView: React.FC<{ data: GrandLivreCompte[] }> = ({ data }) => (
  <div>
    {data.map(group => (
      <div key={group.compte_numero} style={{ marginBottom: '24px' }}>
        <h3 style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', borderRadius: '6px', margin: 0 }}>
          {group.compte_numero} - {group.compte_libelle}
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>البيان</th>
              <th>المدين</th>
              <th>الدائن</th>
            </tr>
          </thead>
          <tbody>
            {group.lignes.map((l, i) => (
              <tr key={i}>
                <td>{l.date}</td>
                <td>{l.libelle}</td>
                <td>{l.debit > 0 ? l.debit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 }) : '-'}</td>
                <td>{l.credit > 0 ? l.credit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 }) : '-'}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 'bold', backgroundColor: '#e2e8f0' }}>
              <td colSpan={2}>المجموع</td>
              <td>{group.total_debit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}</td>
              <td>{group.total_credit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>
    ))}
  </div>
);

const BalanceView: React.FC<{ data: BalanceLigne[] }> = ({ data }) => {
  const totalDebit = data.reduce((s, l) => s + l.total_debit, 0);
  const totalCredit = data.reduce((s, l) => s + l.total_credit, 0);
  const totalSoldeDebit = data.reduce((s, l) => s + l.solde_debit, 0);
  const totalSoldeCredit = data.reduce((s, l) => s + l.solde_credit, 0);
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>الحساب</th>
          <th>البيان</th>
          <th>المدين</th>
          <th>الدائن</th>
          <th>مدين</th>
          <th>دائن</th>
        </tr>
      </thead>
      <tbody>
        {data.map(l => (
          <tr key={l.compte_numero}>
            <td><strong>{l.compte_numero}</strong></td>
            <td>{l.compte_libelle}</td>
            <td>{l.total_debit > 0 ? l.total_debit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 }) : '-'}</td>
            <td>{l.total_credit > 0 ? l.total_credit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 }) : '-'}</td>
            <td>{l.solde_debit > 0 ? l.solde_debit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 }) : '-'}</td>
            <td>{l.solde_credit > 0 ? l.solde_credit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 }) : '-'}</td>
          </tr>
        ))}
        <tr style={{ fontWeight: 'bold', backgroundColor: '#e2e8f0' }}>
          <td colSpan={2}>المجموع</td>
          <td>{totalDebit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}</td>
          <td>{totalCredit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}</td>
          <td>{totalSoldeDebit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}</td>
          <td>{totalSoldeCredit.toLocaleString('fr-DZ', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>
  );
};

const BilanView: React.FC<{ data: { bilan_actif: BilanLigne[]; bilan_passif: BilanLigne[]; total_actif: number; total_passif: number }; formatNum: (n: number) => string }> = ({ data, formatNum }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
    <div>
      <h3 style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '6px', margin: '0 0 12px 0' }}>
        الأصول (Actif)
      </h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>الحساب</th>
            <th>البيان</th>
            <th>المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {data.bilan_actif.map(l => (
            <tr key={l.compte_numero}>
              <td>{l.compte_numero}</td>
              <td>{l.compte_libelle}</td>
              <td style={{ textAlign: 'left' }}>{formatNum(l.montant)}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 'bold', backgroundColor: '#dbeafe' }}>
            <td colSpan={2}>المجموع</td>
            <td style={{ textAlign: 'left' }}>{formatNum(data.total_actif)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div>
      <h3 style={{ padding: '12px', backgroundColor: '#fce7f3', borderRadius: '6px', margin: '0 0 12px 0' }}>
        الخصوم (Passif)
      </h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>الحساب</th>
            <th>البيان</th>
            <th>المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {data.bilan_passif.map(l => (
            <tr key={l.compte_numero}>
              <td>{l.compte_numero}</td>
              <td>{l.compte_libelle}</td>
              <td style={{ textAlign: 'left' }}>{formatNum(l.montant)}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 'bold', backgroundColor: '#fce7f3' }}>
            <td colSpan={2}>المجموع</td>
            <td style={{ textAlign: 'left' }}>{formatNum(data.total_passif)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const CompteResultatView: React.FC<{ data: { produits: any[]; charges: any[]; total_produits: number; total_charges: number; resultat: number }; formatNum: (n: number) => string }> = ({ data, formatNum }) => (
  <div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      <div>
        <h3 style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '6px', margin: '0 0 12px 0' }}>
          الإيرادات (Produits)
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>الحساب</th>
              <th>البيان</th>
              <th>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {data.produits.map(p => (
              <tr key={p.compte_numero}>
                <td>{p.compte_numero}</td>
                <td>{p.compte_libelle}</td>
                <td style={{ textAlign: 'left' }}>{formatNum(p.montant)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 'bold', backgroundColor: '#dcfce7' }}>
              <td colSpan={2}>المجموع</td>
              <td style={{ textAlign: 'left' }}>{formatNum(data.total_produits)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <h3 style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px', margin: '0 0 12px 0' }}>
          المصروفات (Charges)
        </h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>الحساب</th>
              <th>البيان</th>
              <th>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {data.charges.map(c => (
              <tr key={c.compte_numero}>
                <td>{c.compte_numero}</td>
                <td>{c.compte_libelle}</td>
                <td style={{ textAlign: 'left' }}>{formatNum(c.montant)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 'bold', backgroundColor: '#fee2e2' }}>
              <td colSpan={2}>المجموع</td>
              <td style={{ textAlign: 'left' }}>{formatNum(data.total_charges)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div style={{
      marginTop: '24px',
      padding: '16px 24px',
      backgroundColor: data.resultat >= 0 ? '#dcfce7' : '#fee2e2',
      borderRadius: '8px',
      textAlign: 'center',
      fontSize: '18px',
      fontWeight: 'bold'
    }}>
      صافي النتيجة (Résultat): {formatNum(data.resultat)} DA
      <span style={{ margin: '0 12px', fontSize: '14px', fontWeight: 'normal' }}>
        ({data.resultat >= 0 ? 'ربح' : 'خسارة'})
      </span>
    </div>
  </div>
);

export default AccountingPage;

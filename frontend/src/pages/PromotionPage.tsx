// src/pages/PromotionPage.tsx
import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Classe } from '../types';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { useToast } from '../components/Common/Toast';

interface EligibilityStudent {
  numero: number;
  nom: string;
  overall_average: number | null;
  eligible: boolean;
}

interface NextClass {
  id: number;
  label: string;
  abrev: string | null;
}

export const PromotionPage: React.FC = () => {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<EligibilityStudent[]>([]);
  const [nextClass, setNextClass] = useState<NextClass | null>(null);
  const [threshold, setThreshold] = useState(10);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [promoting, setPromoting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const res = await apiService.getClasses();
        setClasses(res.classes || []);
      } catch (err: any) {
        setError(err.message || 'فشل تحميل الفصول');
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const fetchEligibility = async () => {
    if (!selectedClassId) return;
    setLoadingEligibility(true);
    setError(null);
    setDone(false);
    try {
      const res = await apiService.getPromotionEligibility(parseInt(selectedClassId));
      setStudents(res.students || []);
      setNextClass(res.next_class);
      setThreshold(res.threshold);
      setSelectedStudents((res.students || []).filter(s => s.eligible).map(s => s.numero));
    } catch (err: any) {
      setError(err.message || 'فشل التحقق من الأهلية');
    } finally {
      setLoadingEligibility(false);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchEligibility();
    } else {
      setStudents([]);
      setNextClass(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

  const toggleStudent = (numero: number) => {
    setSelectedStudents(prev =>
      prev.includes(numero) ? prev.filter(id => id !== numero) : [...prev, numero]
    );
  };

  const toggleAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.numero));
    }
  };

  const handlePromote = async () => {
    if (!nextClass || selectedStudents.length === 0) {
      showToast('يرجى اختيار طلاب للترقية', 'error');
      return;
    }
    setPromoting(true);
    try {
      const promotions = selectedStudents.map(numero => ({
        student_id: numero,
        target_cls_id: nextClass.id,
      }));
      const result = await apiService.promoteStudentsConfirmed(promotions);
      showToast(result.message, 'success');
      setDone(true);
      setSelectedStudents([]);
      fetchEligibility();
    } catch (err: any) {
      showToast(err.message || 'فشل ترقية الطلاب', 'error');
    } finally {
      setPromoting(false);
    }
  };

  const selectedClass = classes.find(c => c.id === parseInt(selectedClassId));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-content">
      <header className="content-header">
        <h1>ترقية الطلاب</h1>
      </header>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '250px' }}>
            <label>الفصل الحالي</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">اختر الفصل</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.label}{cls.abrev ? ` (${cls.abrev})` : ''}
                  {cls.niveau?.description ? ` - ${cls.niveau.description}` : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedClassId && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {nextClass && (
                <div style={{
                  padding: '8px 16px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#1e40af',
                }}>
                  <i className="fas fa-arrow-up" style={{ marginLeft: '6px' }}></i>
                  الفصل المستهدف: <strong>{nextClass.label}{nextClass.abrev ? ` (${nextClass.abrev})` : ''}</strong>
                </div>
              )}
              {!nextClass && (
                <div style={{
                  padding: '8px 16px',
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#92400e',
                }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginLeft: '6px' }}></i>
                  لا يوجد فصل أعلى متاح
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => { setError(null); fetchEligibility(); }} />}
      {loadingEligibility && <LoadingSpinner message="جاري التحقق من الأهلية..." />}

      {!loadingEligibility && students.length > 0 && (
        <div className="card">
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '14px', color: '#475569' }}>
                العدد الإجمالي: <strong>{students.length}</strong> | مؤهل: <strong style={{ color: '#0f7b3a' }}>{students.filter(s => s.eligible).length}</strong> | غير مؤهل: <strong style={{ color: '#b34033' }}>{students.filter(s => !s.eligible).length}</strong>
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                الحد الأدنى: {threshold}/20
              </span>
              {nextClass && (
                <button
                  className="btn-success"
                  disabled={promoting || selectedStudents.length === 0}
                  onClick={handlePromote}
                >
                  {promoting ? (
                    <><i className="fas fa-spinner fa-spin"></i> جاري الترقية...</>
                  ) : (
                    <><i className="fas fa-arrow-up"></i> ترقية ({selectedStudents.length})</>
                  )}
                </button>
              )}
            </div>
          </div>

          {done && (
            <div style={{
              padding: '12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              marginBottom: '16px',
              color: '#166534',
              fontSize: '14px',
            }}>
              <i className="fas fa-check-circle" style={{ marginLeft: '6px' }}></i>
              تمت الترقية بنجاح
            </div>
          )}

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedStudents.length === students.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>#</th>
                  <th>الاسم</th>
                  <th>المعدل العام</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.numero} style={{ opacity: done && !selectedStudents.includes(student.numero) ? 0.5 : 1 }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.numero)}
                        onChange={() => toggleStudent(student.numero)}
                      />
                    </td>
                    <td>{student.numero}</td>
                    <td>{student.nom}</td>
                    <td>
                      <strong style={{ color: student.eligible ? '#0f7b3a' : '#b34033' }}>
                        {student.overall_average !== null ? student.overall_average.toFixed(2) : '-'}
                      </strong>
                    </td>
                    <td>
                      {student.eligible ? (
                        <span className="status-badge" style={{ background: '#dcfce7', color: '#166534' }}>
                          مؤهل
                        </span>
                      ) : (
                        <span className="status-badge absent" style={{ background: '#fee2e2', color: '#991b1b' }}>
                          غير مؤهل
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loadingEligibility && selectedClassId && students.length === 0 && !error && (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <i className="fas fa-user-graduate" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>لا يوجد طلاب نشطون في هذا الفصل</p>
          </div>
        </div>
      )}
    </div>
  );
};

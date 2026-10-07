// src/pages/GradesPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiService } from '../services/api';
import { Note, Eleve, Matiere, Examen, Classe, Coefficient, Niveau } from '../types';
import { DataTable, Column } from '../components/Common/DataTable';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { SearchableSelect } from '../components/Common/SearchableSelect';

const MAX_GRADE_PRIMARY = 100;
const MAX_GRADE_SECONDARY = 20;

interface SubjectGrade {
  subject_id: number;
  subject_name: string;
  coefficient_id: number;
  coefficient_value: number;
  grade_id: number | null;
  grade_value: number | null;
}

interface StudentExamGrades {
  student_id: number;
  student_name: string;
  class_id: number;
  class_label: string;
  class_abrev?: string | null;
  examen_id: number;
  subjects: SubjectGrade[];
}

export const GradesPage: React.FC = () => {
  const location = useLocation();
  const [grades, setGrades] = useState<Note[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [exams, setExams] = useState<Examen[]>([]);
  const [subjects, setSubjects] = useState<Matiere[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [coefficients, setCoefficients] = useState<Coefficient[]>([]);
  const [levels, setLevels] = useState<Niveau[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Note | null>(null);
  
  // Filtered grades state
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [filteredGrades, setFilteredGrades] = useState<Note[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  
  // Batch grade state
  const [batchFormData, setBatchFormData] = useState({
    student_id: '',
    examen_id: '',
  });
  const [studentExamGrades, setStudentExamGrades] = useState<StudentExamGrades | null>(null);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [savingGrades, setSavingGrades] = useState(false);

  // Per-subject modal state
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectFormData, setSubjectFormData] = useState({
    classe_id: '',
    matiere_id: '',
    examen_id: '',
  });
  const [subjectClassGrades, setSubjectClassGrades] = useState<{
    class_id: number; class_label: string; class_abrev: string;
    matiere_id: number; examen_id: number;
    coefficient_id: number | null; coefficient_value: number | null;
    students: Array<{ student_id: number; student_name: string; grade_id: number | null; grade_value: number | null }>;
  } | null>(null);
  const [loadingSubjectGrades, setLoadingSubjectGrades] = useState(false);
  const [savingSubjectGrades, setSavingSubjectGrades] = useState(false);

  // Get the level of a class
  const getClassLevel = (classId: number): number | null => {
    const cls = classes.find(c => c.id === classId);
    return cls?.niv_id || null;
  };

  // Get max grade based on level
  const getMaxGrade = (classId: number): number => {
    const levelId = getClassLevel(classId);
    return levelId === 1 ? MAX_GRADE_PRIMARY : MAX_GRADE_SECONDARY;
  };

  // Get student's class level
  const getStudentMaxGrade = (studentId: number): number => {
    const student = students.find(s => s.numero === studentId);
    if (!student) return MAX_GRADE_SECONDARY;
    return getMaxGrade(student.cls_id);
  };

  // Check URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'add') {
      resetForm();
      setShowModal(true);
      window.history.replaceState({}, '', '/grades');
    }
  }, [location]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [gradesRes, studentsRes, examsRes, subjectsRes, classesRes, coefficientsRes, levelsRes] = await Promise.all([
        apiService.getGrades(),
        apiService.getStudents(),
        apiService.getExams(),
        apiService.getSubjects(),
        apiService.getClasses(),
        apiService.getCoefficients(),
        apiService.getLevels(),
      ]);
      
      setGrades(gradesRes.notes || []);
      setStudents(studentsRes.eleves || []);
      setExams(examsRes.examens || []);
      setSubjects(subjectsRes.matieres || []);
      setClasses(classesRes.classes || []);
      setCoefficients(coefficientsRes.coefficients || []);
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

  // Filter grades when student or exam changes
  useEffect(() => {
    let filtered: Note[] = [];
    
    // If student is selected, filter by student
    if (selectedStudent) {
      filtered = grades.filter(g => g.ele_id === parseInt(selectedStudent));
    }
    
    // If exam is also selected, further filter by exam
    if (selectedExam && selectedStudent) {
      filtered = filtered.filter(g => g.examen_id === parseInt(selectedExam));
    } else if (selectedExam && !selectedStudent) {
      // If only exam is selected, filter by exam across all students
      filtered = grades.filter(g => g.examen_id === parseInt(selectedExam));
    }
    
    setFilteredGrades(filtered);
  }, [selectedStudent, selectedExam, grades]);

  // Calculate average for filtered grades
  useEffect(() => {
    if (filteredGrades.length > 0) {
      const total = filteredGrades.reduce((sum, g) => sum + g.valeur, 0);
      const avg = total / filteredGrades.length;
      setAverage(avg);
    } else {
      setAverage(null);
    }
  }, [filteredGrades]);

  // Fetch student's grades for the selected exam (for batch modal)
  useEffect(() => {
    const fetchStudentExamGrades = async () => {
      if (batchFormData.student_id && batchFormData.examen_id) {
        setLoadingGrades(true);
        try {
          const data = await apiService.getStudentExamAllGrades(
            parseInt(batchFormData.student_id),
            parseInt(batchFormData.examen_id)
          );
          setStudentExamGrades(data);
        } catch (err: any) {
          alert('فشل تحميل درجات الطالب: ' + err.message);
          setStudentExamGrades(null);
        } finally {
          setLoadingGrades(false);
        }
      } else {
        setStudentExamGrades(null);
      }
    };
    fetchStudentExamGrades();
  }, [batchFormData.student_id, batchFormData.examen_id]);

  // Fetch subject+class grades for subject modal
  useEffect(() => {
    const fetchSubjectClassGrades = async () => {
      const { classe_id, matiere_id, examen_id } = subjectFormData;
      if (classe_id && matiere_id && examen_id) {
        setLoadingSubjectGrades(true);
        try {
          const data = await apiService.getSubjectClassGrades(
            parseInt(classe_id), parseInt(matiere_id), parseInt(examen_id)
          );
          setSubjectClassGrades(data);
        } catch (err: any) {
          alert('فشل تحميل الدرجات: ' + err.message);
          setSubjectClassGrades(null);
        } finally {
          setLoadingSubjectGrades(false);
        }
      } else {
        setSubjectClassGrades(null);
      }
    };
    fetchSubjectClassGrades();
  }, [subjectFormData.classe_id, subjectFormData.matiere_id, subjectFormData.examen_id]);

  // Helper functions to get names from IDs
  const getStudentName = (id: number): string => {
    const student = students.find(s => s.numero === id);
    return student?.nom || `الطالب ${id}`;
  };

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

  const getExamName = (id: number): string => {
    const exam = exams.find(e => e.num === id);
    return exam?.type || `الامتحان ${id}`;
  };

  const getCoefficientValue = (id: number): number | string => {
    const coeff = coefficients.find(c => c.id === id);
    return coeff?.valeur || id;
  };

  const handleGradeChange = (subjectId: number, value: string) => {
    if (!studentExamGrades) return;
    
    const updatedSubjects = studentExamGrades.subjects.map(subject => {
      if (subject.subject_id === subjectId) {
        const numValue = value === '' ? null : parseFloat(value);
        // Ensure we keep 2 decimal places
        const roundedValue = numValue !== null ? Math.round(numValue * 100) / 100 : null;
        return {
          ...subject,
          grade_value: roundedValue
        };
      }
      return subject;
    });
    
    setStudentExamGrades({
      ...studentExamGrades,
      subjects: updatedSubjects
    });
  };

  const handleSubjectGradeChange = (studentId: number, value: string) => {
    if (!subjectClassGrades) return;
    const numValue = value === '' ? null : parseFloat(value);
    const roundedValue = numValue !== null ? Math.round(numValue * 100) / 100 : null;
    const updated = subjectClassGrades.students.map(s =>
      s.student_id === studentId
        ? { ...s, grade_value: roundedValue }
        : s
    );
    setSubjectClassGrades({ ...subjectClassGrades, students: updated });
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentExamGrades) {
      alert('يرجى اختيار طالب وأمتحان أولاً');
      return;
    }

    const hasGrades = studentExamGrades.subjects.some(s => s.grade_value !== null && s.grade_value !== undefined);
    if (!hasGrades) {
      alert('يرجى إدخال درجة واحدة على الأقل');
      return;
    }

    // Validate all grades are within range
    const invalidGrades = studentExamGrades.subjects.filter(s => {
      if (s.grade_value === null || s.grade_value === undefined) return false;
      const maxGrade = getMaxGrade(studentExamGrades.class_id);
      return s.grade_value < 0 || s.grade_value > maxGrade;
    });

    if (invalidGrades.length > 0) {
      alert(`الدرجات التالية خارج النطاق المسموح: ${invalidGrades.map(s => s.subject_name).join(', ')}`);
      return;
    }

    const totalGrades = studentExamGrades.subjects.filter(s => s.grade_value !== null && s.grade_value !== undefined).length;
    

    setSavingGrades(true);
    try {
      const gradesData = studentExamGrades.subjects
        .filter(s => s.grade_value !== null && s.grade_value !== undefined)
        .map(s => ({
          mat_id: s.subject_id,
          valeur: s.grade_value!
        }));

      const result = await apiService.createBatchGrades({
        ele_id: studentExamGrades.student_id,
        examen_id: studentExamGrades.examen_id,
        grades: gradesData
      });
      
      if (result.errors.length > 0) {
        alert(`تم حفظ ${result.total_processed} درجات مع ${result.total_errors} أخطاء:\n${result.errors.join('\n')}`);
      } else {
        alert(`✅ تم حفظ ${result.total_processed} درجات بنجاح!`);
      }
      
      setShowModal(false);
      resetBatchForm();
      fetchData();
    } catch (err: any) {
      alert('فشل حفظ الدرجات: ' + err.message);
    } finally {
      setSavingGrades(false);
    }
  };

  const handleEdit = (grade: Note) => {
    setEditingGrade(grade);
    setBatchFormData({
      student_id: grade.ele_id.toString(),
      examen_id: grade.examen_id.toString(),
    });
    
    const loadEditData = async () => {
      try {
        const data = await apiService.getStudentExamAllGrades(grade.ele_id, grade.examen_id);
        setStudentExamGrades(data);
      } catch (err) {
        alert('فشل تحميل درجات الامتحان');
      }
    };
    loadEditData();
    
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الدرجة؟')) return;
    try {
      await apiService.deleteGrade(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'فشل حذف الدرجة');
    }
  };

  const resetBatchForm = () => {
    setBatchFormData({
      student_id: '',
      examen_id: '',
    });
    setStudentExamGrades(null);
    setEditingGrade(null);
  };

  const resetForm = () => {
    setBatchFormData({
      student_id: '',
      examen_id: '',
    });
    setStudentExamGrades(null);
    setEditingGrade(null);
  };

  const resetSubjectForm = () => {
    setSubjectFormData({ classe_id: '', matiere_id: '', examen_id: '' });
    setSubjectClassGrades(null);
  };

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectClassGrades) {
      alert('يرجى اختيار فصل ومادة وامتحان أولاً');
      return;
    }
    
    // Validate all grades are within range
    const invalidGrades = subjectClassGrades.students.filter(s => {
      if (s.grade_value === null || s.grade_value === undefined) return false;
      const maxGrade = getMaxGrade(subjectClassGrades.class_id);
      return s.grade_value < 0 || s.grade_value > maxGrade;
    });

    if (invalidGrades.length > 0) {
      alert(`الدرجات التالية خارج النطاق المسموح: ${invalidGrades.map(s => s.student_name).join(', ')}`);
      return;
    }

    const gradesData = subjectClassGrades.students
      .filter(s => s.grade_value !== null && s.grade_value !== undefined)
      .map(s => ({ student_id: s.student_id, valeur: s.grade_value! }));
    if (gradesData.length === 0) {
      alert('يرجى إدخال درجة واحدة على الأقل');
      return;
    }
    
    setSavingSubjectGrades(true);
    try {
      const result = await apiService.saveSubjectClassGrades({
        classe_id: parseInt(subjectFormData.classe_id),
        matiere_id: parseInt(subjectFormData.matiere_id),
        examen_id: parseInt(subjectFormData.examen_id),
        grades: gradesData,
      });
      if (result.errors.length > 0) {
        alert(`تم حفظ ${result.total_processed} درجات مع ${result.total_errors} أخطاء:\n${result.errors.join('\n')}`);
      } else {
        alert(`✅ تم حفظ ${result.total_processed} درجات بنجاح!`);
      }
      setShowSubjectModal(false);
      resetSubjectForm();
      fetchData();
    } catch (err: any) {
      alert('فشل حفظ الدرجات: ' + err.message);
    } finally {
      setSavingSubjectGrades(false);
    }
  };

  const openModal = () => {
    resetBatchForm();
    setShowModal(true);
  };

  // Get max grade label based on level
  const getGradeLabel = (classId: number): string => {
    const maxGrade = getMaxGrade(classId);
    return `الدرجة (0-${maxGrade})`;
  };

  // Get grade input props based on level
  const getGradeInputProps = (classId: number) => {
    const maxGrade = getMaxGrade(classId);
    return {
      min: 0,
      max: maxGrade,
      step: 0.01,  // Always 0.01 for 2 decimal places
    };
  };

  // Columns for the main grades table (all grades)
  const columns: Column<Note>[] = [
    { key: 'id', header: '#' },
    {
      key: 'ele_id',
      header: 'الطالب',
      render: (value, item) => getStudentName(item.ele_id),
    },
    {
      key: 'mat_id',
      header: 'المادة',
      render: (value, item) => getSubjectName(item.mat_id),
    },
    {
      key: 'classe_id',
      header: 'الفصل',
      render: (value, item) => getClassName(item.classe_id),
    },
    {
      key: 'examen_id',
      header: 'الامتحان',
      render: (value, item) => getExamName(item.examen_id),
    },
    {
      key: 'coef_id',
      header: 'المعامل',
      render: (value, item) => getCoefficientValue(item.coef_id),
    },
    { 
      key: 'valeur', 
      header: 'الدرجة',
      render: (value) => (
        <span style={{ fontWeight: 'bold', color: value >= 10 ? '#0f7b3a' : '#b34033' }}>
          {value !== null && value !== undefined ? Number(value).toFixed(2) : '-'}
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

  // Columns for filtered grades (student-specific)
  const filteredColumns: Column<Note>[] = [
    { key: 'id', header: '#' },
    {
      key: 'mat_id',
      header: 'المادة',
      render: (value, item) => getSubjectName(item.mat_id),
    },
    {
      key: 'classe_id',
      header: 'الفصل',
      render: (value, item) => getClassName(item.classe_id),
    },
    {
      key: 'examen_id',
      header: 'الامتحان',
      render: (value, item) => getExamName(item.examen_id),
    },
    {
      key: 'coef_id',
      header: 'المعامل',
      render: (value, item) => getCoefficientValue(item.coef_id),
    },
    { 
      key: 'valeur', 
      header: 'الدرجة'
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

  // Determine which data and columns to show
  const isFiltered = selectedStudent !== '' || selectedExam !== '';
  const displayData = isFiltered ? filteredGrades : grades;
  const displayColumns = isFiltered ? filteredColumns : columns;

  return (
    <div className="page-content">
      <header className="content-header">
        <h1>الدرجات</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn-primary"
            onClick={() => { resetSubjectForm(); setShowSubjectModal(true); }}
          >
            <i className="fas fa-book"></i> إضافة حسب المادة
          </button>
          <button
            className="btn-primary"
            onClick={openModal}
          >
            <i className="fas fa-plus"></i> إضافة درجات
          </button>
        </div>
      </header>

      {/* Filter Section */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="section-title">
          <span>تصفية الدرجات</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ minWidth: '200px' }}>
            <label>اختر الطالب</label>
            <SearchableSelect
              value={selectedStudent}
              onChange={setSelectedStudent}
              options={students.map(student => ({
                value: student.numero.toString(),
                label: `${student.nom} (الفصل: ${(() => {
                  const cls = classes.find(c => c.id === student.cls_id);
                  return cls ? `${cls.label}${cls.abrev ? ` (${cls.abrev})` : ''}` : 'غير متاح';
                })()})`,
              }))}
              placeholder="جميع الطلاب"
              isClearable={true}
            />
          </div>
          <div className="form-group" style={{ minWidth: '200px' }}>
            <label>اختر الامتحان</label>
            <SearchableSelect
              value={selectedExam}
              onChange={setSelectedExam}
              options={exams.map(exam => ({
                value: exam.num.toString(),
                label: exam.type,
              }))}
              placeholder="جميع الامتحانات"
              isClearable={true}
            />
          </div>
          <button 
            className="btn-outline" 
            onClick={() => {
              setSelectedStudent('');
              setSelectedExam('');
              setFilteredGrades([]);
              setAverage(null);
            }}
          >
            <i className="fas fa-times"></i> مسح الفلاتر
          </button>
          {isFiltered && filteredGrades.length > 0 && (
            <div style={{ 
              padding: '8px 16px', 
              background: '#f0fdf4', 
              borderRadius: '8px',
              border: '1px solid #bbf7d0'
            }}>
              <strong>المتوسط:</strong> {average !== null ? average.toFixed(2) : 'غير متاح'}
              <span style={{ marginLeft: '12px', color: '#64748b', fontSize: '14px' }}>
                ({filteredGrades.length} درجة)
              </span>
            </div>
          )}
          {isFiltered && filteredGrades.length === 0 && (
            <div style={{ 
              padding: '8px 16px', 
              background: '#fef2f2', 
              borderRadius: '8px',
              border: '1px solid #fca5a5',
              color: '#991b1b'
            }}>
              <i className="fas fa-exclamation-circle"></i> لا توجد درجات تطابق الفلتر المحدد
            </div>
          )}
        </div>
      </div>

      {/* Grades Table - Show filtered or all grades */}
      <div className="card">
        <div className="section-title">
          <span>
            {selectedStudent && selectedExam 
              ? `درجات ${getStudentName(parseInt(selectedStudent))} - ${getExamName(parseInt(selectedExam))}`
              : selectedStudent
              ? `درجات ${getStudentName(parseInt(selectedStudent))}`
              : selectedExam
              ? `درجات ${getExamName(parseInt(selectedExam))}`
              : 'جميع الدرجات'
            }
          </span>
          <span style={{ fontSize: '14px', color: '#64748b' }}>
            {displayData.length} درجة
          </span>
        </div>
        {displayData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <i className="fas fa-search" style={{ fontSize: '48px', marginBottom: '16px' }}></i>
            <p>لم يتم العثور على درجات</p>
            <p style={{ fontSize: '14px' }}>{isFiltered ? 'حاول تغيير معايير التصفية.' : 'لا توجد درجات مسجلة بعد.'}</p>
          </div>
        ) : (
          <DataTable<Note> 
            columns={displayColumns} 
            data={displayData} 
          />
        )}
      </div>

      {/* Modal for Batch Grade Entry */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>{editingGrade ? 'تعديل الدرجات' : 'إضافة درجات متعددة'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleBatchSubmit} className="modal-form">
              {/* Student Selection */}
              <div className="form-group">
                <label>الطالب *</label>
                <SearchableSelect
                  value={batchFormData.student_id}
                  onChange={(value) => setBatchFormData({ ...batchFormData, student_id: value })}
                  options={students.map(student => ({
                    value: student.numero.toString(),
                    label: `${student.nom} (الفصل: ${(() => {
                      const cls = classes.find(c => c.id === student.cls_id);
                      return cls ? `${cls.label}${cls.abrev ? ` (${cls.abrev})` : ''}` : 'غير متاح';
                    })()})`,
                  }))}
                  placeholder="اختر الطالب"
                />
              </div>

              {/* Exam Selection */}
              <div className="form-group">
                <label>الامتحان *</label>
                <SearchableSelect
                  value={batchFormData.examen_id}
                  onChange={(value) => setBatchFormData({ ...batchFormData, examen_id: value })}
                  options={exams.map(exam => ({
                    value: exam.num.toString(),
                    label: exam.type,
                  }))}
                  placeholder="اختر الامتحان"
                />
              </div>

              {/* Class Info */}
              {studentExamGrades && (
                <div style={{ 
                  padding: '12px 16px', 
                  background: '#f8fafc', 
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '8px'
                }}>
                  <strong>الفصل:</strong> {studentExamGrades.class_label}
                  {studentExamGrades.class_abrev && (
                    <span style={{ marginLeft: '8px', color: '#64748b' }}>
                      ({studentExamGrades.class_abrev})
                    </span>
                  )}
                  <span style={{ marginLeft: '16px' }}>
                    <strong>الطالب:</strong> {studentExamGrades.student_name}
                  </span>
                  <span style={{ marginLeft: '16px' }}>
                    <strong>المستوى:</strong> {
                      (() => {
                        const cls = classes.find(c => c.id === studentExamGrades.class_id);
                        const level = levels.find(l => l.id === cls?.niv_id);
                        return level?.description || 'غير محدد';
                      })()
                    }
                  </span>
                </div>
              )}

              {/* Grade Inputs */}
              {loadingGrades ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#2a6df4' }}></i>
                  <p style={{ marginTop: '12px', color: '#64748b' }}>جاري تحميل المواد والدرجات...</p>
                </div>
              ) : studentExamGrades ? (
                <div className="batch-grades-grid">
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '2fr 1fr 1.5fr',
                    gap: '12px',
                    padding: '8px 0',
                    fontWeight: 600,
                    borderBottom: '2px solid #e2e8f0',
                    color: '#475569'
                  }}>
                    <div>المادة</div>
                    <div>المعامل</div>
                    <div>{getGradeLabel(studentExamGrades.class_id)}</div>
                  </div>
                  
                  {studentExamGrades.subjects.map((subject) => {
                    const maxGrade = getMaxGrade(studentExamGrades.class_id);
                    const inputProps = getGradeInputProps(studentExamGrades.class_id);
                    return (
                      <div key={subject.subject_id} style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 1fr 1.5fr',
                        gap: '12px',
                        padding: '8px 0',
                        alignItems: 'center',
                        borderBottom: '1px solid #f1f5f9'
                      }}>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>
                          {subject.subject_name}
                        </div>
                        <div style={{ color: '#64748b' }}>
                          {subject.coefficient_value}
                        </div>
                        <div>
                          <input
                            type="number"
                            step={inputProps.step}
                            min={inputProps.min}
                            max={inputProps.max}
                            value={subject.grade_value !== null && subject.grade_value !== undefined ? subject.grade_value : ''}
                            onChange={(e) => handleGradeChange(subject.subject_id, e.target.value)}
                            placeholder={`0-${maxGrade}`}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: subject.grade_value !== null && subject.grade_value !== undefined 
                                ? '2px solid #2a6df4' 
                                : '1px solid #e2e8f0',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontFamily: 'inherit',
                              background: subject.grade_id ? '#f0fdf4' : 'white'
                            }}
                          />
                          {subject.grade_id && (
                            <small style={{ color: '#0f7b3a', display: 'block', marginTop: '2px' }}>
                              <i className="fas fa-check-circle"></i> درجة موجودة
                            </small>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '12px', 
                    background: '#f8fafc', 
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#64748b'
                  }}>
                    <i className="fas fa-info-circle"></i> 
                    {' '}أدخل درجات كل مادة. اتركها فارغة للتخطي.
                    {studentExamGrades.subjects.some(s => s.grade_id) && (
                      <span style={{ marginLeft: '12px', color: '#0f7b3a' }}>
                        <i className="fas fa-check-circle"></i> سيتم تحديث الدرجات الموجودة
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <i className="fas fa-user" style={{ fontSize: '32px', marginBottom: '12px' }}></i>
                  <p>اختر طالباً وامتحاناً لتحميل المواد</p>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={!studentExamGrades || savingGrades}
                >
                  {savingGrades ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> جاري الحفظ...
                    </>
                  ) : (
                    'حفظ جميع الدرجات'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Per-Subject Grade Entry */}
      {showSubjectModal && (
        <div className="modal-overlay" onClick={() => setShowSubjectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>إضافة درجات حسب المادة</h2>
              <button className="modal-close" onClick={() => setShowSubjectModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubjectSubmit} className="modal-form">
              {/* Class Selection */}
              <div className="form-group">
                <label>الفصل *</label>
                <SearchableSelect
                  value={subjectFormData.classe_id}
                  onChange={(value) => setSubjectFormData({ ...subjectFormData, classe_id: value })}
                  options={classes.map(cls => ({
                    value: cls.id.toString(),
                    label: cls.abrev ? `${cls.label} (${cls.abrev})` : cls.label,
                  }))}
                  placeholder="اختر الفصل"
                />
              </div>

              {/* Subject Selection */}
              <div className="form-group">
                <label>المادة *</label>
                <SearchableSelect
                  value={subjectFormData.matiere_id}
                  onChange={(value) => setSubjectFormData({ ...subjectFormData, matiere_id: value })}
                  options={subjects.map(sub => ({
                    value: sub.identifient.toString(),
                    label: sub.description,
                  }))}
                  placeholder="اختر المادة"
                />
              </div>

              {/* Exam Selection */}
              <div className="form-group">
                <label>الامتحان *</label>
                <SearchableSelect
                  value={subjectFormData.examen_id}
                  onChange={(value) => setSubjectFormData({ ...subjectFormData, examen_id: value })}
                  options={exams.map(exam => ({
                    value: exam.num.toString(),
                    label: exam.type,
                  }))}
                  placeholder="اختر الامتحان"
                />
              </div>

              {/* Info banner */}
              {subjectClassGrades && (
                <div style={{
                  padding: '12px 16px', background: '#f8fafc', borderRadius: '8px',
                  border: '1px solid #e2e8f0', marginBottom: '8px'
                }}>
                  <strong>الفصل:</strong> {subjectClassGrades.class_label}
                  {subjectClassGrades.class_abrev && (
                    <span style={{ marginLeft: '8px', color: '#64748b' }}>
                      ({subjectClassGrades.class_abrev})
                    </span>
                  )}
                  {subjectClassGrades.coefficient_value != null && (
                    <span style={{ marginLeft: '16px' }}>
                      <strong>المعامل:</strong> {subjectClassGrades.coefficient_value}
                    </span>
                  )}
                  <span style={{ marginLeft: '16px' }}>
                    <strong>المستوى:</strong> {
                      (() => {
                        const cls = classes.find(c => c.id === subjectClassGrades?.class_id);
                        const level = levels.find(l => l.id === cls?.niv_id);
                        return level?.description || 'غير محدد';
                      })()
                    }
                  </span>
                </div>
              )}

              {/* Grade Inputs */}
              {loadingSubjectGrades ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#2a6df4' }}></i>
                  <p style={{ marginTop: '12px', color: '#64748b' }}>جاري تحميل الدرجات...</p>
                </div>
              ) : subjectClassGrades ? (
                <div>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2fr 1.5fr',
                    gap: '12px', padding: '8px 0', fontWeight: 600,
                    borderBottom: '2px solid #e2e8f0', color: '#475569'
                  }}>
                    <div>الطالب</div>
                    <div>{getGradeLabel(subjectClassGrades.class_id)}</div>
                  </div>
                  {subjectClassGrades.students.map(student => {
                    const maxGrade = getMaxGrade(subjectClassGrades.class_id);
                    const inputProps = getGradeInputProps(subjectClassGrades.class_id);
                    return (
                      <div key={student.student_id} style={{
                        display: 'grid', gridTemplateColumns: '2fr 1.5fr',
                        gap: '12px', padding: '8px 0', alignItems: 'center',
                        borderBottom: '1px solid #f1f5f9'
                      }}>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>
                          {student.student_name}
                        </div>
                        <div>
                          <input
                            type="number"
                            step={inputProps.step}
                            min={inputProps.min}
                            max={inputProps.max}
                            value={student.grade_value !== null && student.grade_value !== undefined ? student.grade_value : ''}
                            onChange={(e) => handleSubjectGradeChange(student.student_id, e.target.value)}
                            placeholder={`0-${maxGrade}`}
                            style={{
                              width: '100%', padding: '8px 12px',
                              border: student.grade_value !== null && student.grade_value !== undefined
                                ? '2px solid #2a6df4' : '1px solid #e2e8f0',
                              borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit',
                              background: student.grade_id ? '#f0fdf4' : 'white'
                            }}
                          />
                          {student.grade_id && (
                            <small style={{ color: '#0f7b3a', display: 'block', marginTop: '2px' }}>
                              <i className="fas fa-check-circle"></i> درجة موجودة
                            </small>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{
                    marginTop: '12px', padding: '12px', background: '#f8fafc',
                    borderRadius: '8px', fontSize: '14px', color: '#64748b'
                  }}>
                    <i className="fas fa-info-circle"></i>
                    {' '}أدخل درجات الطلاب في هذه المادة. اتركها فارغة للتخطي. 
                    {subjectClassGrades.students.some(s => s.grade_id) && (
                      <span style={{ marginLeft: '12px', color: '#0f7b3a' }}>
                        <i className="fas fa-check-circle"></i> سيتم تحديث الدرجات الموجودة
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <i className="fas fa-book" style={{ fontSize: '32px', marginBottom: '12px' }}></i>
                  <p>اختر فصلاً ومادة وامتحاناً لتحميل قائمة الدرجات</p>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setShowSubjectModal(false)}>
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!subjectClassGrades || savingSubjectGrades}
                >
                  {savingSubjectGrades ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> جاري الحفظ...
                    </>
                  ) : (
                    'حفظ جميع الدرجات'
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
// src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Stats } from '../types';
import { StatsCard } from '../components/Common/StatsCard';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await apiService.getStats();
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleAddStudent = () => {
    navigate('/students?action=add');
  };

  const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // If the value contains commas, quotes, or newlines, wrap it in quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const convertToCSV = (data: any[], headers: string[], fieldMap: Record<string, string>): string => {
    // Create header row
    const headerRow = headers.map(h => escapeCsvValue(h)).join(',');
    
    // Create data rows
    const rows = data.map(item => {
      return headers.map(header => {
        const field = fieldMap[header];
        return escapeCsvValue(field ? item[field] : '');
      }).join(',');
    });
    
    return [headerRow, ...rows].join('\n');
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      // Fetch all data
      const [studentsRes, classesRes, subjectsRes, gradesRes, examsRes, coefficientsRes] = await Promise.all([
        apiService.getStudents(),
        apiService.getClasses(),
        apiService.getSubjects(),
        apiService.getGrades(),
        apiService.getExams(),
        apiService.getCoefficients(),
      ]);

      const students = studentsRes.eleves || [];
      const classes = classesRes.classes || [];
      const subjects = subjectsRes.matieres || [];
      const grades = gradesRes.notes || [];
      const exams = examsRes.examens || [];
      const coefficients = coefficientsRes.coefficients || [];

      // Create CSV files for each data type
      const csvFiles: { name: string; data: string }[] = [];

      // 1. Students CSV
      if (students.length > 0) {
        const studentHeaders = ['ID', 'Name', 'Residence', 'Phone', 'Tutor', 'Class ID', 'Status'];
        const studentFieldMap: Record<string, string> = {
          'ID': 'numero',
          'Name': 'nom',
          'Residence': 'residence',
          'Phone': 'tel',
          'Tutor': 'nom_tut',
          'Class ID': 'cls_id',
          'Status': 'etat'
        };
        const studentCSV = convertToCSV(students, studentHeaders, studentFieldMap);
        csvFiles.push({ name: 'students', data: studentCSV });
      }

      // 2. Classes CSV
      if (classes.length > 0) {
        const classHeaders = ['ID', 'Label', 'Abbreviation', 'Fil', 'Max Students', 'Level ID'];
        const classFieldMap: Record<string, string> = {
          'ID': 'id',
          'Label': 'label',
          'Abbreviation': 'abrev',
          'Fil': 'fil',
          'Max Students': 'nb_mx_el',
          'Level ID': 'niv_id'
        };
        const classCSV = convertToCSV(classes, classHeaders, classFieldMap);
        csvFiles.push({ name: 'classes', data: classCSV });
      }

      // 3. Subjects CSV
      if (subjects.length > 0) {
        const subjectHeaders = ['ID', 'Subject Name', 'Language'];
        const subjectFieldMap: Record<string, string> = {
          'ID': 'identifient',
          'Subject Name': 'description',
          'Language': 'language'
        };
        const subjectCSV = convertToCSV(subjects, subjectHeaders, subjectFieldMap);
        csvFiles.push({ name: 'subjects', data: subjectCSV });
      }

      // 4. Grades CSV
      if (grades.length > 0) {
        const gradeHeaders = ['ID', 'Value', 'Subject ID', 'Class ID', 'Student ID', 'Exam ID', 'Coefficient ID'];
        const gradeFieldMap: Record<string, string> = {
          'ID': 'id',
          'Value': 'valeur',
          'Subject ID': 'mat_id',
          'Class ID': 'classe_id',
          'Student ID': 'ele_id',
          'Exam ID': 'examen_id',
          'Coefficient ID': 'coef_id'
        };
        const gradeCSV = convertToCSV(grades, gradeHeaders, gradeFieldMap);
        csvFiles.push({ name: 'grades', data: gradeCSV });
      }

      // 5. Exams CSV
      if (exams.length > 0) {
        const examHeaders = ['ID', 'Type', 'Coefficient'];
        const examFieldMap: Record<string, string> = {
          'ID': 'num',
          'Type': 'type',
          'Coefficient': 'coeficient'
        };
        const examCSV = convertToCSV(exams, examHeaders, examFieldMap);
        csvFiles.push({ name: 'exams', data: examCSV });
      }

      // 6. Coefficients CSV
      if (coefficients.length > 0) {
        const coeffHeaders = ['ID', 'Subject ID', 'Class ID', 'Level ID', 'Value'];
        const coeffFieldMap: Record<string, string> = {
          'ID': 'id',
          'Subject ID': 'mat_id',
          'Class ID': 'cl_id',
          'Level ID': 'niv_id',
          'Value': 'valeur'
        };
        const coeffCSV = convertToCSV(coefficients, coeffHeaders, coeffFieldMap);
        csvFiles.push({ name: 'coefficients', data: coeffCSV });
      }

      // Create a zip-like download (multiple CSV files)
      if (csvFiles.length === 0) {
        alert('لا توجد بيانات متاحة للتصدير');
        setExporting(false);
        return;
      }

      // If only one CSV, download it directly
      if (csvFiles.length === 1) {
        downloadCSV(csvFiles[0].data, csvFiles[0].name);
      } else {
        // For multiple CSVs, download them one by one or create a zip
        // For simplicity, we'll download each CSV separately
        for (const file of csvFiles) {
          downloadCSV(file.data, file.name);
        }
        alert(`✅ تم تصدير ${csvFiles.length} ملف CSV بنجاح!`);
      }

    } catch (err: any) {
      alert('فشل تصدير البيانات: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const downloadCSV = (csvData: string, fileName: string) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Export all data as a single combined CSV
  const handleExportCombinedCSV = async () => {
    setExporting(true);
    try {
      const [studentsRes, classesRes, subjectsRes, gradesRes, examsRes, coefficientsRes] = await Promise.all([
        apiService.getStudents(),
        apiService.getClasses(),
        apiService.getSubjects(),
        apiService.getGrades(),
        apiService.getExams(),
        apiService.getCoefficients(),
      ]);

      const students = studentsRes.eleves || [];
      const classes = classesRes.classes || [];
      const subjects = subjectsRes.matieres || [];
      const grades = gradesRes.notes || [];
      const exams = examsRes.examens || [];
      const coefficients = coefficientsRes.coefficients || [];

      // Create a combined CSV with sections
      let combinedCSV = '';
      
      // Students section
      combinedCSV += '=== STUDENTS ===\n';
      const studentHeaders = ['ID', 'Name', 'Residence', 'Phone', 'Tutor', 'Class ID', 'Status'];
      const studentFieldMap: Record<string, string> = {
        'ID': 'numero',
        'Name': 'nom',
        'Residence': 'residence',
        'Phone': 'tel',
        'Tutor': 'nom_tut',
        'Class ID': 'cls_id',
        'Status': 'etat'
      };
      combinedCSV += convertToCSV(students, studentHeaders, studentFieldMap) + '\n\n';
      
      // Classes section
      combinedCSV += '=== CLASSES ===\n';
      const classHeaders = ['ID', 'Label', 'Abbreviation', 'Fil', 'Max Students', 'Level ID'];
      const classFieldMap: Record<string, string> = {
        'ID': 'id',
        'Label': 'label',
        'Abbreviation': 'abrev',
        'Fil': 'fil',
        'Max Students': 'nb_mx_el',
        'Level ID': 'niv_id'
      };
      combinedCSV += convertToCSV(classes, classHeaders, classFieldMap) + '\n\n';
      
      // Subjects section
      combinedCSV += '=== SUBJECTS ===\n';
      const subjectHeaders = ['ID', 'Subject Name', 'Language'];
      const subjectFieldMap: Record<string, string> = {
        'ID': 'identifient',
        'Subject Name': 'description',
        'Language': 'language'
      };
      combinedCSV += convertToCSV(subjects, subjectHeaders, subjectFieldMap) + '\n\n';
      
      // Grades section
      combinedCSV += '=== GRADES ===\n';
      const gradeHeaders = ['ID', 'Value', 'Subject ID', 'Class ID', 'Student ID', 'Exam ID', 'Coefficient ID'];
      const gradeFieldMap: Record<string, string> = {
        'ID': 'id',
        'Value': 'valeur',
        'Subject ID': 'mat_id',
        'Class ID': 'classe_id',
        'Student ID': 'ele_id',
        'Exam ID': 'examen_id',
        'Coefficient ID': 'coef_id'
      };
      combinedCSV += convertToCSV(grades, gradeHeaders, gradeFieldMap) + '\n\n';
      
      // Exams section
      combinedCSV += '=== EXAMS ===\n';
      const examHeaders = ['ID', 'Type', 'Coefficient'];
      const examFieldMap: Record<string, string> = {
        'ID': 'num',
        'Type': 'type',
        'Coefficient': 'coeficient'
      };
      combinedCSV += convertToCSV(exams, examHeaders, examFieldMap) + '\n\n';
      
      // Coefficients section
      combinedCSV += '=== COEFFICIENTS ===\n';
      const coeffHeaders = ['ID', 'Subject ID', 'Class ID', 'Level ID', 'Value'];
      const coeffFieldMap: Record<string, string> = {
        'ID': 'id',
        'Subject ID': 'mat_id',
        'Class ID': 'cl_id',
        'Level ID': 'niv_id',
        'Value': 'valeur'
      };
      combinedCSV += convertToCSV(coefficients, coeffHeaders, coeffFieldMap);

      downloadCSV(combinedCSV, 'complete_export');

      alert('✅ تم تصدير CSV المدمج بنجاح!');

    } catch (err: any) {
      alert('فشل تصدير البيانات: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchStats} />;

  return (
    <div className="dashboard">
      <header className="content-header">
        <h1>لوحة التحكم</h1>
        <div className="header-actions">
          <button className="btn-outline">
            <i className="fas fa-calendar-alt"></i> 2026 · Q2
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <StatsCard label="الطلاب" value={stats?.totalStudents || 0} icon="fa-user-graduate" />
        <StatsCard label="الفصول" value={stats?.totalClasses || 0} icon="fa-building-columns" />
        <StatsCard label="المواد" value={stats?.totalSubjects || 0} icon="fa-book" />
        <StatsCard label="نسبة الحضور" value={stats?.attendanceRate || '0%'} icon="fa-clipboard-check" />
      </section>

      <div className="main-grid">
        <div className="card">
          <div className="section-title"><span>الإحصائيات</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div><strong>إجمالي المواد:</strong> {stats?.totalSubjects || 0}</div>
            <div><strong>متوسط الدرجات:</strong> {stats?.averageGrade ?? 'غير متاح'}</div>
            <div><strong>إجمالي الطلاب:</strong> {stats?.totalStudents || 0}</div>
            <div><strong>إجمالي الفصول:</strong> {stats?.totalClasses || 0}</div>
          </div>
        </div>
        
        <div className="card">
          <div className="section-title"><span>إجراءات سريعة</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              className="btn-primary" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleAddStudent}
            >
              <i className="fas fa-plus"></i> إضافة طالب جديد
            </button>
            <button 
              className="btn-outline" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleExportCSV}
              disabled={exporting}
            >
              {exporting ? (
                <><i className="fas fa-spinner fa-spin"></i> جاري التصدير...</>
              ) : (
                <><i className="fas fa-file-csv"></i> تصدير الكل (CSV)</>
              )}
            </button>
            <button 
              className="btn-outline" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleExportCombinedCSV}
              disabled={exporting}
            >
              {exporting ? (
                <><i className="fas fa-spinner fa-spin"></i> جاري التصدير...</>
              ) : (
                <><i className="fas fa-file-export"></i> تصدير مدمج (CSV)</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { Eleve, Classe, Examen } from '../types';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';
import { ErrorMessage } from '../components/Common/ErrorMessage';
import { SearchableSelect } from '../components/Common/SearchableSelect';
import entBg from '../assets/ent.jpg';
import './Bulletin.css';

interface BulletinData {
  student: {
    numero: number;
    nom: string;
    residence: string;
    tel: string;
    nom_tut: string;
    date_entre: string;
    date_sortie: string;
  };
  niveau: string | null;
  class: {
    id: number;
    label: string;
    abrev?: string | null;
    niveau: string | null;
  };
  subjects: Array<{
    subject_id: number;
    subject_name: string;
    subject_language?: string;
    coefficient: number;
    compositions: Array<{
      exam_id: number;
      exam_name: string;
      grade: number | null;
      coefficient: number;
    }>;
    homework: Array<{
      homework_id: number;
      date: string | null;
      grade: number;
    }>;
    average_composition: number | null;
    average_homework: number | null;
    overall_average: number | null;
    subject_avg_first_comp?: number | null;
    subject_avg_second_comp?: number | null;
    subject_avg_third_comp?: number | null;
  }>;
  overall_average: number | null;
  overall_avg_first_comp?: number | null;
  overall_avg_second_comp?: number | null;
  overall_avg_third_comp?: number | null;
  promotion?: {
    eligible: boolean;
    status: string;
    next_class: {
      id: number;
      label: string;
      abrev: string | null;
    } | null;
  } | null;
}

export const BulletinPage: React.FC = () => {
  const [students, setStudents] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [exams, setExams] = useState<Examen[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [bulletinType, setBulletinType] = useState<'annual' | 'composition'>('annual');
  const [selectedCompositionExam, setSelectedCompositionExam] = useState<string>('');
  const [bulletin, setBulletin] = useState<BulletinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBulletin, setLoadingBulletin] = useState(false);
  const [printingAll, setPrintingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [studentsRes, examsRes, classesRes] = await Promise.all([
          apiService.getStudents(),
          apiService.getExams(),
          apiService.getClasses(),
        ]);
        setStudents(studentsRes.eleves || []);
        setExams((examsRes.examens || []).filter(e => e.type !== 'واجبات' && e.num !== 4));
        setClasses(classesRes.classes || []);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'فشل تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchBulletin = async () => {
    if (!selectedStudent) {
      alert('يرجى اختيار طالب');
      return;
    }

    setLoadingBulletin(true);
    setError(null);
    try {
      const data = await apiService.getStudentBulletin(parseInt(selectedStudent));
      if (!data || !data.subjects) {
        throw new Error('بيانات الكشوف غير صالحة');
      }
      setBulletin(data);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل الكشوف');
      setBulletin(null);
    } finally {
      setLoadingBulletin(false);
    }
  };

  const getAcademicYear = () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    return currentMonth < 10 ? `${currentYear - 1}-${currentYear}` : `${currentYear}-${currentYear + 1}`;
  };

  const gradeClass = (grade: number | null | undefined, threshold = 10) => {
    if (grade === null || grade === undefined) return 'grade-default';
    return grade >= threshold ? 'grade-pass' : 'grade-fail';
  };

  const getSubjectAvgForExam = (subject: any, examId: number) => {
    if (examId === 1) return subject.subject_avg_first_comp ?? null;
    if (examId === 2) return subject.subject_avg_second_comp ?? null;
    if (examId === 3) return subject.subject_avg_third_comp ?? null;
    return null;
  };

  const getOverallAvgForExam = (data: BulletinData, examId: number) => {
    if (examId === 1) {
      if (data.overall_avg_first_comp === undefined || data.overall_avg_first_comp === null) {
        throw new Error('معدل الفصل الأول غير متاح في النظام');
      }
      return data.overall_avg_first_comp;
    }
    if (examId === 2) {
      if (data.overall_avg_second_comp === undefined || data.overall_avg_second_comp === null) {
        throw new Error('معدل الفصل الثاني غير متاح في النظام');
      }
      return data.overall_avg_second_comp;
    }
    if (examId === 3) {
      if (data.overall_avg_third_comp === undefined || data.overall_avg_third_comp === null) {
        throw new Error('معدل الفصل الثالث غير متاح في النظام');
      }
      return data.overall_avg_third_comp;
    }
    throw new Error('رقم الامتحان غير صالح');
  };

  const renderBulletinHtml = (data: BulletinData): string => {
    if (!data || !data.subjects) return '';
    const isPrimary = parseInt(data.class?.niveau ?? '0') === 1;
    const isComposition = bulletinType === 'composition';
    const examId = parseInt(selectedCompositionExam);

    let html = '';
    html += `<div class="student-info">
      <div class="info-grid">
        <div class="info-item"><label>السنة الدراسية:</label><span>${getAcademicYear()}</span></div>
        <div class="info-item"><label>التاريخ:</label><span>${new Date().toLocaleDateString()}</span></div>
        <div class="info-item"><label>اسم الطالب:</label><span>${data.student?.nom || 'غير متاح'}</span></div>
        <div class="info-item"><label>رقم الطالب:</label><span>${data.student?.numero || 'غير متاح'}</span></div>
        <div class="info-item"><label>الفصل:</label><span>${data.class?.label || 'غير متاح'}${data.class?.abrev ? ` (${data.class.abrev})` : ''}</span></div>
        <div class="info-item"><label>المستوى:</label><span>${data.niveau || 'غير متاح'}</span></div>
        ${isComposition ? `<div class="info-item"><label>الامتحان:</label><span>${exams.find(e => e.num === examId)?.type || ''}</span></div>` : ''}
      </div>
    </div>`;

    if (isPrimary && !isComposition) {
      const subjects = data.subjects || [];
      const arabicSubjects = subjects.filter((s: any) => s.subject_language?.toLowerCase() === 'arabic' || !s.subject_language || s.subject_language.toLowerCase() !== 'french');
      const frenchSubjects = subjects.filter((s: any) => s.subject_language?.toLowerCase() === 'french');
      const otherSubjects = subjects.filter((s: any) => !arabicSubjects.includes(s) && !frenchSubjects.includes(s));
      const allArabicSubjects = [...arabicSubjects, ...otherSubjects];
      const maxRows = Math.max(allArabicSubjects.length, frenchSubjects.length);
      
      const promotionStatus = data.promotion?.status || '';
      const rowSpan = maxRows + 1; // +1 for the sum row

      let arabicSumAvg = 0, arabicTotalCoefs = 0;
      allArabicSubjects.forEach((subject: any) => {
        const avg = subject.overall_average;
        arabicTotalCoefs += subject.coefficient || 0;
        if (avg !== null && avg !== undefined) { arabicSumAvg += avg; }
      });

      let frenchSumAvg = 0, frenchTotalCoefs = 0;
      frenchSubjects.forEach((subject: any) => {
        const avg = subject.overall_average;
        frenchTotalCoefs += subject.coefficient || 0;
        if (avg !== null && avg !== undefined) { frenchSumAvg += avg; }
      });

      html += `<div class="primary-bulletin-grid"><table class="primary-subject-table">
        <thead>
          <tr><th colspan="3" class="column-title arabic-title">المواد العربية</th><th colspan="3" class="column-title french-title">المواد الفرنسية</th><th class="column-title" style="background: #e2e8f0;">الملاحظات</th></tr>
          <tr><th>المادة</th><th>المعدل</th><th>الضارب</th><th>المادة</th><th>المعدل</th><th>المعامل</th><th></th></tr>
        </thead><tbody>`;
      for (let i = 0; i < maxRows; i++) {
        const aSub = allArabicSubjects[i];
        const fSub = frenchSubjects[i];
        const aAvg = aSub?.overall_average;
        const aCoef = aSub?.coefficient || 0;
        const fAvg = fSub?.overall_average;
        const fCoef = fSub?.coefficient || 0;
        if (i === 0) {
          html += `<tr>
            <td class="subject-name">${aSub?.subject_name || ''}</td>
            <td class="${gradeClass(aAvg, aCoef / 2)}">${aAvg !== null && aAvg !== undefined ? aAvg.toFixed(2) : ''}</td>
            <td>${aCoef || ''}</td>
            <td class="subject-name">${fSub?.subject_name || ''}</td>
            <td class="${gradeClass(fAvg, fCoef / 2)}">${fAvg !== null && fAvg !== undefined ? fAvg.toFixed(2) : ''}</td>
            <td>${fCoef || ''}</td>
            <td rowSpan={rowSpan} style={{ textAlign: 'center', fontWeight: 700, background: '#f1f5f9', verticalAlign: 'middle', fontSize: '14px', color: '#0b1a33' }}>
              <span className="vertical-text">{promotionStatus}</span>
            </td>
          </tr>`;
        } else {
          html += `<tr>
            <td class="subject-name">${aSub?.subject_name || ''}</td>
            <td class="${gradeClass(aAvg, aCoef / 2)}">${aAvg !== null && aAvg !== undefined ? aAvg.toFixed(2) : ''}</td>
            <td>${aCoef || ''}</td>
            <td class="subject-name">${fSub?.subject_name || ''}</td>
            <td class="${gradeClass(fAvg, fCoef / 2)}">${fAvg !== null && fAvg !== undefined ? fAvg.toFixed(2) : ''}</td>
            <td>${fCoef || ''}</td>
          </tr>`;
        }
      }
      html += `<tr class="sum-row" style="border-top:2px dashed #ccc">
        <td><strong>المجموع</strong></td><td><strong>${arabicSumAvg.toFixed(2)}</strong></td><td><strong>${arabicTotalCoefs}</strong></td>
        <td><strong>المجموع</strong></td><td><strong>${frenchSumAvg.toFixed(2)}</strong></td><td><strong>${frenchTotalCoefs}</strong></td>
      </tr>`;
      html += `</tbody></table></div>`;
      html += `<div class="overall-average-row"><div class="overall-average-label"><strong>المعدل العام:</strong></div>
        <div class="overall-average-value ${gradeClass(data.overall_average)}">${data.overall_average !== null && data.overall_average !== undefined ? data.overall_average.toFixed(2) : '-'}</div></div>`;
    } else if (!isPrimary && !isComposition) {
      const subjects = data.subjects || [];
      const simpleAvg = data.overall_average;
      const examColumns = subjects[0]?.compositions
        ?.filter((c: any) => c.exam_name !== 'واجبات')
        ?.sort((a: any, b: any) => a.exam_id - b.exam_id) || [];

      const comp1 = examColumns[0];
      const comp2 = examColumns[1];
      const comp3 = examColumns[2];
      const promotionStatus = data.promotion?.status || '';
      const rowSpan = subjects.length + 1; // +1 for the stats row

      const getCompGrade = (subject: any, examId: number) => {
        const comp = subject.compositions?.find((c: any) => c.exam_id === examId);
        return comp?.grade ?? null;
      };

      html += `<div class="grades-table-container"><table class="bulletin-table">
        <thead><tr>
          <th>المادة</th>${comp1 ? `<th>${comp1.exam_name}</th>` : ''}${comp2 ? `<th>${comp2.exam_name}</th>` : ''}
          <th>معدل الاختبارات</th><th>عدد الاختبارات</th>${comp3 ? `<th>${comp3.exam_name}</th>` : ''}
          <th>معد المادة</th><th>الضارب</th><th>المجموع</th>
          <th>الملاحظات</th>
        </tr></thead><tbody>`;
      subjects.forEach((subject: any, index: number) => {
        const overallAvg = subject.overall_average;
        const coef = subject.coefficient || 1;
        const sum = overallAvg !== null && overallAvg !== undefined ? overallAvg * coef : null;
        if (index === 0) {
          html += `<tr>
            <td class="subject-name">${subject.subject_name}</td>
            ${comp1 ? `<td class="${gradeClass(getCompGrade(subject, comp1.exam_id))}">${getCompGrade(subject, comp1.exam_id) !== null ? getCompGrade(subject, comp1.exam_id) : '-'}</td>` : ''}
            ${comp2 ? `<td class="${gradeClass(getCompGrade(subject, comp2.exam_id))}">${getCompGrade(subject, comp2.exam_id) !== null ? getCompGrade(subject, comp2.exam_id) : '-'}</td>` : ''}
            <td class="${gradeClass(subject.average_homework)}">${subject.average_homework !== null && subject.average_homework !== undefined ? subject.average_homework.toFixed(1) : '-'}</td>
            <td>${subject.homework?.length || 0}</td>
            ${comp3 ? `<td class="${gradeClass(getCompGrade(subject, comp3.exam_id))}">${getCompGrade(subject, comp3.exam_id) !== null ? getCompGrade(subject, comp3.exam_id) : '-'}</td>` : ''}
            <td class="${gradeClass(overallAvg)}">${overallAvg !== null && overallAvg !== undefined ? overallAvg.toFixed(2) : '-'}</td>
            <td>${coef}</td>
            <td>${sum !== null ? sum.toFixed(2) : '-'}</td>
            td rowspan="${rowSpan}" style="text-align: center; font-weight: 700; background: #f1f5f9; vertical-align: middle; font-size: 14px; color: #0b1a33;">
              <span class="vertical-text">${promotionStatus}</span>
            </td>
          </tr>`;
        } else {
          html += `<tr>
            <td class="subject-name">${subject.subject_name}</td>
            ${comp1 ? `<td class="${gradeClass(getCompGrade(subject, comp1.exam_id))}">${getCompGrade(subject, comp1.exam_id) !== null ? getCompGrade(subject, comp1.exam_id) : '-'}</td>` : ''}
            ${comp2 ? `<td class="${gradeClass(getCompGrade(subject, comp2.exam_id))}">${getCompGrade(subject, comp2.exam_id) !== null ? getCompGrade(subject, comp2.exam_id) : '-'}</td>` : ''}
            <td class="${gradeClass(subject.average_homework)}">${subject.average_homework !== null && subject.average_homework !== undefined ? subject.average_homework.toFixed(1) : '-'}</td>
            <td>${subject.homework?.length || 0}</td>
            ${comp3 ? `<td class="${gradeClass(getCompGrade(subject, comp3.exam_id))}">${getCompGrade(subject, comp3.exam_id) !== null ? getCompGrade(subject, comp3.exam_id) : '-'}</td>` : ''}
            <td class="${gradeClass(overallAvg)}">${overallAvg !== null && overallAvg !== undefined ? overallAvg.toFixed(2) : '-'}</td>
            <td>${coef}</td>
            <td>${sum !== null ? sum.toFixed(2) : '-'}</td>
          </tr>`;
        }
      });
      html += `</tbody></table></div>`;
      html += `<div class="overall-average-row"><div class="overall-average-label"><strong>المعدل العام:</strong></div>
        <div class="overall-average-value ${gradeClass(simpleAvg)}">${simpleAvg !== null && simpleAvg !== undefined ? simpleAvg.toFixed(2) : '-'}</div></div>`;
    } else {
      const subjects = data.subjects || [];
      const examLabel = exams.find(e => e.num === examId)?.type || '';
      let overallExamAvg: number | null = null;
      try {
        overallExamAvg = getOverallAvgForExam(data, examId);
      } catch (err: any) {
        return `<div style="color: red; padding: 20px; text-align: center;">${err.message}</div>`;
      }

      const getCompGrade = (subject: any) => {
        const comp = subject.compositions?.find((c: any) => c.exam_id === examId);
        return comp?.grade ?? null;
      };

      if (isPrimary) {
        const arabicSubjects = subjects.filter((s: any) => s.subject_language?.toLowerCase() === 'arabic' || !s.subject_language || s.subject_language.toLowerCase() !== 'french');
        const frenchSubjects = subjects.filter((s: any) => s.subject_language?.toLowerCase() === 'french');
        const otherSubjects = subjects.filter((s: any) => !arabicSubjects.includes(s) && !frenchSubjects.includes(s));
        const allArabicSubjects = [...arabicSubjects, ...otherSubjects];
        const maxRows = Math.max(allArabicSubjects.length, frenchSubjects.length);

        const arabicGradeData = allArabicSubjects.map((s: any) => ({ grade: getCompGrade(s), coef: s.coefficient || 1 }));
        const frenchGradeData = frenchSubjects.map((s: any) => ({ grade: getCompGrade(s), coef: s.coefficient || 1 }));
        const arabicTotalCoefs = arabicGradeData.reduce((sum: number, s: any) => sum + s.coef, 0);
        const arabicGradeSum = arabicGradeData.reduce((sum: number, s: any) => sum + (s.grade !== null ? s.grade : 0), 0);
        const frenchTotalCoefs = frenchGradeData.reduce((sum: number, s: any) => sum + s.coef, 0);
        const frenchGradeSum = frenchGradeData.reduce((sum: number, s: any) => sum + (s.grade !== null ? s.grade : 0), 0);

        html += `<div class="primary-bulletin-grid"><table class="primary-subject-table">
          <thead>
            <tr><th colspan="3" class="column-title arabic-title">المواد العربية</th><th colspan="3" class="column-title french-title">المواد الفرنسية</th></tr>
            <tr><th>المادة</th><th>الدرجة</th><th>المعامل</th><th>المادة</th><th>الدرجة</th><th>المعامل</th></tr>
          </thead><tbody>`;
        for (let i = 0; i < maxRows; i++) {
          const aSub = allArabicSubjects[i];
          const fSub = frenchSubjects[i];
          const aGrade = aSub ? getCompGrade(aSub) : null;
          const aCoef = aSub?.coefficient || 0;
          const fGrade = fSub ? getCompGrade(fSub) : null;
          const fCoef = fSub?.coefficient || 0;
          html += `<tr>
            <td class="subject-name">${aSub?.subject_name || ''}</td>
            <td class="${gradeClass(aGrade, aCoef / 2)}">${aGrade !== null ? aGrade : ''}</td>
            <td>${aCoef || ''}</td>
            <td class="subject-name">${fSub?.subject_name || ''}</td>
            <td class="${gradeClass(fGrade, fCoef / 2)}">${fGrade !== null ? fGrade : ''}</td>
            <td>${fCoef || ''}</td>
          </tr>`;
        }
        html += `<tr class="sum-row" style="border-top:2px dashed #ccc">
          <td><strong>المجموع</strong></td><td><strong>${arabicGradeSum.toFixed(2)}</strong></td><td><strong>${arabicTotalCoefs}</strong></td>
          <td><strong>المجموع</strong></td><td><strong>${frenchGradeSum.toFixed(2)}</strong></td><td><strong>${frenchTotalCoefs}</strong></td>
        </tr>
        <tr class="sum-row"><td><strong>معدل المادة</strong></td><td><strong>${overallExamAvg !== null ? overallExamAvg.toFixed(2) : '-'}</strong></td><td></td><td></td><td></td><td></td></tr>
        </tbody></table></div>`;
      } else {
        html += `<div class="grades-table-container"><table class="bulletin-table">
          <thead><tr><th>المادة</th><th>${examLabel}</th><th>معدل الاختبارات</th><th>عدد الاختبارات</th><th>معدل المادة</th><th>المعامل</th><th>المجموع</th></tr></thead><tbody>`;
        subjects.forEach((subject: any) => {
          const grade = getCompGrade(subject);
          const subjectAvgForExam = getSubjectAvgForExam(subject, examId);
          const avgHw = subject.average_homework;
          const hwCount = (subject.homework || []).length;
          const coef = subject.coefficient || 1;
          const sum = subjectAvgForExam !== null && subjectAvgForExam !== undefined ? subjectAvgForExam * coef : null;
          html += `<tr>
            <td class="subject-name">${subject.subject_name}</td>
            <td class="${gradeClass(grade)}">${grade !== null ? grade : '-'}</td>
            <td class="${gradeClass(avgHw)}">${avgHw !== null && avgHw !== undefined ? avgHw.toFixed(1) : '-'}</td>
            <td>${hwCount}</td>
            <td class="${gradeClass(subjectAvgForExam)}">${subjectAvgForExam !== null && subjectAvgForExam !== undefined ? subjectAvgForExam.toFixed(2) : '-'}</td>
            <td>${coef}</td>
            <td>${sum !== null ? sum.toFixed(2) : '-'}</td>
          </tr>`;
        });
        html += `<tr class="total-row">
          <td><strong>معدل المادة</strong></td>
          <td></td>
          <td></td>
          <td></td>
          <td class="${gradeClass(overallExamAvg)}"><strong>${overallExamAvg !== null ? overallExamAvg.toFixed(2) : '-'}</strong></td>
          <td></td>
          <td></td>
        </tr>`;
        html += `</tbody></table></div>`;
      }
      html += `<div class="overall-average-row"><div class="overall-average-label"><strong>الملاحظات:</strong></div>
        <div class="overall-average-value ${gradeClass(overallExamAvg)}">${overallExamAvg !== null ? (overallExamAvg >= 10 ? 'ناجح' : 'راسب') : '-'}</div></div>`;
    }
    return html;
  };

  const handlePrint = async () => {
  if (printRef.current) {
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      let bgDataUrl = '';
      try {
        const resp = await fetch(entBg as string);
        const blob = await resp.blob();
        bgDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error('Failed to load background image:', e);
      }

      printWindow.document.write(`
        <html dir="rtl" lang="ar">
          <head>
            <title>كشف الدرجات - ${bulletin?.student.nom || 'الطالب'}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Cairo', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                padding: 0;
                background: white;
                color: #0b1a33;
                -webkit-font-smoothing: antialiased;
                margin: 0;
              }
              .print-wrapper {
                position: relative;
                width: 100%;
                min-height: 100vh;
              }
              @page { 
                size: A4 landscape; 
                margin: 0; 
              }
              .print-bg {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: contain;
                z-index: 0;
                background: white;
              }
              .print-content {
                position: relative;
                z-index: 1;
                padding: 0 18mm;
                width: 100%;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
              }
              .vertical-text {
                writing-mode: vertical-rl;
                text-orientation: mixed;
                letter-spacing: 2px;
                padding: 8px 4px;
                font-size: 14px;
                font-weight: 700;
                color: #0b1a33;
              }
              .student-info {
                background: rgba(248, 250, 252, 0.92) !important;
                border-radius: 6px;
                padding: 6px 14px !important;
                margin-top: 50mm !important;
                margin-bottom: 6px !important;
                border: 1px solid #cbd5e1;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .info-grid { 
                display: grid; 
                grid-template-columns: repeat(4, 1fr); 
                gap: 4px; 
              }
              .info-item { 
                display: flex; 
                flex-direction: column; 
                gap: 1px; 
                font-size: 11px; 
              }
              .info-item label { 
                font-weight: 700; 
                color: #64748b; 
                font-size: 10px; 
              }
              .info-item span { 
                color: #0b1a33; 
                font-weight: 500; 
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                font-size: 10px; 
                margin-bottom: 6px; 
                background: rgba(255, 255, 255, 0.92) !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              tr { 
                page-break-inside: avoid !important; 
                break-inside: avoid !important; 
              }
              th, td { 
                padding: 3px 6px; 
                border: 1px solid #cbd5e1; 
                text-align: center; 
                vertical-align: middle; 
              }
              .bulletin-table .subject-name, 
              .primary-subject-table .subject-name { 
                text-align: start; 
                font-weight: 600; 
                padding-inline-start: 8px; 
                color: #0b1a33; 
              }
              thead th { 
                background: #e2e8f0 !important; 
                color: #0b1a33 !important; 
                font-weight: 600; 
                font-size: 9px; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
              }
              .primary-subject-table .column-title { 
                font-size: 10px; 
                font-weight: 700; 
                padding: 4px; 
              }
              .primary-subject-table .arabic-title { 
                background: #dbeafe !important; 
                color: #1e40af !important; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
              }
              .primary-subject-table .french-title { 
                background: #fce7f3 !important; 
                color: #9d174d !important; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
              }
              tbody tr:nth-child(even) { 
                background: rgba(250, 251, 252, 0.85) !important; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
              }
              .total-row, .sum-row, .stats-row td { 
                background: #e2e8f0 !important; 
                font-weight: 700; 
                color: #0b1a33 !important; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
              }
              .overall-average-row {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                padding: 4px 12px !important;
                margin-top: 4px !important;
                background: rgba(248, 250, 252, 0.92) !important;
                border: 2px solid #0b1a33 !important;
                gap: 10px;
                max-width: 240px;
                margin-inline-start: auto;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .overall-average-label { 
                font-size: 10px; 
                color: #0b1a33; 
                font-weight: 700; 
              }
              .overall-average-value { 
                font-size: 16px; 
                font-weight: 800; 
              }
              .bulletin-footer { 
                border-top: 2px solid #e2e8f0; 
                padding-top: 8px; 
                margin-top: 8px; 
              }
              .signature-section { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 30px; 
                margin-bottom: 6px; 
              }
              .signature-line { 
                font-size: 10px; 
                color: #475569; 
                padding-top: 4px; 
                border-bottom: 1px solid #64748b; 
              }
              .grade-pass { color: #0f7b3a !important; font-weight: bold; }
              .grade-fail { color: #b34033 !important; font-weight: bold; }
              .grade-default { color: #94a3b8; }
              .no-print { display: none !important; }
              .bulletin-header { display: none !important; }
              .print-content > div:first-child {
                display: none !important;
              }
              .print-content .bulletin-container > div:first-child {
                display: none !important;
              }
              .bulletin-container {
                padding: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
                border: none !important;
                max-width: 100% !important;
                margin: 0 !important;
              }
              .primary-bulletin {
                padding: 0 !important;
              }
              .grades-table-container,
              .primary-bulletin-grid {
                margin-top: 2px !important;
                margin-bottom: 4px !important;
                border-radius: 4px;
                border: 1px solid #e2e8f0;
                background: rgba(255, 255, 255, 0.92) !important;
              }
              .primary-bulletin-grid {
                overflow-x: auto;
              }
              body {
                background: white;
              }
              @media print {
                body { background: transparent !important; }
                .print-bg { 
                  position: fixed !important;
                  object-fit: contain !important;
                }
                .print-content { background: transparent !important; }
                .vertical-text {
                  font-size: 12px !important;
                  letter-spacing: 1px !important;
                  padding: 6px 3px !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-wrapper">
              <img class="print-bg" src="${bgDataUrl}" />
              <div class="print-content">
                ${printContents}
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }
            <\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }
};

  const handlePrintAll = async () => {
    if (!selectedClass) {
      alert('يرجى اختيار الفصل');
      return;
    }

    const classStudents = students.filter(s => s.cls_id === parseInt(selectedClass));
    if (classStudents.length === 0) {
      alert('لا يوجد طلاب في هذا الفصل');
      return;
    }

    setPrintingAll(true);
    try {
      let bgDataUrl = '';
      try {
        const resp = await fetch(entBg as string);
        const blob = await resp.blob();
        bgDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error('Failed to load background image:', e);
      }

      const hasNonZeroGrade = (subjects: any[]) =>
        subjects.some((s: any) =>
          (s.compositions || []).some((c: any) => c.grade !== null && c.grade !== undefined && c.grade > 0) ||
          (s.homework || []).some((h: any) => h.grade > 0)
        );

      let allHtml = '';
      for (const student of classStudents) {
        try {
          const data: any = await apiService.getStudentBulletin(student.numero);
          if (data && data.subjects && hasNonZeroGrade(data.subjects)) {
            allHtml += `<div style="page-break-after: always;">${renderBulletinHtml(data)}</div>`;
          }
        } catch (e) {
          console.error(`Failed to fetch bulletin for ${student.nom}:`, e);
        }
      }

      if (!allHtml) {
        alert('فشل تحميل بيانات الطلاب');
        setPrintingAll(false);
        return;
      }

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const cssStyles = Array.from(document.styleSheets)
          .map(sheet => {
            try { return Array.from(sheet.cssRules || []).map(rule => rule.cssText).join('\n'); }
            catch { return ''; }
          })
          .join('\n');

        printWindow.document.write(`
    <html dir="rtl" lang="ar">
      <head>
        <title>كشوف الدرجات - ${classes.find(c => c.id === parseInt(selectedClass))?.label || 'الفصل'}</title>
        <style>
          ${cssStyles}
          .vertical-text {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            letter-spacing: 2px;
            padding: 8px 4px;
            font-size: 14px;
            font-weight: 700;
            color: #0b1a33;
          }
          .print-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; z-index: -1; }
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 10mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @media print {
            .vertical-text {
              font-size: 12px !important;
              letter-spacing: 1px !important;
              padding: 6px 3px !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-wrapper">
          <img class="print-bg" src="${bgDataUrl}" />
          ${allHtml}
        </div>
        <script>
          window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }
        <\/script>
      </body>
    </html>
  `);
        printWindow.document.close();
      }
    } catch (err: any) {
      alert('فشل طباعة الكشوف: ' + err.message);
    } finally {
      setPrintingAll(false);
    }
  };

  const renderPrimaryBulletin = () => {
    if (!bulletin) return null;

    const subjects = bulletin.subjects || [];
    const arabicSubjects = subjects.filter(s => s.subject_language?.toLowerCase() === 'arabic' || !s.subject_language || s.subject_language.toLowerCase() !== 'french');
    const frenchSubjects = subjects.filter(s => s.subject_language?.toLowerCase() === 'french');
    const otherSubjects = subjects.filter(s => !arabicSubjects.includes(s) && !frenchSubjects.includes(s));
    const allArabicSubjects = [...arabicSubjects, ...otherSubjects];

    const maxRows = Math.max(allArabicSubjects.length, frenchSubjects.length);

    let arabicSumAvg = 0, arabicTotalCoefs = 0;
    allArabicSubjects.forEach(subject => {
      const avg = subject.overall_average;
      arabicTotalCoefs += subject.coefficient || 0;
      if (avg !== null && avg !== undefined) {
        arabicSumAvg += avg;
      }
    });

    let frenchSumAvg = 0, frenchTotalCoefs = 0;
    frenchSubjects.forEach(subject => {
      const avg = subject.overall_average;
      frenchTotalCoefs += subject.coefficient || 0;
      if (avg !== null && avg !== undefined) {
        frenchSumAvg += avg;
      }
    });

    const promotionStatus = bulletin.promotion?.status || '';
    const rowSpan = maxRows + 1; // +1 for the sum row

    return (
      <div className="bulletin-container primary-bulletin" ref={printRef}>
        <div style={{ height: '200px' }}></div>

        <div className="student-info">
          <div className="info-grid">
            <div className="info-item"><label>السنة الدراسية:</label><span>{getAcademicYear()}</span></div>
            <div className="info-item"><label>التاريخ:</label><span>{new Date().toLocaleDateString()}</span></div>
            <div className="info-item"><label>اسم الطالب:</label><span>{bulletin.student?.nom || 'غير متاح'}</span></div>
            <div className="info-item"><label>رقم الطالب:</label><span>{bulletin.student?.numero || 'غير متاح'}</span></div>
            <div className="info-item"><label>الفصل:</label><span>{bulletin.class?.label || 'غير متاح'}{bulletin.class?.abrev ? ` (${bulletin.class.abrev})` : ''}</span></div>
            <div className="info-item"><label>المستوى:</label><span>{bulletin.niveau || 'غير متاح'}</span></div>
          </div>
        </div>

        <div className="primary-bulletin-grid">
          <table className="primary-subject-table">
            <thead>
              <tr>
                <th colSpan={3} className="column-title arabic-title">المواد العربية</th>
                <th colSpan={3} className="column-title french-title">المواد الفرنسية</th>
                <th className="column-title" style={{ background: '#e2e8f0' }}>الملاحظات</th>
              </tr>
              <tr>
                <th>المادة</th>
                <th>المعدل</th>
                <th>الضارب</th>
                <th>المادة</th>
                <th>المعدل</th>
                <th>المعامل</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRows }).map((_, index) => {
                const arabicSubject = allArabicSubjects[index];
                const frenchSubject = frenchSubjects[index];

                const arabicAvg = arabicSubject?.overall_average;
                const arabicCoef = arabicSubject?.coefficient || 0;

                const frenchAvg = frenchSubject?.overall_average;
                const frenchCoef = frenchSubject?.coefficient || 0;

                if (index === 0) {
                  return (
                    <tr key={index}>
                      <td className="subject-name">{arabicSubject?.subject_name || ''}</td>
                      <td className={gradeClass(arabicAvg, arabicCoef / 2)}>
                        {arabicAvg !== null && arabicAvg !== undefined ? arabicAvg.toFixed(2) : ''}
                      </td>
                      <td>{arabicCoef || ''}</td>
                      <td className="subject-name">{frenchSubject?.subject_name || ''}</td>
                      <td className={gradeClass(frenchAvg, frenchCoef / 2)}>
                        {frenchAvg !== null && frenchAvg !== undefined ? frenchAvg.toFixed(2) : ''}
                      </td>
                      <td rowSpan={rowSpan} style={{ textAlign: 'center', fontWeight: 700, background: '#f1f5f9', verticalAlign: 'middle', fontSize: '14px', color: '#0b1a33' }}>
                        <span className="vertical-text">{promotionStatus}</span>
                      </td>
                    </tr>
                  );
                } else {
                  return (
                    <tr key={index}>
                      <td className="subject-name">{arabicSubject?.subject_name || ''}</td>
                      <td className={gradeClass(arabicAvg, arabicCoef / 2)}>
                        {arabicAvg !== null && arabicAvg !== undefined ? arabicAvg.toFixed(2) : ''}
                      </td>
                      <td>{arabicCoef || ''}</td>
                      <td className="subject-name">{frenchSubject?.subject_name || ''}</td>
                      <td className={gradeClass(frenchAvg, frenchCoef / 2)}>
                        {frenchAvg !== null && frenchAvg !== undefined ? frenchAvg.toFixed(2) : ''}
                      </td>
                      <td>{frenchCoef || ''}</td>
                    </tr>
                  );
                }
              })}
              <tr className="sum-row" style={{ borderTop: '2px dashed #ccc' }}>
                <td><strong>المجموع</strong></td>
                <td><strong>{arabicSumAvg.toFixed(2)}</strong></td>
                <td><strong>{arabicTotalCoefs}</strong></td>
                <td><strong>المجموع</strong></td>
                <td><strong>{frenchSumAvg.toFixed(2)}</strong></td>
                <td><strong>{frenchTotalCoefs}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="overall-average-row">
          <div className="overall-average-label"><strong>المعدل العام:</strong></div>
          <div className={`overall-average-value ${gradeClass(bulletin.overall_average)}`}>
            {bulletin.overall_average !== null && bulletin.overall_average !== undefined ? bulletin.overall_average.toFixed(2) : '-'}
          </div>
        </div>

        <div className="bulletin-footer">
          <div className="signature-section">
            <div className="signature-line"><span>توقيع الأستاذ:</span></div>
            <div className="signature-line"><span>توقيع ولي الأمر:</span></div>
          </div>
        </div>
      </div>
    );
  };

  const renderSecondaryBulletin = () => {
    if (!bulletin) return null;

    const subjects = bulletin.subjects || [];
    const compositions = subjects.length > 0 ? subjects[0].compositions || [] : [];
    const examColumns = compositions
      .filter(c => c.exam_name !== 'واجبات')
      .sort((a, b) => a.exam_id - b.exam_id);

    const totalCoef = subjects.reduce((sum, s) => sum + (s.coefficient || 0), 0);
    const promotionStatus = bulletin.promotion?.status || '';
    const rowSpan = subjects.length + 1; // +1 for the stats row

    const collectValues = (getter: (s: any) => number | null): number[] =>
      subjects.map(getter).filter((v): v is number => v !== null && v !== undefined);

    const avgOrNull = (vals: number[]) => vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const sumOrNull = (vals: number[]) => vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;

    const comp1Grades = collectValues(s => s.compositions?.find((c: any) => c.exam_id === examColumns[0]?.exam_id)?.grade);
    const comp2Grades = collectValues(s => s.compositions?.find((c: any) => c.exam_id === examColumns[1]?.exam_id)?.grade);
    const comp3Grades = collectValues(s => s.compositions?.find((c: any) => c.exam_id === examColumns[2]?.exam_id)?.grade);
    const hwAvgs = collectValues(s => s.average_homework);
    const numHw = subjects.reduce((sum, s) => sum + (s.homework || []).length, 0);
    const subjectAvgs = collectValues(s => s.overall_average);
    const sumValues = collectValues(s => {
      const avg = s.overall_average;
      return avg !== null && avg !== undefined ? avg * (s.coefficient || 1) : null;
    });
    const totalSum = sumOrNull(sumValues);
    const simpleOverallAvg = bulletin.overall_average;

    return (
      <div className="bulletin-container" ref={printRef}>
        <div style={{ height: '200px' }}></div>

        <div className="student-info">
          <div className="info-grid">
            <div className="info-item"><label>السنة الدراسية:</label><span>{getAcademicYear()}</span></div>
            <div className="info-item"><label>التاريخ:</label><span>{new Date().toLocaleDateString()}</span></div>
            <div className="info-item"><label>اسم الطالب:</label><span>{bulletin.student?.nom || 'غير متاح'}</span></div>
            <div className="info-item"><label>رقم الطالب:</label><span>{bulletin.student?.numero || 'غير متاح'}</span></div>
            <div className="info-item"><label>الفصل:</label><span>{bulletin.class?.label || 'غير متاح'}${bulletin.class?.abrev ? ` (${bulletin.class.abrev})` : ''}</span></div>
            <div className="info-item"><label>المستوى:</label><span>{bulletin.niveau || 'غير متاح'}</span></div>
          </div>
        </div>

        <div className="grades-table-container">
          <table className="bulletin-table">
            <thead>
              <tr>
                <th>المادة</th>
                <th>الفصل الأول</th>
                <th>الفصل الثاني</th>
                <th>معدل الاختبارات</th>
                <th>عدد الاختبارات</th>
                <th>الفصل الثالث</th>
                <th>معدل المادة</th>
                <th>الضارب</th>
                <th>المجموع</th>
                <th>الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, index) => {
                const homework = subject.homework || [];
                const numHomework = homework.length;
                const avgSubject = subject.overall_average;
                const sumSubject = avgSubject !== null && avgSubject !== undefined
                  ? avgSubject * (subject.coefficient || 1)
                  : null;

                const comp1 = subject.compositions?.find((c: any) => c.exam_id === examColumns[0]?.exam_id);
                const comp2 = subject.compositions?.find((c: any) => c.exam_id === examColumns[1]?.exam_id);
                const comp3 = subject.compositions?.find((c: any) => c.exam_id === examColumns[2]?.exam_id);

                const avgHw = subject.average_homework;

                if (index === 0) {
                  return (
                    <tr key={subject.subject_id}>
                      <td className="subject-name">{subject.subject_name}</td>
                      <td className={gradeClass(comp1?.grade)}>
                        {comp1?.grade !== null && comp1?.grade !== undefined ? comp1.grade : '-'}
                      </td>
                      <td className={gradeClass(comp2?.grade)}>
                        {comp2?.grade !== null && comp2?.grade !== undefined ? comp2.grade : '-'}
                      </td>
                      <td className={gradeClass(avgHw)}>
                        {avgHw !== null && avgHw !== undefined ? avgHw.toFixed(1) : '-'}
                      </td>
                      <td>{numHomework}</td>
                      <td className={gradeClass(comp3?.grade)}>
                        {comp3?.grade !== null && comp3?.grade !== undefined ? comp3.grade : '-'}
                      </td>
                      <td className={gradeClass(avgSubject)}>
                        {avgSubject !== null && avgSubject !== undefined ? avgSubject.toFixed(2) : '-'}
                      </td>
                      <td>{subject.coefficient || '-'}</td>
                      <td>{sumSubject !== null ? sumSubject.toFixed(2) : '-'}</td>
                      <td 
                        rowSpan={rowSpan} 
                        style={{ 
                          textAlign: 'center', 
                          fontWeight: 700, 
                          background: '#f1f5f9', 
                          verticalAlign: 'middle', 
                          fontSize: '14px', 
                          color: '#0b1a33'
                        }}
                      >
                        <span className="vertical-text">{promotionStatus}</span>
                      </td>
                    </tr>
                  );
                } else {
                  return (
                    <tr key={subject.subject_id}>
                      <td className="subject-name">{subject.subject_name}</td>
                      <td className={gradeClass(comp1?.grade)}>
                        {comp1?.grade !== null && comp1?.grade !== undefined ? comp1.grade : '-'}
                      </td>
                      <td className={gradeClass(comp2?.grade)}>
                        {comp2?.grade !== null && comp2?.grade !== undefined ? comp2.grade : '-'}
                      </td>
                      <td className={gradeClass(avgHw)}>
                        {avgHw !== null && avgHw !== undefined ? avgHw.toFixed(1) : '-'}
                      </td>
                      <td>{numHomework}</td>
                      <td className={gradeClass(comp3?.grade)}>
                        {comp3?.grade !== null && comp3?.grade !== undefined ? comp3.grade : '-'}
                      </td>
                      <td className={gradeClass(avgSubject)}>
                        {avgSubject !== null && avgSubject !== undefined ? avgSubject.toFixed(2) : '-'}
                      </td>
                      <td>{subject.coefficient || '-'}</td>
                      <td>{sumSubject !== null ? sumSubject.toFixed(2) : '-'}</td>
                    </tr>
                  );
                }
              })}
            </tbody>
            <tfoot>
              <tr className="stats-row">
                <td><strong>المعدل</strong></td>
                <td>{avgOrNull(comp1Grades) !== null ? avgOrNull(comp1Grades)!.toFixed(2) : '-'}</td>
                <td>{avgOrNull(comp2Grades) !== null ? avgOrNull(comp2Grades)!.toFixed(2) : '-'}</td>
                <td>{avgOrNull(hwAvgs) !== null ? avgOrNull(hwAvgs)!.toFixed(2) : '-'}</td>
                <td></td>
                <td>{avgOrNull(comp3Grades) !== null ? avgOrNull(comp3Grades)!.toFixed(2) : '-'}</td>
                <td></td>
                <td>{totalCoef}</td>
                <td>{totalSum !== null ? totalSum.toFixed(2) : '-'}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="overall-average-row">
          <div className="overall-average-label"><strong>المعدل العام:</strong></div>
          <div className={`overall-average-value ${gradeClass(simpleOverallAvg)}`}>
            {simpleOverallAvg !== null && simpleOverallAvg !== undefined ? simpleOverallAvg.toFixed(2) : '-'}
          </div>
        </div>

        {simpleOverallAvg !== null && simpleOverallAvg !== undefined && (
          <div style={{
            padding: '10px 16px',
            marginTop: '10px',
            borderRadius: '6px',
            border: `1px solid ${simpleOverallAvg >= 9 ? '#86efac' : '#fca5a5'}`,
            background: simpleOverallAvg >= 9 ? '#f0fdf4' : '#fef2f2',
            color: simpleOverallAvg >= 9 ? '#166534' : '#991b1b',
            fontSize: '13px',
            fontWeight: 600,
            textAlign: 'center',
          }}>
            {simpleOverallAvg >= 9 ? 'ناجح' : 'راسب'}
          </div>
        )}

        <div className="bulletin-footer">
          <div className="signature-section">
            <div className="signature-line"><span>توقيع الأستاذ:</span></div>
            <div className="signature-line"><span>توقيع ولي الأمر:</span></div>
          </div>
        </div>
      </div>
    );
  };

  const renderCompositionBulletin = () => {
    if (!bulletin) return null;

    const subjects = bulletin.subjects || [];
    const examId = parseInt(selectedCompositionExam);
    const selectedExam = exams.find(e => e.num === examId);
    const examLabel = selectedExam?.type || '';
    const isPrimary = parseInt(bulletin.class?.niveau ?? '0') === 1;

    let overallExamAvg: number;
    try {
      overallExamAvg = getOverallAvgForExam(bulletin, examId);
    } catch (err: any) {
      return <ErrorMessage message={err.message} />;
    }

    const getGrade = (subject: any) => {
      const comp = subject.compositions?.find((c: any) => c.exam_id === examId);
      return comp?.grade ?? null;
    };

    const commonHeader = (
      <div className="student-info">
        <div className="info-grid">
          <div className="info-item"><label>السنة الدراسية:</label><span>{getAcademicYear()}</span></div>
          <div className="info-item"><label>التاريخ:</label><span>{new Date().toLocaleDateString()}</span></div>
          <div className="info-item"><label>اسم الطالب:</label><span>{bulletin.student?.nom || 'غير متاح'}</span></div>
          <div className="info-item"><label>رقم الطالب:</label><span>{bulletin.student?.numero || 'غير متاح'}</span></div>
          <div className="info-item"><label>الفصل:</label><span>{bulletin.class?.label || 'غير متاح'}{bulletin.class?.abrev ? ` (${bulletin.class.abrev})` : ''}</span></div>
          <div className="info-item"><label>المستوى:</label><span>{bulletin.niveau || 'غير متاح'}</span></div>
          <div className="info-item"><label>الامتحان:</label><span>{examLabel}</span></div>
        </div>
      </div>
    );

    const footerBlock = (
      <div className="bulletin-footer">
        <div className="signature-section">
          <div className="signature-line"><span>توقيع الأستاذ:</span></div>
          <div className="signature-line"><span>توقيع ولي الأمر:</span></div>
        </div>
      </div>
    );

    if (isPrimary) {
      const arabicSubjects = subjects.filter(s => s.subject_language?.toLowerCase() === 'arabic' || !s.subject_language || s.subject_language.toLowerCase() !== 'french');
      const frenchSubjects = subjects.filter(s => s.subject_language?.toLowerCase() === 'french');
      const otherSubjects = subjects.filter(s => !arabicSubjects.includes(s) && !frenchSubjects.includes(s));
      const allArabicSubjects = [...arabicSubjects, ...otherSubjects];
      const maxRows = Math.max(allArabicSubjects.length, frenchSubjects.length);

      const arabicGrades = allArabicSubjects.map(s => ({ grade: getGrade(s), coef: s.coefficient || 1 }));
      const frenchGrades = frenchSubjects.map(s => ({ grade: getGrade(s), coef: s.coefficient || 1 }));

      const arabicTotalCoefs = arabicGrades.reduce((sum, s) => sum + s.coef, 0);
      const arabicGradeSum = arabicGrades.reduce((sum, s) => sum + (s.grade !== null ? s.grade : 0), 0);

      const frenchTotalCoefs = frenchGrades.reduce((sum, s) => sum + s.coef, 0);
      const frenchGradeSum = frenchGrades.reduce((sum, s) => sum + (s.grade !== null ? s.grade : 0), 0);

      return (
        <div className="bulletin-container primary-bulletin" ref={printRef}>
          <div style={{ height: '200px' }}></div>
          {commonHeader}

          <div className="primary-bulletin-grid">
            <table className="primary-subject-table">
              <thead>
                <tr>
                  <th colSpan={3} className="column-title arabic-title">المواد العربية</th>
                  <th colSpan={3} className="column-title french-title">المواد الفرنسية</th>
                </tr>
                <tr>
                  <th>المادة</th>
                  <th>الدرجة</th>
                  <th>المعامل</th>
                  <th>المادة</th>
                  <th>الدرجة</th>
                  <th>المعامل</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxRows }).map((_, index) => {
                  const arabicSubject = allArabicSubjects[index];
                  const frenchSubject = frenchSubjects[index];
                  const arabicGrade = arabicSubject ? getGrade(arabicSubject) : null;
                  const arabicCoef = arabicSubject?.coefficient || 0;
                  const frenchGrade = frenchSubject ? getGrade(frenchSubject) : null;
                  const frenchCoef = frenchSubject?.coefficient || 0;

                  return (
                    <tr key={index}>
                      <td className="subject-name">{arabicSubject?.subject_name || ''}</td>
                      <td className={gradeClass(arabicGrade, arabicCoef / 2)}>
                        {arabicGrade !== null ? arabicGrade : ''}
                      </td>
                      <td>{arabicCoef || ''}</td>
                      <td className="subject-name">{frenchSubject?.subject_name || ''}</td>
                      <td className={gradeClass(frenchGrade, frenchCoef / 2)}>
                        {frenchGrade !== null ? frenchGrade : ''}
                      </td>
                      <td>{frenchCoef || ''}</td>
                    </tr>
                  );
                })}
                <tr className="sum-row" style={{ borderTop: '2px dashed #ccc' }}>
                  <td><strong>المجموع</strong></td>
                  <td><strong>{arabicGradeSum.toFixed(2)}</strong></td>
                  <td><strong>{arabicTotalCoefs}</strong></td>
                  <td><strong>المجموع</strong></td>
                  <td><strong>{frenchGradeSum.toFixed(2)}</strong></td>
                  <td><strong>{frenchTotalCoefs}</strong></td>
                </tr>
                <tr className="sum-row">
                  <td><strong>المعدل العام</strong></td>
                  <td><strong>{overallExamAvg.toFixed(2)}</strong></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="overall-average-row">
            <div className="overall-average-label"><strong>الملاحظات:</strong></div>
            <div className={`overall-average-value ${gradeClass(overallExamAvg)}`}>
              {overallExamAvg >= 10 ? 'ناجح' : 'راسب'}
            </div>
          </div>

          {footerBlock}
        </div>
      );
    }

    return (
      <div className="bulletin-container" ref={printRef}>
        <div style={{ height: '200px' }}></div>
        {commonHeader}

        <div className="grades-table-container">
          <table className="bulletin-table">
            <thead>
              <tr>
                <th>المادة</th>
                <th>{examLabel}</th>
                <th>معدل الاختبارات</th>
                <th>عدد الاختبارات</th>
                <th>معدل المادة</th>
                <th>المعامل</th>
                <th>المجموع</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => {
                const grade = getGrade(subject);
                const subjectAvgForExam = getSubjectAvgForExam(subject, examId);
                const homework = subject.homework || [];
                const numHomework = homework.length;
                const avgHw = subject.average_homework;
                const coef = subject.coefficient || 1;
                const sum = subjectAvgForExam !== null && subjectAvgForExam !== undefined ? subjectAvgForExam * coef : null;

                return (
                  <tr key={subject.subject_id}>
                    <td className="subject-name">{subject.subject_name}</td>
                    <td className={gradeClass(grade)}>
                      {grade !== null ? grade : '-'}
                    </td>
                    <td className={gradeClass(avgHw)}>
                      {avgHw !== null && avgHw !== undefined ? avgHw.toFixed(1) : '-'}
                    </td>
                    <td>{numHomework}</td>
                    <td className={gradeClass(subjectAvgForExam)}>
                      {subjectAvgForExam !== null && subjectAvgForExam !== undefined ? subjectAvgForExam.toFixed(2) : '-'}
                    </td>
                    <td>{coef}</td>
                    <td>{sum !== null ? sum.toFixed(2) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td><strong>معدل المادة</strong></td>
                <td></td>
                <td></td>
                <td></td>
                <td className={gradeClass(overallExamAvg)}>
                  <strong>{overallExamAvg.toFixed(2)}</strong>
                </td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="overall-average-row">
          <div className="overall-average-label"><strong>الملاحظات:</strong></div>
          <div className={`overall-average-value ${gradeClass(overallExamAvg)}`}>
            {overallExamAvg >= 10 ? 'ناجح' : 'راسب'}
          </div>
        </div>

        {footerBlock}
      </div>
    );
  };

  const renderBulletin = () => {
    if (!bulletin) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          <p>لم يتم العثور على بيانات كشف الدرجات. يرجى إنشاء كشف.</p>
        </div>
      );
    }
    if (bulletinType === 'composition') {
      return renderCompositionBulletin();
    }
    return parseInt(bulletin.class?.niveau ?? '0') === 1 ? renderPrimaryBulletin() : renderSecondaryBulletin();
  };

  if (loading) return <LoadingSpinner />;
  if (error && !bulletin) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="page-content">
      <header className="content-header">
        <h1>كشف درجات الطالب</h1>
      </header>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="selection-controls">
          <div className="form-group" style={{ flex: 1 }}>
            <label>اختر الطالب</label>
            <SearchableSelect
              value={selectedStudent}
              onChange={setSelectedStudent}
              options={students.map(student => ({
                value: student.numero.toString(),
                label: student.nom,
              }))}
              placeholder="اختر طالباً"
              isClearable={false}
            />
          </div>
          <div className="form-group" style={{ minWidth: '180px' }}>
            <label>الفصل (طباعة الكل)</label>
            <SearchableSelect
              value={selectedClass}
              onChange={setSelectedClass}
              options={classes.map(cls => ({
                value: cls.id.toString(),
                label: cls.abrev ? `${cls.label} (${cls.abrev})` : cls.label,
              }))}
              placeholder="اختر الفصل"
            />
          </div>
          <div className="form-group" style={{ minWidth: '180px' }}>
            <label>نوع الكشف</label>
            <SearchableSelect
              value={bulletinType}
              onChange={(value) => {
                if (value) {
                  setBulletinType(value as 'annual' | 'composition');
                  setBulletin(null);
                }
              }}
              options={[
                { value: 'annual', label: 'كشف سنوي' },
                { value: 'composition', label: 'كشف حسب الامتحان' },
              ]}
              placeholder="اختر النوع"
              isClearable={false}
            />
          </div>
          {bulletinType === 'composition' && (
            <div className="form-group" style={{ minWidth: '180px' }}>
              <label>الامتحان</label>
              <SearchableSelect
                value={selectedCompositionExam}
                onChange={setSelectedCompositionExam}
                options={exams.map(exam => ({
                  value: exam.num.toString(),
                  label: exam.type,
                }))}
                placeholder="اختر الامتحان"
              />
            </div>
          )}
          <div className="button-group">
            <button
              className="btn-primary"
              onClick={fetchBulletin}
              disabled={!selectedStudent || loadingBulletin || (bulletinType === 'composition' && !selectedCompositionExam)}
            >
              {loadingBulletin ? <><i className="fas fa-spinner fa-spin"></i> جاري التحميل...</> : <><i className="fas fa-file-alt"></i> إنشاء كشف الدرجات</>}
            </button>
            {bulletin && <button className="btn-success no-print" onClick={handlePrint}><i className="fas fa-print"></i> طباعة</button>}
            <button
              className="btn-outline no-print"
              onClick={handlePrintAll}
              disabled={!selectedClass || printingAll}
            >
              {printingAll ? <><i className="fas fa-spinner fa-spin"></i> جاري التحميل...</> : <><i className="fas fa-print"></i> طباعة الكل</>}
            </button>
          </div>
        </div>
      </div>

      {loadingBulletin && <LoadingSpinner message="جاري إنشاء الكشوف..." />}
      {error && <ErrorMessage message={error} onRetry={fetchBulletin} />}
      {bulletin && renderBulletin()}
    </div>
  );
};
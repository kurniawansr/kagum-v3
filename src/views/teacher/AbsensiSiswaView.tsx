import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceRecord } from '../../types';
import { ClipboardCheck, CheckCircle2, Calendar, FileSpreadsheet, FileText, Printer, Zap } from 'lucide-react';
import {
  INDONESIAN_MONTH_NAMES,
  calculateMonthEfficiency,
  formatIndonesianDate,
  formatIndonesianDateRange,
  getDaysInMonth,
  isDateInEventRange,
} from '../../utils/calendarUtils';
import { exportToExcel, exportToPdf } from '../../utils/exportUtils';

export const AbsensiSiswaView: React.FC = () => {
  const { students = [], attendanceRecords = [], setAttendanceRecords, calendarEvents = [], currentUser, schoolProfile } = useApp();
  const currentClass = currentUser?.kelas || 'Kelas 1A';
  const myStudents = (students || []).filter((s) => s && s.kelas === currentClass);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');

  const baseYear = parseInt((schoolProfile?.tahunAjaran || '2026/2027').split('/')[0], 10) || 2026;
  // Determine year for selected month (July - Dec = baseYear, Jan - June = baseYear + 1)
  const monthYear = selectedMonth >= 6 ? baseYear : baseYear + 1;

  const monthEff = calculateMonthEfficiency(monthYear, selectedMonth, calendarEvents || []);

  // Local state for daily input table
  const [dailyStatusMap, setDailyStatusMap] = useState<Record<string, 'Hadir' | 'Sakit' | 'Izin' | 'Alfa'>>({});

  // Sync daily status when selectedDate changes
  React.useEffect(() => {
    const existingMap: Record<string, 'Hadir' | 'Sakit' | 'Izin' | 'Alfa'> = {};
    myStudents.forEach((st) => {
      const rec = (attendanceRecords || []).find((r) => r.studentId === st.id && r.date === selectedDate);
      existingMap[st.id] = rec ? rec.status : 'Hadir';
    });
    setDailyStatusMap(existingMap);
  }, [selectedDate, attendanceRecords, students, currentClass]);

  const handleStatusChange = (studentId: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alfa') => {
    setDailyStatusMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleHadirSemua = () => {
    const newMap: Record<string, 'Hadir' | 'Sakit' | 'Izin' | 'Alfa'> = {};
    myStudents.forEach((st) => {
      newMap[st.id] = 'Hadir';
    });
    setDailyStatusMap(newMap);
    setMessage('Semua siswa diset Hadir.');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleSaveAttendance = () => {
    // Remove existing records for this class and selectedDate
    const filteredRecords = attendanceRecords.filter(
      (r) => !(r.kelas === currentClass && r.date === selectedDate)
    );

    const newRecordsArr: AttendanceRecord[] = myStudents.map((st) => ({
      id: `att-${st.id}-${selectedDate}`,
      studentId: st.id,
      date: selectedDate,
      status: dailyStatusMap[st.id] || 'Hadir',
      kelas: currentClass,
    }));

    setAttendanceRecords([...filteredRecords, ...newRecordsArr]);
    setMessage(`Absensi tanggal ${formatIndonesianDate(selectedDate)} berhasil disimpan!`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleExportPdf = () => {
    const daysInMonth = getDaysInMonth(monthYear, selectedMonth);

    const titleLines = [
      'REKAPITULASI ABSENSI SISWA',
      `KELAS ${currentClass.toUpperCase()}`,
      `BULAN ${INDONESIAN_MONTH_NAMES[selectedMonth].toUpperCase()} ${monthYear}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const customHead = [
      [
        { content: 'No.', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'NISN', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Nama Siswa', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Tanggal', colSpan: daysInMonth, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Jumlah', colSpan: 4, styles: { halign: 'center', valign: 'middle' } },
        { content: '% Kehadiran', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      ],
      [
        ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)),
        'H',
        'S',
        'I',
        'A',
      ],
    ];

    let totalSakitAll = 0;
    let totalIzinAll = 0;
    let totalAlfaAll = 0;

    const effectiveDaysCount = monthEff.effectiveDays > 0 ? monthEff.effectiveDays : daysInMonth;

    const rows = myStudents.map((st, idx) => {
      let hCount = 0;
      let sCount = 0;
      let iCount = 0;
      let aCount = 0;

      const dateCells: string[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = String(d).padStart(2, '0');
        const monthStr = String(selectedMonth + 1).padStart(2, '0');
        const dateFormatted = `${monthYear}-${monthStr}-${dayStr}`;

        const dateObj = new Date(monthYear, selectedMonth, d);
        const isSunday = dateObj.getDay() === 0;

        const holidayEvt = (calendarEvents || []).find(
          (e) => e && e.type === 'libur' && isDateInEventRange(dateFormatted, e)
        );
        const agendaEvt = (calendarEvents || []).find(
          (e) => e && e.type === 'agenda' && isDateInEventRange(dateFormatted, e)
        );

        const isNonEffective = isSunday || !!holidayEvt || !!agendaEvt;

        const rec = (attendanceRecords || []).find(
          (r) => r && r.studentId === st.id && r.date === dateFormatted
        );

        if (rec) {
          if (rec.status === 'Hadir') {
            dateCells.push('.');
            if (!isNonEffective) hCount++;
          } else if (rec.status === 'Sakit') {
            dateCells.push('S');
            if (!isNonEffective) sCount++;
          } else if (rec.status === 'Izin') {
            dateCells.push('I');
            if (!isNonEffective) iCount++;
          } else if (rec.status === 'Alfa') {
            dateCells.push('A');
            if (!isNonEffective) aCount++;
          }
        } else {
          if (isNonEffective) {
            dateCells.push('-');
          } else {
            dateCells.push('.');
            hCount++;
          }
        }
      }

      totalSakitAll += sCount;
      totalIzinAll += iCount;
      totalAlfaAll += aCount;

      // Rumus: (Jumlah Hadir / Jumlah Hari Efektif) * 100%
      const pctValue = effectiveDaysCount > 0 ? (hCount / effectiveDaysCount) * 100 : 0;
      const pct = Math.min(100, Math.round(pctValue));

      return [
        idx + 1,
        st.nisn,
        st.name,
        ...dateCells,
        hCount,
        sCount,
        iCount,
        aCount,
        `${pct}%`,
      ];
    });

    // Column Styles & Sizing for A4 Landscape (297mm width)
    // Printable width with 10mm margins = 277mm
    const dateAreaWidth = 162.75;
    const dateColWidth = Number((dateAreaWidth / daysInMonth).toFixed(2));

    const columnStyles: Record<number, object> = {
      0: { cellWidth: 7, halign: 'center' },   // No.
      1: { cellWidth: 17, halign: 'center' },  // NISN
      2: { cellWidth: 54, halign: 'left' },    // Nama Siswa (diperlebar agar 1 baris)
    };

    for (let d = 0; d < daysInMonth; d++) {
      columnStyles[3 + d] = { cellWidth: dateColWidth, halign: 'center' };
    }

    const hIdx = 3 + daysInMonth;
    columnStyles[hIdx] = { cellWidth: 6, halign: 'center', fontStyle: 'bold' };
    columnStyles[hIdx + 1] = { cellWidth: 6, halign: 'center', fontStyle: 'bold' };
    columnStyles[hIdx + 2] = { cellWidth: 6, halign: 'center', fontStyle: 'bold' };
    columnStyles[hIdx + 3] = { cellWidth: 6, halign: 'center', fontStyle: 'bold' };
    columnStyles[hIdx + 4] = { cellWidth: 12.25, halign: 'center', fontStyle: 'bold' };

    const didParseCell = (data: any) => {
      const colIdx = data.column.index;
      if (colIdx >= 3 && colIdx < 3 + daysInMonth) {
        const d = colIdx - 2;
        const monthStr = String(selectedMonth + 1).padStart(2, '0');
        const dayStr = String(d).padStart(2, '0');
        const dateFormatted = `${monthYear}-${monthStr}-${dayStr}`;
        const dateObj = new Date(monthYear, selectedMonth, d);
        const isSunday = dateObj.getDay() === 0;

        const evt = (calendarEvents || []).find(
          (e) => e && isDateInEventRange(dateFormatted, e) && e.type === 'libur'
        );

        if (data.section === 'head' && data.row.index === 1) {
          if (isSunday) {
            // Header Hari Minggu: Merah Tua / Pekat (Red-600)
            data.cell.styles.fillColor = [220, 38, 38];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          } else if (evt) {
            // Header Hari Libur Kalender: Rose-500
            data.cell.styles.fillColor = [244, 63, 94];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        } else if (data.section === 'body') {
          const cellValue = String(data.cell.raw || '');

          if (isSunday) {
            // Hari Minggu: Warna Merah Tua / Pekat (Red-300 #fca5a5), Teks Merah Gelap (#991b1b)
            data.cell.styles.fillColor = [252, 165, 165];
            data.cell.styles.textColor = [153, 27, 27];
            data.cell.styles.fontStyle = 'bold';
          } else if (evt) {
            // Hari Libur Kalender Pendidikan: Background Merah Muda Lembut (Red-100 #fee2e2), Teks Rose (#be123c)
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [190, 18, 60];
            data.cell.styles.fontStyle = 'bold';
          } else if (cellValue === '.' || cellValue === '•') {
            // Hadir: Titik Hijau Emerald Bold, Background Putih
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = 'bold';
          } else if (cellValue === 'S') {
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fontStyle = 'bold';
          } else if (cellValue === 'I') {
            data.cell.styles.fillColor = [219, 234, 254];
            data.cell.styles.textColor = [29, 78, 216];
            data.cell.styles.fontStyle = 'bold';
          } else if (cellValue === 'A') {
            data.cell.styles.fillColor = [254, 205, 211];
            data.cell.styles.textColor = [190, 18, 60];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    };

    const totalStudentsCount = myStudents.length;
    const totalAccumulatedEffDays = effectiveDaysCount * totalStudentsCount;

    const pctSakit = totalAccumulatedEffDays > 0 ? ((totalSakitAll * 100) / totalAccumulatedEffDays).toFixed(2) : '0.00';
    const pctIzin  = totalAccumulatedEffDays > 0 ? ((totalIzinAll * 100) / totalAccumulatedEffDays).toFixed(2) : '0.00';
    const pctAlfa  = totalAccumulatedEffDays > 0 ? ((totalAlfaAll * 100) / totalAccumulatedEffDays).toFixed(2) : '0.00';

    // Ambil seluruh event libur bulan ini dari Kalender Pendidikan Admin yang sudah diproses di monthEff
    const holidayEvents = monthEff.eventsInMonth.filter((e) => e && e.type === 'libur');

    const afterTable = (doc: any, startY: number) => {
      let currY = startY + 2;

      if (currY + 45 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        currY = 15;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      // 1. KETERANGAN
      doc.text('KETERANGAN', 10, currY);
      currY += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      if (holidayEvents.length > 0) {
        holidayEvents.forEach((evt) => {
          const dateRangeStr = formatIndonesianDateRange(evt.date, evt.endDate);
          doc.text(`- ${dateRangeStr} : ${evt.title}`, 12, currY);
          currY += 3.8;
        });
      } else {
        doc.text('- Tidak ada hari libur nasional / khusus pada bulan ini', 12, currY);
        currY += 3.8;
      }
      currY += 2;

      // 2. PERSENTASE KETIDAKHADIRAN
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('PERSENTASE KETIDAKHADIRAN', 10, currY);
      currY += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      doc.text(
        `S = (Jml Ketidakhadiran Sakit x 100) / (Jml Hari Efektif x Jml Siswa) % = (${totalSakitAll} x 100) / (${effectiveDaysCount} x ${totalStudentsCount}) = ${pctSakit}%`,
        12,
        currY
      );
      currY += 3.8;

      doc.text(
        `I = (Jml Ketidakhadiran Izin x 100) / (Jml Hari Efektif x Jml Siswa) % = (${totalIzinAll} x 100) / (${effectiveDaysCount} x ${totalStudentsCount}) = ${pctIzin}%`,
        12,
        currY
      );
      currY += 3.8;

      doc.text(
        `A = (Jml Ketidakhadiran Alfa x 100) / (Jml Hari Efektif x Jml Siswa) % = (${totalAlfaAll} x 100) / (${effectiveDaysCount} x ${totalStudentsCount}) = ${pctAlfa}%`,
        12,
        currY
      );
      currY += 6;

      doc.setTextColor(30, 41, 59);

      return currY;
    };

    exportToPdf({
      filename: `Absensi_Siswa_${currentClass.replace(' ', '_')}_${selectedMonth + 1}`,
      titleLines,
      customHead,
      tableRows: rows,
      schoolProfile,
      printDate,
      teacherName: currentUser?.name,
      teacherNip: currentUser?.nip,
      orientation: 'landscape',
      columnStyles,
      styles: { fontSize: 6.5, cellPadding: 1 },
      margin: { left: 10, right: 10 },
      didParseCell,
      afterTable,
    });
  };

  const handleExportExcel = () => {
    const daysInMonth = getDaysInMonth(monthYear, selectedMonth);

    const headerLines = [
      'REKAPITULASI PRESENSI ABSENSI SISWA',
      `KELAS: ${currentClass}`,
      `BULAN: ${INDONESIAN_MONTH_NAMES[selectedMonth]} ${monthYear}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = [
      'No',
      'NISN',
      'Nama Siswa',
      ...Array.from({ length: daysInMonth }, (_, i) => `Tgl ${i + 1}`),
      'Hadir (H)',
      'Sakit (S)',
      'Izin (I)',
      'Alfa (A)',
      '% Kehadiran',
    ];

    const effectiveDaysCount = monthEff.effectiveDays > 0 ? monthEff.effectiveDays : daysInMonth;

    const rows = myStudents.map((st, idx) => {
      let hCount = 0;
      let sCount = 0;
      let iCount = 0;
      let aCount = 0;

      const dateCells: string[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = String(d).padStart(2, '0');
        const monthStr = String(selectedMonth + 1).padStart(2, '0');
        const dateFormatted = `${monthYear}-${monthStr}-${dayStr}`;

        const dateObj = new Date(monthYear, selectedMonth, d);
        const isSunday = dateObj.getDay() === 0;

        const holidayEvt = (calendarEvents || []).find(
          (e) => e && e.type === 'libur' && isDateInEventRange(dateFormatted, e)
        );
        const agendaEvt = (calendarEvents || []).find(
          (e) => e && e.type === 'agenda' && isDateInEventRange(dateFormatted, e)
        );

        const isNonEffective = isSunday || !!holidayEvt || !!agendaEvt;

        const rec = (attendanceRecords || []).find(
          (r) => r && r.studentId === st.id && r.date === dateFormatted
        );

        if (rec) {
          if (rec.status === 'Hadir') {
            dateCells.push('.');
            if (!isNonEffective) hCount++;
          } else if (rec.status === 'Sakit') {
            dateCells.push('S');
            if (!isNonEffective) sCount++;
          } else if (rec.status === 'Izin') {
            dateCells.push('I');
            if (!isNonEffective) iCount++;
          } else if (rec.status === 'Alfa') {
            dateCells.push('A');
            if (!isNonEffective) aCount++;
          }
        } else {
          if (isNonEffective) {
            dateCells.push('-');
          } else {
            dateCells.push('.');
            hCount++;
          }
        }
      }

      // Rumus: (Jumlah Hadir / Jumlah Hari Efektif) * 100%
      const pctValue = effectiveDaysCount > 0 ? (hCount / effectiveDaysCount) * 100 : 0;
      const pct = Math.min(100, Math.round(pctValue));

      return [
        idx + 1,
        st.nisn,
        st.name,
        ...dateCells,
        hCount,
        sCount,
        iCount,
        aCount,
        `${pct}%`,
      ];
    });

    exportToExcel(
      `Absensi_Siswa_${currentClass.replace(' ', '_')}_${selectedMonth + 1}`,
      'Absensi',
      headerLines,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Manajemen Absensi Siswa ({currentClass})</h2>
              <p className="text-xs text-slate-500">
                Pencatatan kehadiran harian, perhitungan hari efektif otomatis, serta cetak laporan resmi
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs">
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium text-slate-600">Cetak:</span>
              <input
                type="date"
                value={printDate}
                onChange={(e) => setPrintDate(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none"
              />
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs rounded-xl transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              Excel
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-xs rounded-xl transition-colors"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              PDF Laporan
            </button>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pilih Bulan Pembelajaran</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
            >
              {INDONESIAN_MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Hari Efektif Belajar</label>
            <div className="px-3 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-800 font-extrabold rounded-lg">
              {monthEff.effectiveDays} Hari Efektif
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal Absensi Hari Ini</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-bold text-slate-800"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleHadirSemua}
              className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1"
            >
              <Zap className="w-3.5 h-3.5" />
              Hadir Semua
            </button>
            <button
              onClick={handleSaveAttendance}
              className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors"
            >
              Simpan
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {message}
          </div>
        )}
      </div>

      {/* Attendance Input Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">
            Form Kehadiran Tanggal: {formatIndonesianDate(selectedDate)}
          </h3>
          <span className="text-xs text-slate-500 italic">
            Simbol: Hadir (•), Sakit (S), Izin (I), Alfa (A)
          </span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3 w-10 text-center">No</th>
              <th className="p-3">NISN</th>
              <th className="p-3">Nama Lengkap Siswa</th>
              <th className="p-3 text-center">Status Kehadiran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {myStudents.map((st, idx) => {
              const currentStatus = dailyStatusMap[st.id] || 'Hadir';

              return (
                <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="p-3 font-mono text-slate-700 font-semibold">{st.nisn}</td>
                  <td className="p-3">
                    <span className="font-bold text-slate-800">{st.name}</span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 font-bold text-xs">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(st.id, 'Hadir')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          currentStatus === 'Hadir'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        • Hadir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(st.id, 'Sakit')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          currentStatus === 'Sakit'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        S (Sakit)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(st.id, 'Izin')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          currentStatus === 'Izin'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        I (Izin)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(st.id, 'Alfa')}
                        className={`px-3 py-1 rounded-lg transition-all ${
                          currentStatus === 'Alfa'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        A (Alfa)
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

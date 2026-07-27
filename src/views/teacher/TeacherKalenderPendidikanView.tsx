import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { KopHeader } from '../../components/common/KopHeader';
import {
  calculateMonthEfficiency,
  INDONESIAN_MONTH_NAMES,
  INDONESIAN_DAY_NAMES,
  formatIndonesianDate,
  formatIndonesianDateRange,
  isDateInEventRange,
} from '../../utils/calendarUtils';
import { exportToPdf, exportToExcel } from '../../utils/exportUtils';
import { Calendar as CalendarIcon, Printer, FileText, FileSpreadsheet, Info, CheckCircle2 } from 'lucide-react';

// Helper to extract county/kabupaten name cleanly from address or kop line
const getKabupatenName = (address: string, kopLine2?: string) => {
  if (kopLine2) {
    const match = kopLine2.match(/(?:KABUPATEN|KOTA)\s+([A-Za-z\s]+)/i);
    if (match && match[1]) {
      const name = match[1].trim();
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
  }
  if (!address) return 'Purbalingga';

  const kabMatch = address.match(/(?:Kabupaten|Kab\.|Kota)\s+([A-Za-z\s]+?)(?:,|\d|$)/i);
  if (kabMatch && kabMatch[1]) {
    const name = kabMatch[1].trim();
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  const parts = address.split(',').map((p) => p.trim());
  if (parts.length > 1) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const clean = parts[i].replace(/\d+/g, '').trim();
      if (clean && !/jawa|indonesia|propinsi|provinsi/i.test(clean) && !/jl\.|jalan/i.test(clean)) {
        return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
      }
    }
  }

  let cleaned = address.replace(/^(jl\.|jalan|desa|kec\.|kecamatan)\b.*?(?:,|\s(?=[A-Z]))/i, '').trim();
  cleaned = cleaned.replace(/\d+/g, '').trim();
  if (cleaned) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }
  return 'Purbalingga';
};

export const TeacherKalenderPendidikanView: React.FC = () => {
  const { calendarEvents, schoolProfile } = useApp();
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);

  // Academic year months (July 2026 -> June 2027)
  const baseYear = parseInt(schoolProfile.tahunAjaran.split('/')[0], 10) || 2026;
  const academicMonths = [
    { year: baseYear, monthIndex: 6 }, // July
    { year: baseYear, monthIndex: 7 }, // August
    { year: baseYear, monthIndex: 8 }, // September
    { year: baseYear, monthIndex: 9 }, // October
    { year: baseYear, monthIndex: 10 }, // November
    { year: baseYear, monthIndex: 11 }, // December
    { year: baseYear + 1, monthIndex: 0 }, // January
    { year: baseYear + 1, monthIndex: 1 }, // February
    { year: baseYear + 1, monthIndex: 2 }, // March
    { year: baseYear + 1, monthIndex: 3 }, // April
    { year: baseYear + 1, monthIndex: 4 }, // May
    { year: baseYear + 1, monthIndex: 5 }, // June
  ];

  // Calculate year totals
  const totalEffectiveYear = academicMonths.reduce((acc, m) => {
    const eff = calculateMonthEfficiency(m.year, m.monthIndex, calendarEvents);
    return acc + eff.effectiveDays;
  }, 0);

  const totalHolidaysYear = academicMonths.reduce((acc, m) => {
    const eff = calculateMonthEfficiency(m.year, m.monthIndex, calendarEvents);
    return acc + eff.holidaysCount;
  }, 0);

  const totalAgendasYear = academicMonths.reduce((acc, m) => {
    const eff = calculateMonthEfficiency(m.year, m.monthIndex, calendarEvents);
    return acc + eff.agendasCount;
  }, 0);

  // All events sorted chronologically by date ("tanggal muda" / earliest date first)
  const sortedEvents = [...(calendarEvents || [])].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const aEnd = a.endDate || a.date;
    const bEnd = b.endDate || b.date;
    return aEnd.localeCompare(bEnd);
  });

  // Trigger browser print or standalone printable popup
  const handlePrint = () => {
    const printArea = document.getElementById('printable-kalender-area');
    if (!printArea) {
      window.print();
      return;
    }

    // Try opening popup print window for iframe compatibility
    const printWin = window.open('', '_blank', 'width=1050,height=800');
    if (printWin) {
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((s) => s.outerHTML)
        .join('\n');

      printWin.document.open();
      printWin.document.write(`
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <meta charset="utf-8" />
            <title>Kalender Pendidikan - ${schoolProfile.namaMadrasah}</title>
            ${styles}
            <style>
              @media print {
                body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
              body {
                background-color: #ffffff !important;
                color: #0f172a !important;
                font-family: ui-sans-serif, system-ui, sans-serif;
                padding: 16px;
                margin: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print\\:block { display: block !important; }
              .print\\:hidden { display: none !important; }
            </style>
          </head>
          <body>
            <div>${printArea.innerHTML}</div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 300);
              };
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
    } else {
      // Fallback if popup blocker is active
      window.print();
    }
  };

  // Export PDF
  const handleExportPdf = () => {
    const titleLines = [
      'KALENDER PENDIDIKAN MADRASAH',
      `${schoolProfile.namaMadrasah.toUpperCase()}`,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran.toUpperCase()}`,
    ];

    const headers = ['No', 'Bulan & Tahun', 'Total Hari', 'Minggu', 'Hari Libur', 'Agenda Kegiatan', 'Hari Efektif Belajar'];
    const rows = academicMonths.map((m, idx) => {
      const eff = calculateMonthEfficiency(m.year, m.monthIndex, calendarEvents);
      return [
        idx + 1,
        `${eff.monthName} ${eff.year}`,
        eff.totalDays,
        eff.sundaysCount,
        eff.holidaysCount,
        eff.agendasCount,
        eff.effectiveDays,
      ];
    });

    exportToPdf({
      filename: `Kalender_Pendidikan_Preview_${schoolProfile.tahunAjaran.replace('/', '_')}`,
      titleLines,
      tableHeaders: headers,
      tableRows: rows,
      schoolProfile,
      printDate,
      orientation: 'portrait',
    });
  };

  // Export Excel
  const handleExportExcel = () => {
    const headerLines = [
      'KALENDER PENDIDIKAN MADRASAH',
      schoolProfile.namaMadrasah,
      `TAHUN AJARAN ${schoolProfile.tahunAjaran}`,
    ];

    const headers = ['No', 'Bulan', 'Total Hari', 'Minggu', 'Hari Libur', 'Agenda', 'Hari Efektif'];
    const rows = academicMonths.map((m, idx) => {
      const eff = calculateMonthEfficiency(m.year, m.monthIndex, calendarEvents);
      return [
        idx + 1,
        `${eff.monthName} ${eff.year}`,
        eff.totalDays,
        eff.sundaysCount,
        eff.holidaysCount,
        eff.agendasCount,
        eff.effectiveDays,
      ];
    });

    exportToExcel(
      `Kalender_Pendidikan_${schoolProfile.tahunAjaran.replace('/', '_')}`,
      'Kalender 12 Bulan',
      headerLines,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Banner (Hidden in Print) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Preview Kalender Pendidikan 12 Bulan</h2>
              <p className="text-xs text-slate-500">
                Tahun Ajaran {schoolProfile.tahunAjaran} • Tampilan resmi kalender pendidikan, libur nasional & agenda madrasah
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs">
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium text-slate-600">Tgl Cetak:</span>
              <input
                type="date"
                value={printDate}
                onChange={(e) => setPrintDate(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none"
              />
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak Kaldik
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-600" />
              Excel
            </button>
          </div>
        </div>

        {/* Summary Stats Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-medium">Total Hari Efektif Belajar (HEB):</span>
            <span className="text-sm font-black text-emerald-900">{totalEffectiveYear} Hari</span>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between">
            <span className="text-xs text-rose-800 font-medium">Total Hari Libur:</span>
            <span className="text-sm font-black text-rose-900">{totalHolidaysYear} Hari</span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
            <span className="text-xs text-amber-800 font-medium">Total Agenda / Kegiatan:</span>
            <span className="text-sm font-black text-amber-900">{totalAgendasYear} Agenda</span>
          </div>
        </div>
      </div>

      {/* Printable Area Wrapper */}
      <div
        id="printable-kalender-area"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 print:p-0 print:border-none print:shadow-none"
      >
        {/* Kop Surat Resmi Madrasah */}
        <KopHeader className="mb-4 print:border-none print:p-0 print:shadow-none" />

        {/* Judul Laporan Kalender */}
        <div className="text-center mb-4">
          <h2 className="text-base font-extrabold uppercase text-slate-900 tracking-wide">
            KALENDER PENDIDIKAN MADRASAH
          </h2>
          <p className="text-xs font-bold text-slate-700 mt-0.5">
            TAHUN AJARAN {schoolProfile.tahunAjaran}
          </p>
        </div>

        {/* Legend / Key */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold p-3 bg-slate-50 border border-slate-200 rounded-xl print:border-slate-300">
          <span className="text-slate-500 font-bold">Keterangan Warna:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300 inline-block" />
            <span className="text-rose-800 font-bold">Hari Minggu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-rose-500 inline-block" />
            <span className="text-rose-900 font-bold">Hari Libur (Nasional/Madrasah)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-sky-200 border border-sky-300 inline-block" />
            <span className="text-sky-900 font-bold">Agenda Utama</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300 inline-block" />
            <span className="text-emerald-900 font-bold">Kegiatan Khusus</span>
          </div>
        </div>

        {/* 12 Months Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:grid-cols-3 print:gap-3">
          {academicMonths.map((m) => {
            const eff = calculateMonthEfficiency(m.year, m.monthIndex, calendarEvents);
            const firstDayOffset = new Date(m.year, m.monthIndex, 1).getDay();

            return (
              <div
                key={`teacher-cal-${m.year}-${m.monthIndex}`}
                className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col justify-between print:border-slate-400 print:p-2"
              >
                <div>
                  {/* Month Header */}
                  <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase">
                      {eff.monthName} {eff.year}
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      HEB: {eff.effectiveDays}
                    </span>
                  </div>

                  {/* Day Names Row */}
                  <div className="grid grid-cols-7 gap-0.5 text-center font-bold text-[10px] text-slate-500 mb-1">
                    <span className="text-rose-600">M</span>
                    <span>S</span>
                    <span>S</span>
                    <span>R</span>
                    <span>K</span>
                    <span>J</span>
                    <span>S</span>
                  </div>

                  {/* Days Matrix */}
                  <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
                    {/* Empty cells before start */}
                    {Array.from({ length: firstDayOffset }).map((_, idx) => (
                      <div key={`emp-${idx}`} className="h-6" />
                    ))}

                    {/* Day Cells */}
                    {Array.from({ length: eff.totalDays }).map((_, dayIdx) => {
                      const dayNum = dayIdx + 1;
                      const dateStr = `${m.year}-${String(m.monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const isSunday = (firstDayOffset + dayIdx) % 7 === 0;

                      const eventsOnDay = (calendarEvents || []).filter((e) => isDateInEventRange(dateStr, e));
                      const holidayEvent = eventsOnDay.find((e) => e.type === 'libur');
                      const agendaEvent = eventsOnDay.find((e) => e.type === 'agenda');
                      const kegiatanEvent = eventsOnDay.find((e) => e.type === 'kegiatan');

                      let cellStyle = 'bg-slate-50 text-slate-700';
                      if (isSunday) {
                        cellStyle = 'bg-rose-100 text-rose-800 font-bold border border-rose-200/80';
                      } else if (holidayEvent) {
                        cellStyle = 'bg-rose-500 text-white font-bold';
                      } else if (agendaEvent) {
                        cellStyle = 'bg-sky-200 text-sky-950 font-bold border border-sky-300/80';
                      } else if (kegiatanEvent) {
                        cellStyle = 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300/80';
                      }

                      const firstEvt = holidayEvent || agendaEvent || kegiatanEvent;

                      return (
                        <div
                          key={`d-${dayNum}`}
                          title={firstEvt ? `${firstEvt.title}` : ''}
                          className={`h-6 flex items-center justify-center rounded transition-colors text-[10px] ${cellStyle}`}
                        >
                          {dayNum}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Event Summary under Month */}
                {eff.eventsInMonth.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] space-y-0.5">
                    {eff.eventsInMonth.map((evt) => (
                      <div key={evt.id} className="truncate text-slate-700">
                        <strong className={evt.type === 'libur' ? 'text-rose-600 font-extrabold' : evt.type === 'agenda' ? 'text-sky-700 font-extrabold' : 'text-emerald-700 font-extrabold'}>
                          [{formatIndonesianDateRange(evt.date, evt.endDate)}]:
                        </strong>{' '}
                        {evt.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detailed Agenda Table across Academic Year */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Daftar Agenda & Hari Libur Tahun Ajaran {schoolProfile.tahunAjaran}
          </h3>

          <div className="overflow-x-auto border border-slate-200 rounded-xl print:border-slate-400">
            <table className="w-full text-left text-[11px] leading-tight print:text-[10px]">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 print:bg-slate-200">
                <tr>
                  <th className="py-1.5 px-2 w-10 text-center print:py-1">No</th>
                  <th className="py-1.5 px-2 min-w-[160px] whitespace-nowrap print:py-1">Tanggal</th>
                  <th className="py-1.5 px-2 min-w-[110px] whitespace-nowrap print:py-1">Kategori</th>
                  <th className="py-1.5 px-2 print:py-1">Judul Agenda / Hari Libur</th>
                  <th className="py-1.5 px-2 print:py-1">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                {sortedEvents.length > 0 ? (
                  sortedEvents.map((evt, idx) => (
                    <tr key={evt.id} className="hover:bg-slate-50/80">
                      <td className="py-1 px-2 text-center text-slate-500 print:py-0.5 print:px-1">{idx + 1}</td>
                      <td className="py-1 px-2 font-semibold text-slate-800 whitespace-nowrap print:py-0.5 print:px-1.5">
                        {formatIndonesianDateRange(evt.date, evt.endDate)}
                      </td>
                      <td className="py-1 px-2 whitespace-nowrap print:py-0.5 print:px-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase print:text-[9px] print:px-1 print:py-0 ${
                            evt.type === 'libur'
                              ? 'bg-rose-100 text-rose-800'
                              : evt.type === 'agenda'
                              ? 'bg-sky-100 text-sky-900 border border-sky-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {evt.type === 'libur' ? 'Hari Libur' : evt.type === 'agenda' ? 'Agenda Utama' : 'Kegiatan'}
                        </span>
                      </td>
                      <td className="py-1 px-2 font-bold text-slate-800 print:py-0.5 print:px-1.5">{evt.title}</td>
                      <td className="py-1 px-2 text-slate-600 print:py-0.5 print:px-1.5">{evt.description || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-3 px-2 text-center text-slate-400 italic">
                      Belum ada agenda atau hari libur yang dicatat oleh Administrator.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature Block for Print (Kepala Madrasah Only) */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end text-xs text-center print:border-slate-400 print:mt-4 print:pt-4">
          <div className="w-64">
            <p className="text-slate-600">
              {getKabupatenName(schoolProfile.alamatMadrasah, schoolProfile.kopLaporan?.line2)}, {formatIndonesianDate(printDate)}
            </p>
            <p className="font-bold text-slate-800 mt-1">Kepala Madrasah</p>
            <div className="h-16" />
            <p className="font-bold text-slate-900 underline">{schoolProfile.namaKepala || '...................................................'}</p>
            <p className="text-[11px] text-slate-500">NIP. {schoolProfile.nipKepala || '...........................................'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SchoolProfile } from '../types';
import { formatIndonesianDate } from './calendarUtils';
import { KEMENAG_LOGO_DATA_URL } from '../components/common/LogoKemenag';

export function exportToExcel(
  filename: string,
  sheetName: string,
  headerTitleLines: string[],
  tableHeaders: string[],
  tableRows: (string | number)[][]
) {
  const wsData: (string | number)[][] = [];

  // Add Kop Header
  headerTitleLines.forEach((line) => {
    wsData.push([line]);
  });
  wsData.push([]); // blank line

  // Add Table Headers
  wsData.push(tableHeaders);

  // Add Table Rows
  tableRows.forEach((row) => wsData.push(row));

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Laporan');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export async function exportToPdf({
  filename,
  titleLines,
  tableHeaders,
  customHead,
  tableRows,
  schoolProfile,
  printDate,
  teacherName,
  teacherNip,
  orientation = 'portrait',
  columnStyles = {},
  styles = {},
  margin = { left: 10, right: 10 },
  didParseCell,
  beforeTable,
  afterTable,
}: {
  filename: string;
  titleLines: string[]; // Report-specific title lines
  tableHeaders?: string[];
  customHead?: any[];
  tableRows: (string | number)[][];
  schoolProfile: SchoolProfile;
  printDate?: string;
  teacherName?: string;
  teacherNip?: string;
  orientation?: 'portrait' | 'landscape';
  columnStyles?: Record<number, object>;
  styles?: object;
  margin?: { left?: number; right?: number; top?: number; bottom?: number };
  didParseCell?: (data: any) => void;
  beforeTable?: (doc: jsPDF, startY: number) => number;
  afterTable?: (doc: jsPDF, finalY: number) => number;
}) {
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4',
  });

  const kop = schoolProfile.kopLaporan;
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 12;

  // Helper function to load image element from URL
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

  // 1. Draw School Logo from Admin Settings on the LEFT top corner of Kop (x = 12, y = 8)
  let leftLogoRendered = false;
  if (schoolProfile.logoUrl) {
    if (schoolProfile.logoUrl.startsWith('data:image/svg+xml')) {
      try {
        doc.addImage(schoolProfile.logoUrl, 'SVG', 12, 8, 20, 20);
        leftLogoRendered = true;
      } catch (err) {
        console.warn('Could not render SVG logo from schoolProfile.logoUrl', err);
      }
    } else if (schoolProfile.logoUrl.startsWith('data:image')) {
      try {
        const format = schoolProfile.logoUrl.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(schoolProfile.logoUrl, format, 12, 8, 20, 20);
        leftLogoRendered = true;
      } catch (err) {
        console.warn('Could not render data URL logo from schoolProfile.logoUrl', err);
      }
    } else {
      try {
        const img = await loadImage(schoolProfile.logoUrl);
        doc.addImage(img, 'PNG', 12, 8, 20, 20);
        leftLogoRendered = true;
      } catch (err) {
        console.warn('Could not load or render image from schoolProfile.logoUrl', err);
      }
    }
  }

  // Fallback if admin logo could not be rendered: render Kemenag logo on left
  if (!leftLogoRendered) {
    try {
      doc.addImage(KEMENAG_LOGO_DATA_URL, 'SVG', 12, 8, 20, 20);
    } catch (err) {
      console.warn('Could not render fallback Kemenag logo on left', err);
    }
  }

  // Kop Laporan Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(kop.line1 || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  doc.setFontSize(10);
  doc.text(kop.line2 || 'KANTOR KEMENTERIAN AGAMA KABUPATEN PURBALINGGA', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  doc.setFontSize(12);
  doc.text(kop.line3 || schoolProfile.namaMadrasah.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(kop.line4 || schoolProfile.alamatMadrasah, pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;

  doc.text(kop.line5 || '', pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;

  if (kop.line6) {
    doc.text(kop.line6, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;
  }

  // Double Horizontal Line (Kop Separator)
  doc.setLineWidth(0.8);
  doc.line(10, currentY, pageWidth - 10, currentY);
  doc.setLineWidth(0.2);
  doc.line(10, currentY + 0.8, pageWidth - 10, currentY + 0.8);

  currentY += 7;

  // Report Title Lines
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  titleLines.forEach((line) => {
    if (line) {
      doc.text(line, pageWidth / 2, currentY, { align: 'center' });
      currentY += 5;
    }
  });

  currentY += 2;

  if (beforeTable) {
    currentY = beforeTable(doc, currentY);
  }

  const tableHead = customHead ? customHead : (tableHeaders ? [tableHeaders] : []);

  // AutoTable
  autoTable(doc, {
    startY: currentY,
    head: tableHead,
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: { top: 0.8, bottom: 0.8, left: 1.2, right: 1.2 },
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
      halign: 'center',
      ...styles,
    },
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900 / Dark Slate header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: columnStyles,
    margin: margin,
    didParseCell: didParseCell,
  });

  // Signature Block
  let startSignatureY = (doc as any).lastAutoTable.finalY + 8;

  if (afterTable) {
    startSignatureY = afterTable(doc, startSignatureY);
  }

  if (startSignatureY + 35 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    startSignatureY = 15;
  }

  const formattedDate = printDate ? formatIndonesianDate(printDate) : formatIndonesianDate(new Date().toISOString().split('T')[0]);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Right Signature (Guru / Pembuat)
  const rightX = pageWidth - 60;
  let kabName = 'Purbalingga';
  if (kop?.line2) {
    const match = kop.line2.match(/(?:KABUPATEN|KOTA)\s+([A-Za-z\s]+)/i);
    if (match && match[1]) {
      const name = match[1].trim();
      kabName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
  }
  doc.text(`${kabName}, ${formattedDate}`, rightX, startSignatureY);
  doc.text('Guru / Wali Kelas,', rightX, startSignatureY + 5);
  doc.setFont('helvetica', 'bold');
  if (teacherName) {
    doc.text(teacherName, rightX, startSignatureY + 25);
    doc.setFont('helvetica', 'normal');
    if (teacherNip) {
      doc.text(`NIP. ${teacherNip}`, rightX, startSignatureY + 30);
    }
  } else {
    doc.text('( ....................................... )', rightX, startSignatureY + 25);
    doc.setFont('helvetica', 'normal');
  }

  // Left Signature (Kepala Madrasah)
  const leftX = 15;
  doc.text('Mengetahui,', leftX, startSignatureY);
  doc.text('Kepala Madrasah,', leftX, startSignatureY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolProfile.namaKepala, leftX, startSignatureY + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${schoolProfile.nipKepala}`, leftX, startSignatureY + 30);

  doc.save(`${filename}.pdf`);
}


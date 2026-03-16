import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface DutyExportData {
  doctorName: string;
  unit: string;
  dutyType: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface OPPostingExportData {
  doctorName: string;
  designation: string | null;
  unit: string;
  dayCount?: number; // For PGs/Fellows - how many days in this unit
}

interface DoctorStatsExportData {
  doctorName: string;
  unit: string;
  totalDuties: number;
  opdCount: number;
  otCount: number;
  nightCount: number;
  wardCount: number;
  campCount: number;
  monthlyBreakdown: Record<number, number>;
}

export const exportDutiesToPDF = (
  data: DutyExportData[],
  title: string,
  filename: string
) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Subtitle with date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${format(new Date(), 'PPP p')}`, 14, 30);
  
  // Table
  autoTable(doc, {
    startY: 38,
    head: [['Doctor', 'Unit', 'Duty Type', 'Date', 'Time']],
    body: data.map(row => [
      row.doctorName,
      row.unit,
      row.dutyType,
      row.date,
      `${row.startTime} - ${row.endTime}`
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  
  doc.save(`${filename}.pdf`);
};

export const exportDutiesToExcel = (
  data: DutyExportData[],
  filename: string
) => {
  const worksheet = XLSX.utils.json_to_sheet(
    data.map(row => ({
      'Doctor Name': row.doctorName,
      'Unit': row.unit,
      'Duty Type': row.dutyType,
      'Date': row.date,
      'Start Time': row.startTime,
      'End Time': row.endTime,
    }))
  );
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Roster');
  
  // Auto-size columns
  const maxWidth = 20;
  worksheet['!cols'] = [
    { wch: maxWidth },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
  ];
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportYearlyStatsToPDF = (
  data: DoctorStatsExportData[],
  year: number,
  totals: { total: number; opd: number; ot: number; night: number; ward: number; camp: number }
) => {
  const doc = new jsPDF('landscape');
  
  // Title
  doc.setFontSize(18);
  doc.text(`Yearly Roster Summary - ${year}`, 14, 22);
  
  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${format(new Date(), 'PPP p')}`, 14, 30);
  
  // Summary
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(
    `Total Duties: ${totals.total} | OPD: ${totals.opd} | OT: ${totals.ot} | Night: ${totals.night} | Ward: ${totals.ward} | Camp: ${totals.camp}`,
    14,
    40
  );
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Table
  autoTable(doc, {
    startY: 48,
    head: [['Doctor', 'Unit', 'Total', 'OPD', 'OT', 'Night', 'Ward', 'Camp', ...months]],
    body: data.map(row => [
      row.doctorName,
      row.unit,
      row.totalDuties.toString(),
      row.opdCount.toString() || '-',
      row.otCount.toString() || '-',
      row.nightCount.toString() || '-',
      row.wardCount.toString() || '-',
      row.campCount.toString() || '-',
      ...months.map((_, idx) => row.monthlyBreakdown[idx]?.toString() || '-')
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [59, 130, 246], fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 15 },
    },
  });
  
  doc.save(`yearly-roster-${year}.pdf`);
};

export const exportYearlyStatsToExcel = (
  data: DoctorStatsExportData[],
  year: number,
  totals: { total: number; opd: number; ot: number; night: number; ward: number; camp: number }
) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Summary sheet
  const summaryData = [
    { Metric: 'Year', Value: year },
    { Metric: 'Total Duties', Value: totals.total },
    { Metric: 'OPD', Value: totals.opd },
    { Metric: 'OT', Value: totals.ot },
    { Metric: 'Night Duty', Value: totals.night },
    { Metric: 'Ward', Value: totals.ward },
    { Metric: 'Camp', Value: totals.camp },
    { Metric: 'Generated On', Value: format(new Date(), 'PPP p') },
  ];
  
  // Detail sheet
  const detailData = data.map(row => {
    const monthData: Record<string, number | string> = {};
    months.forEach((month, idx) => {
      monthData[month] = row.monthlyBreakdown[idx] || 0;
    });
    
    return {
      'Doctor Name': row.doctorName,
      'Unit': row.unit,
      'Total Duties': row.totalDuties,
      'OPD': row.opdCount,
      'OT': row.otCount,
      'Night Duty': row.nightCount,
      'Ward': row.wardCount,
      'Camp': row.campCount,
      ...monthData,
    };
  });
  
  const workbook = XLSX.utils.book_new();
  
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  const detailSheet = XLSX.utils.json_to_sheet(detailData);
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Doctor Stats');
  
  XLSX.writeFile(workbook, `yearly-roster-${year}.xlsx`);
};

export const exportMonthlyToPDF = (
  data: DutyExportData[],
  monthYear: string
) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(`Monthly Roster - ${monthYear}`, 14, 22);
  
  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${format(new Date(), 'PPP p')}`, 14, 30);
  doc.text(`Total Duties: ${data.length}`, 14, 36);
  
  // Group by date
  const groupedByDate: Record<string, DutyExportData[]> = {};
  data.forEach(duty => {
    if (!groupedByDate[duty.date]) groupedByDate[duty.date] = [];
    groupedByDate[duty.date].push(duty);
  });
  
  // Table
  autoTable(doc, {
    startY: 44,
    head: [['Date', 'Doctor', 'Duty Type', 'Unit', 'Time']],
    body: data
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(row => [
        row.date,
        row.doctorName,
        row.dutyType,
        row.unit,
        `${row.startTime} - ${row.endTime}`
      ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  
  const safeFilename = monthYear.replace(/\s+/g, '-').toLowerCase();
  doc.save(`monthly-roster-${safeFilename}.pdf`);
};

export const exportMonthlyToExcel = (
  data: DutyExportData[],
  monthYear: string
) => {
  const worksheet = XLSX.utils.json_to_sheet(
    data
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(row => ({
        'Date': row.date,
        'Doctor Name': row.doctorName,
        'Duty Type': row.dutyType,
        'Unit': row.unit,
        'Start Time': row.startTime,
        'End Time': row.endTime,
      }))
  );
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Roster');
  
  const safeFilename = monthYear.replace(/\s+/g, '-').toLowerCase();
  XLSX.writeFile(workbook, `monthly-roster-${safeFilename}.xlsx`);
};

/**
 * Export OP Doctors Posting PDF - Format like hospital posting sheet
 * Shows units as columns with doctors listed under each unit
 */
export const exportOPPostingPDF = (
  data: OPPostingExportData[],
  monthYear: string
) => {
  // Use landscape for wider table
  const doc = new jsPDF('landscape');
  
  // Format designation for display
  const formatDesignation = (designation: string | null): string => {
    if (!designation) return '';
    const upper = designation.toUpperCase();
    if (upper === 'PG') return 'PG';
    if (upper === 'FELLOW') return 'Fellow';
    if (upper === 'MO') return 'MO';
    if (upper === 'CONSULTANT') return 'Consultant';
    if (upper === 'SO') return 'SO';
    return designation;
  };
  
  // Group doctors by unit with day counts
  const doctorsByUnit: Record<string, string[]> = {};
  data.forEach(item => {
    if (!doctorsByUnit[item.unit]) {
      doctorsByUnit[item.unit] = [];
    }
    const designation = formatDesignation(item.designation);
    const isPGorFellow = designation === 'PG' || designation === 'Fellow';
    
    // For PGs/Fellows, show day count in parentheses
    let doctorEntry = item.doctorName;
    if (designation) {
      if (isPGorFellow && item.dayCount) {
        doctorEntry = `${item.doctorName} (${designation}-${item.dayCount}d)`;
      } else {
        doctorEntry = `${item.doctorName} (${designation})`;
      }
    }
    
    // Avoid duplicates
    if (!doctorsByUnit[item.unit].includes(doctorEntry)) {
      doctorsByUnit[item.unit].push(doctorEntry);
    }
  });
  
  // Define unit order matching the image
  const unitOrder = [
    'Unit 1', 'Unit 2', 'Unit 3', 'Unit 4',
    'Cornea', 'Cornea OT', 
    'Retina', 'Retina OT',
    'Glaucoma', 
    'Cataract OT',
    'General Ward', 
    'Emergency', 'Emergency Night',
    'Night Duty'
  ];
  
  // Get all unique units, prioritizing the defined order
  const allUnits = [...new Set([...unitOrder, ...Object.keys(doctorsByUnit)])];
  const orderedUnits = allUnits.filter(unit => doctorsByUnit[unit] && doctorsByUnit[unit].length > 0);
  
  // Split units into columns (max 6 columns per row for readability)
  const columnsPerPage = 7;
  
  // Title - styled like the image
  doc.setFillColor(255, 193, 7); // Yellow/Gold like in image
  doc.rect(0, 0, 297, 20, 'F');
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`OP DOCTORS POSTING ${monthYear.toUpperCase()}`, 148.5, 13, { align: 'center' });
  
  // Subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on ${format(new Date(), 'PPP')}`, 148.5, 28, { align: 'center' });
  
  // Find the maximum number of doctors in any unit
  const maxDoctors = Math.max(...Object.values(doctorsByUnit).map(arr => arr.length), 0);
  
  // Create table data - each row is S.NO + doctors from each unit
  const tableHeaders: string[] = [];
  const tableData: string[][] = [];
  
  // Build headers with unit names (S.NO columns for each unit pair)
  orderedUnits.forEach((unit, idx) => {
    if (idx % 2 === 0 || idx === orderedUnits.length - 1) {
      tableHeaders.push('S.NO');
    }
    tableHeaders.push(unit.toUpperCase());
  });
  
  // Build rows
  for (let i = 0; i < maxDoctors; i++) {
    const row: string[] = [];
    orderedUnits.forEach((unit, idx) => {
      if (idx % 2 === 0 || idx === orderedUnits.length - 1) {
        row.push((i + 1).toString());
      }
      const doctors = doctorsByUnit[unit] || [];
      row.push(doctors[i] || '');
    });
    tableData.push(row);
  }
  
  // Alternative simpler format - just units as headers, doctors as rows
  const simpleHeaders = orderedUnits.map(u => u.toUpperCase());
  const simpleData: string[][] = [];
  
  for (let i = 0; i < maxDoctors; i++) {
    const row: string[] = [];
    orderedUnits.forEach(unit => {
      const doctors = doctorsByUnit[unit] || [];
      row.push(doctors[i] || '');
    });
    simpleData.push(row);
  }
  
  // Create the table
  autoTable(doc, {
    startY: 34,
    head: [simpleHeaders],
    body: simpleData,
    styles: { 
      fontSize: 8,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: { 
      fillColor: [255, 193, 7], // Yellow/Gold
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
    },
    bodyStyles: {
      halign: 'left',
    },
    alternateRowStyles: { 
      fillColor: [255, 255, 255] 
    },
    columnStyles: orderedUnits.reduce((acc, _, idx) => {
      acc[idx] = { cellWidth: 'auto', minCellWidth: 25 };
      return acc;
    }, {} as Record<number, { cellWidth: string; minCellWidth: number }>),
    didParseCell: function(data) {
      // Highlight header row
      if (data.section === 'head') {
        data.cell.styles.fillColor = [255, 193, 7];
      }
    }
  });
  
  const safeFilename = monthYear.replace(/\s+/g, '-').toLowerCase();
  doc.save(`op-doctors-posting-${safeFilename}.pdf`);
};

import * as XLSX from 'xlsx';

export function downloadBulkScheduleTemplate() {
  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // FIELDS SHEET
  const fieldsData = [
    ['Field Name', 'Location'],
    ['Field 1', 'Memorial Park'],
    ['Field 2', '123 Main Street'],
    ['', ''],
  ];
  const fieldsSheet = XLSX.utils.aoa_to_sheet(fieldsData);
  // Set column widths
  fieldsSheet['!cols'] = [
    { wch: 20 }, // Field Name
    { wch: 30 }, // Location
  ];
  XLSX.utils.book_append_sheet(wb, fieldsSheet, 'Fields');

  // REFEREES SHEET
  const refereesData = [
    ['Name', 'Phone Number'],
    ['John Smith', '555-123-4567'],
    ['Jane Doe', '555-987-6543'],
    ['', ''],
  ];
  const refereesSheet = XLSX.utils.aoa_to_sheet(refereesData);
  refereesSheet['!cols'] = [
    { wch: 25 }, // Name
    { wch: 20 }, // Phone Number
  ];
  XLSX.utils.book_append_sheet(wb, refereesSheet, 'Referees');

  // GAMES SHEET
  const gamesData = [
    ['Home Team', 'Away Team', 'Date (YYYY-MM-DD)', 'Time (HH:MM)', 'Field Name', 'Referee Name'],
    ['Tigers', 'Lions', '2024-03-15', '10:00', 'Field 1', 'John Smith'],
    ['Eagles', 'Hawks', '2024-03-15', '11:30', 'Field 2', 'Jane Doe'],
    ['', '', '', '', '', ''],
  ];
  const gamesSheet = XLSX.utils.aoa_to_sheet(gamesData);
  gamesSheet['!cols'] = [
    { wch: 20 }, // Home Team
    { wch: 20 }, // Away Team
    { wch: 18 }, // Date
    { wch: 15 }, // Time
    { wch: 20 }, // Field Name
    { wch: 25 }, // Referee Name
  ];
  XLSX.utils.book_append_sheet(wb, gamesSheet, 'Games');

  // Generate the Excel file and trigger download
  XLSX.writeFile(wb, 'ScoreLink_Bulk_Schedule_Template.xlsx');
}

export interface BulkUploadResult {
  fields: Array<{ name: string; location: string }>;
  referees: Array<{ name: string; phone_number: string }>;
  games: Array<{
    home_team: string;
    away_team: string;
    scheduled_date: string;
    scheduled_time: string;
    field_name: string;
    referee_name: string;
  }>;
  errors: string[];
}

export function parseBulkScheduleFile(file: File): Promise<BulkUploadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const result: BulkUploadResult = {
          fields: [],
          referees: [],
          games: [],
          errors: [],
        };

        // Parse Fields sheet
        if (workbook.SheetNames.includes('Fields')) {
          const fieldsSheet = workbook.Sheets['Fields'];
          const fieldsJson = XLSX.utils.sheet_to_json(fieldsSheet, { header: 1 }) as any[][];
          
          // Skip header row (index 0)
          for (let i = 1; i < fieldsJson.length; i++) {
            const row = fieldsJson[i];
            if (!row[0]) continue; // Skip empty rows
            
            const name = String(row[0]).trim();
            const location = row[1] ? String(row[1]).trim() : '';
            
            if (name) {
              result.fields.push({ name, location });
            }
          }
        } else {
          result.errors.push('Fields sheet not found in uploaded file');
        }

        // Parse Referees sheet
        if (workbook.SheetNames.includes('Referees')) {
          const refereesSheet = workbook.Sheets['Referees'];
          const refereesJson = XLSX.utils.sheet_to_json(refereesSheet, { header: 1 }) as any[][];
          
          for (let i = 1; i < refereesJson.length; i++) {
            const row = refereesJson[i];
            if (!row[0]) continue;
            
            const name = String(row[0]).trim();
            const phone_number = row[1] ? String(row[1]).trim() : '';
            
            if (name) {
              result.referees.push({ name, phone_number });
            }
          }
        } else {
          result.errors.push('Referees sheet not found in uploaded file');
        }

        // Parse Games sheet
        if (workbook.SheetNames.includes('Games')) {
          const gamesSheet = workbook.Sheets['Games'];
          const gamesJson = XLSX.utils.sheet_to_json(gamesSheet, { header: 1 }) as any[][];
          
          for (let i = 1; i < gamesJson.length; i++) {
            const row = gamesJson[i];
            if (!row[0] || !row[1]) continue; // Need at least home and away team
            
            const home_team = String(row[0]).trim();
            const away_team = String(row[1]).trim();
            const scheduled_date = row[2] ? String(row[2]).trim() : '';
            const scheduled_time = row[3] ? String(row[3]).trim() : '';
            const field_name = row[4] ? String(row[4]).trim() : '';
            const referee_name = row[5] ? String(row[5]).trim() : '';
            
            if (home_team && away_team) {
              result.games.push({
                home_team,
                away_team,
                scheduled_date,
                scheduled_time,
                field_name,
                referee_name,
              });
            }
          }
        } else {
          result.errors.push('Games sheet not found in uploaded file');
        }

        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

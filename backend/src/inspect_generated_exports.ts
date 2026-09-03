import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

function inspectExports() {
  const outDir = path.resolve(__dirname, '../export_test_output');
  const files = fs.readdirSync(outDir).filter(f => f.endsWith('.xlsx'));

  console.log('==================================================');
  console.log('🔍 VISUAL QA INSPECTION OF GENERATED XLSX WORKBOOKS');
  console.log('==================================================\n');

  for (const file of files) {
    console.log(`📁 File: ${file}`);
    const filePath = path.join(outDir, file);
    const workbook = XLSX.readFile(filePath);

    console.log(`   Sheets (${workbook.SheetNames.length}): [${workbook.SheetNames.join(', ')}]`);
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
      console.log(`   ├── Sheet "${sheetName}": ${json.length} rows`);
      if (json.length > 0) {
        console.log(`   │   Top Row 1:`, json[0]);
        if (json.length > 1) console.log(`   │   Top Row 2:`, json[1]);
        if (json.length > 5) console.log(`   │   Data Row (L6):`, json[5]);
      }
    }
    console.log('--------------------------------------------------\n');
  }
}

inspectExports();

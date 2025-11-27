// ========================================
// 📊 SHEETSERVICE.GS - GOOGLE SHEETS OPERATIONS
// ========================================
// ไฟล์นี้จัดการการทำงานกับ Google Sheets
// ครอบคลุมการสร้าง, อ่าน, เขียน, และอัพเดทข้อมูล

/**
 * Get or Create Sheet
 * สร้าง Sheet ใหม่หรือเปิด Sheet ที่มีอยู่
 * 
 * @param {string} sheetName - Name of the sheet
 * @param {Array<string>} headers - Optional headers for new sheet
 * @return {Sheet} Sheet object
 */
function getOrCreateSheet(sheetName, headers = null) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log(`📄 Creating sheet: ${sheetName}`);
      sheet = ss.insertSheet(sheetName);
      
      // Add headers if provided
      if (headers && headers.length > 0) {
        sheet.appendRow(headers);
        formatSheetHeader(sheet, 1);
        Logger.log(`✅ Added headers to ${sheetName}`);
      }
    } else {
      Logger.log(`📄 Sheet exists: ${sheetName}`);
    }
    
    return sheet;
    
  } catch (error) {
    Logger.log(`❌ Error in getOrCreateSheet: ${error.message}`);
    throw error;
  }
}

/**
 * Format Sheet Header
 * จัดรูปแบบหัวตาราง
 * 
 * @param {Sheet} sheet - Sheet object
 * @param {number} headerRow - Header row number (default: 1)
 */
function formatSheetHeader(sheet, headerRow = 1) {
  try {
    const lastCol = sheet.getLastColumn();
    
    if (lastCol === 0) {
      Logger.log('⚠️ No columns to format');
      return;
    }
    
    const headerRange = sheet.getRange(headerRow, 1, 1, lastCol);
    
    // Apply formatting
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
    headerRange.setHorizontalAlignment('center');
    headerRange.setVerticalAlignment('middle');
    
    // Freeze header row
    sheet.setFrozenRows(headerRow);
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, lastCol);
    
    Logger.log(`✅ Formatted header row ${headerRow}`);
    
  } catch (error) {
    Logger.log(`❌ Error formatting header: ${error.message}`);
  }
}

/**
 * Save Conversation to Sheet
 * บันทึกการสนทนาลง Sheet
 * 
 * @param {Object} data - Conversation data
 * @param {string} data.userId - User ID
 * @param {string} data.userMessage - User message
 * @param {string} data.aiResponse - AI response
 * @param {string} data.intent - Intent name
 * @param {Date} data.timestamp - Timestamp
 */
function saveConversation(data) {
  try {
    const sheet = getOrCreateSheet(
      SHEET_CONFIG.SHEETS.CONVERSATIONS,
      SHEET_CONFIG.COLUMNS.CONVERSATIONS
    );
    
    sheet.appendRow([
      data.timestamp,
      data.userId,
      data.userMessage,
      data.aiResponse,
      data.intent
    ]);
    
    Logger.log('💾 Saved conversation to sheet');
    
  } catch (error) {
    Logger.log(`⚠️ Error saving conversation: ${error.message}`);
  }
}

/**
 * Initialize Sheets
 * สร้าง Sheets ทั้งหมดที่จำเป็น
 */
function initializeSheets() {
  try {
    Logger.log('🔧 Initializing sheets...');
    
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    
    // List of sheets to create
    const sheetsToCreate = [
      {
        name: SHEET_CONFIG.SHEETS.CONVERSATIONS,
        headers: SHEET_CONFIG.COLUMNS.CONVERSATIONS
      },
      {
        name: SHEET_CONFIG.SHEETS.FOLLOWERS,
        headers: SHEET_CONFIG.COLUMNS.FOLLOWERS
      }
    ];
    
    sheetsToCreate.forEach(sheetConfig => {
      getOrCreateSheet(sheetConfig.name, sheetConfig.headers);
    });
    
    Logger.log('✅ All sheets initialized');
    
  } catch (error) {
    Logger.log(`❌ Error initializing sheets: ${error.message}`);
    throw error;
  }
}

/**
 * Find Row by Value
 * ค้นหาแถวที่มีค่าตรงกับที่ระบุ
 * 
 * @param {Sheet} sheet - Sheet object
 * @param {number} columnIndex - Column index to search (1-based)
 * @param {*} searchValue - Value to search for
 * @return {number} Row number (0 if not found)
 */
function findRowByValue(sheet, columnIndex, searchValue) {
  try {
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) { // Start from 1 to skip header
      if (data[i][columnIndex - 1] === searchValue) {
        return i + 1; // Return 1-based row number
      }
    }
    
    return 0; // Not found
    
  } catch (error) {
    Logger.log(`❌ Error finding row: ${error.message}`);
    return 0;
  }
}

/**
 * Update Row
 * อัพเดทข้อมูลในแถว
 * 
 * @param {Sheet} sheet - Sheet object
 * @param {number} rowNumber - Row number (1-based)
 * @param {Array} values - Values to update
 */
function updateRow(sheet, rowNumber, values) {
  try {
    if (rowNumber < 1) {
      Logger.log('⚠️ Invalid row number');
      return false;
    }
    
    const numCols = values.length;
    sheet.getRange(rowNumber, 1, 1, numCols).setValues([values]);
    
    Logger.log(`✅ Updated row ${rowNumber}`);
    return true;
    
  } catch (error) {
    Logger.log(`❌ Error updating row: ${error.message}`);
    return false;
  }
}

/**
 * Delete Row
 * ลบแถว
 * 
 * @param {Sheet} sheet - Sheet object
 * @param {number} rowNumber - Row number (1-based)
 */
function deleteRow(sheet, rowNumber) {
  try {
    if (rowNumber < 2) { // Don't delete header
      Logger.log('⚠️ Cannot delete header row');
      return false;
    }
    
    sheet.deleteRow(rowNumber);
    Logger.log(`✅ Deleted row ${rowNumber}`);
    return true;
    
  } catch (error) {
    Logger.log(`❌ Error deleting row: ${error.message}`);
    return false;
  }
}

/**
 * Clear Sheet Data
 * ลบข้อมูลทั้งหมดใน Sheet (เว้นหัวตาราง)
 * 
 * @param {Sheet} sheet - Sheet object
 */
function clearSheetData(sheet) {
  try {
    const lastRow = sheet.getLastRow();
    
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
      Logger.log(`✅ Cleared ${lastRow - 1} rows`);
    } else {
      Logger.log('ℹ️ No data to clear');
    }
    
  } catch (error) {
    Logger.log(`❌ Error clearing sheet: ${error.message}`);
  }
}

/**
 * Get Sheet Data as Array
 * ดึงข้อมูลจาก Sheet เป็น Array of Objects
 * 
 * @param {string} sheetName - Sheet name
 * @param {boolean} skipHeader - Skip header row (default: true)
 * @return {Array<Object>} Array of data objects
 */
function getSheetDataAsArray(sheetName, skipHeader = true) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log(`⚠️ Sheet not found: ${sheetName}`);
      return [];
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow < 2) {
      Logger.log('ℹ️ No data in sheet');
      return [];
    }
    
    // Get headers
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    
    // Get data
    const startRow = skipHeader ? 2 : 1;
    const numRows = skipHeader ? lastRow - 1 : lastRow;
    const dataRange = sheet.getRange(startRow, 1, numRows, lastCol);
    const values = dataRange.getValues();
    
    // Convert to array of objects
    const data = values.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    Logger.log(`✅ Loaded ${data.length} records from ${sheetName}`);
    return data;
    
  } catch (error) {
    Logger.log(`❌ Error getting sheet data: ${error.message}`);
    return [];
  }
}

/**
 * Append Data Array
 * เพิ่มข้อมูลหลายแถวพร้อมกัน
 * 
 * @param {Sheet} sheet - Sheet object
 * @param {Array<Array>} dataArray - 2D array of data
 */
function appendDataArray(sheet, dataArray) {
  try {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      Logger.log('⚠️ No data to append');
      return;
    }
    
    const numRows = dataArray.length;
    const numCols = dataArray[0].length;
    
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, numRows, numCols).setValues(dataArray);
    
    Logger.log(`✅ Appended ${numRows} rows`);
    
  } catch (error) {
    Logger.log(`❌ Error appending data: ${error.message}`);
  }
}

/**
 * Check if Date Exists
 * ตรวจสอบว่ามีวันที่นี้ในชีตแล้วหรือไม่
 * 
 * @param {Sheet} sheet - Sheet object
 * @param {Date} date - Date to check
 * @param {number} dateColumn - Column index for date (1-based, default: 1)
 * @return {boolean} True if date exists
 */
function isDuplicateDate(sheet, date, dateColumn = 1) {
  try {
    if (!sheet || sheet.getLastRow() < 2) {
      return false;
    }
    
    const data = sheet.getDataRange().getValues();
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    for (let i = 1; i < data.length; i++) { // Skip header
      const rowDate = new Date(data[i][dateColumn - 1]);
      rowDate.setHours(0, 0, 0, 0);
      
      if (rowDate.getTime() === targetDate.getTime()) {
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    Logger.log(`❌ Error checking duplicate date: ${error.message}`);
    return false;
  }
}

/**
 * Export Sheet to CSV
 * Export ข้อมูลจาก Sheet เป็น CSV
 * 
 * @param {string} sheetName - Sheet name
 * @return {string} CSV content
 */
function exportSheetToCSV(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log(`⚠️ Sheet not found: ${sheetName}`);
      return '';
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Convert to CSV
    const csv = data.map(row => {
      return row.map(cell => {
        // Escape quotes and wrap in quotes if needed
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',');
    }).join('\n');
    
    Logger.log(`✅ Exported ${data.length} rows to CSV`);
    return csv;
    
  } catch (error) {
    Logger.log(`❌ Error exporting to CSV: ${error.message}`);
    return '';
  }
}

/**
 * Get Sheet Statistics
 * ดึงสถิติของ Sheet
 * 
 * @param {string} sheetName - Sheet name
 * @return {Object} Statistics object
 */
function getSheetStats(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return null;
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    const dataRows = Math.max(0, lastRow - 1); // Exclude header
    
    return {
      name: sheetName,
      totalRows: lastRow,
      dataRows: dataRows,
      columns: lastCol,
      hasData: dataRows > 0,
      lastUpdate: new Date()
    };
    
  } catch (error) {
    Logger.log(`❌ Error getting sheet stats: ${error.message}`);
    return null;
  }
}

/**
 * Test Sheet Service
 * ทดสอบฟังก์ชันต่างๆ ของ Sheet Service
 */
function testSheetService() {
  Logger.log('🧪 Testing Sheet Service...');
  Logger.log('=' .repeat(60));
  
  try {
    // Test 1: Create Test Sheet
    Logger.log('\n1️⃣ Testing Sheet Creation...');
    const testSheet = getOrCreateSheet('TEST_SHEET', ['Column1', 'Column2', 'Column3']);
    Logger.log(`   ✅ Created: ${testSheet.getName()}`);
    
    // Test 2: Add Data
    Logger.log('\n2️⃣ Testing Data Append...');
    testSheet.appendRow(['Value1', 'Value2', 'Value3']);
    testSheet.appendRow(['Value4', 'Value5', 'Value6']);
    Logger.log('   ✅ Added 2 rows');
    
    // Test 3: Find Row
    Logger.log('\n3️⃣ Testing Find Row...');
    const rowNum = findRowByValue(testSheet, 1, 'Value1');
    Logger.log(`   ✅ Found at row: ${rowNum}`);
    
    // Test 4: Update Row
    Logger.log('\n4️⃣ Testing Update Row...');
    updateRow(testSheet, rowNum, ['Updated1', 'Updated2', 'Updated3']);
    Logger.log('   ✅ Row updated');
    
    // Test 5: Get Data as Array
    Logger.log('\n5️⃣ Testing Get Data as Array...');
    const data = getSheetDataAsArray('TEST_SHEET');
    Logger.log(`   ✅ Loaded ${data.length} records`);
    if (data.length > 0) {
      Logger.log(`   Sample: ${JSON.stringify(data[0])}`);
    }
    
    // Test 6: Get Stats
    Logger.log('\n6️⃣ Testing Get Stats...');
    const stats = getSheetStats('TEST_SHEET');
    Logger.log(`   ✅ Stats: ${JSON.stringify(stats)}`);
    
    // Test 7: Clear Data
    Logger.log('\n7️⃣ Testing Clear Data...');
    clearSheetData(testSheet);
    Logger.log('   ✅ Data cleared');
    
    Logger.log('=' .repeat(60));
    Logger.log('✅ Sheet Service test completed!');
    
  } catch (error) {
    Logger.log(`❌ Test failed: ${error.message}`);
  }
}

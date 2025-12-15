// ========================================
// 📊 SHEETSERVICE.GS - GOOGLE SHEETS OPERATIONS (V2.1 - Batch Write Optimized & Complete)
// ========================================

/**
 * Get or Create Sheet (คงไว้)
 * (โค้ดนี้ถูกคงไว้ตามไฟล์ต้นฉบับของโปรเจกต์)
 */
function getOrCreateSheet(sheetName, headers = null) {
  try {
    // Note: SHEET_CONFIG.SPREADSHEET_ID ดึงมาจาก Config.js ที่ถูกแก้ไขให้ใช้ PropertiesService แล้ว
    const ss = SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log(`📄 Creating sheet: ${sheetName}`);
      sheet = ss.insertSheet(sheetName);
      if (headers && headers.length > 0) {
        // ใช้ setValues แทน appendRow สำหรับ Header (เพื่อความสอดคล้อง)
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
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
 * 💡 NEW: Batch Append Rows
 * เขียนข้อมูลหลายแถวลงใน Sheet ด้วยการเรียก API เพียงครั้งเดียว (Performance Optimization)
 * @param {string} sheetName - ชื่อชีต
 * @param {Array<Array>} data - ข้อมูล array สองมิติ [[row1_col1, row1_col2], [row2_col1, row2_col2]]
 * @param {Array<string>} headers - Headers สำหรับตรวจสอบการสร้าง Sheet ใหม่
 */
function batchAppendRows(sheetName, data, headers = null) {
  if (!data || data.length === 0) {
    Logger.log(`⚠️ Batch save skipped: No data for ${sheetName}`);
    return;
  }
  
  try {
    const sheet = getOrCreateSheet(sheetName, headers);
    const numRows = data.length;
    const numCols = data[0].length;
    const startRow = sheet.getLastRow() + 1;

    // นี่คือการเรียก API ที่ทรงพลังที่สุด (Fastest Write)
    sheet.getRange(startRow, 1, numRows, numCols).setValues(data);
    
    Logger.log(`💾 Saved ${numRows} rows to ${sheetName} (Batch Write)`);
    
  } catch (error) {
    Logger.log(`❌ Error in batchAppendRows for ${sheetName}: ${error.message}`);
    // Fallback: ถ้า Error อาจจะลอง append ทีละแถว หรือ throw error
    throw error;
  }
}

/**
 * Save Conversation to Sheet (ใช้ Batch Write)
 */
function saveConversation(data) {
  const sheetName = SHEET_CONFIG.SHEETS.CONVERSATIONS;
  const headers = SHEET_CONFIG.COLUMNS.CONVERSATIONS;
  
  const rowData = [
    data.timestamp, 
    data.userId, 
    data.userMessage, 
    data.aiResponse, 
    data.intent
  ];
  
  try {
    // ใช้ Batch function แม้จะบันทึกเพียง 1 แถว เพื่อใช้ setValues
    batchAppendRows(sheetName, [rowData], headers);
    
    Logger.log('💾 Saved conversation to sheet');
    
  } catch (error) {
    Logger.log(`⚠️ Error saving conversation: ${error.message}`);
  }
}

/**
 * Get Sheet Data As Array (💡 NEW: แก้ไขข้อผิดพลาด getSheetDataAsArray is not defined)
 * ดึงข้อมูลทั้งหมดจาก Sheet และแปลงเป็น Array ของ Objects
 * โดยใช้แถวแรกเป็น Header
 * @param {string} sheetName - ชื่อชีต
 * @return {Array<Object>} Array of objects or empty array
 */
function getSheetDataAsArray(sheetName) {
  try {
    const sheet = getOrCreateSheet(sheetName); 
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow <= 1) {
      // มีแค่ Header หรือไม่มีข้อมูล
      return [];
    }

    // ดึง Header และ Data ทั้งหมด
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const dataValues = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    const dataArray = [];

    // แปลงแต่ละแถวเป็น Object
    dataValues.forEach(row => {
      const rowObject = {};
      headers.forEach((header, index) => {
        // ใช้ header เป็น key และค่าใน cell เป็น value
        rowObject[header] = row[index];
      });
      dataArray.push(rowObject);
    });
    
    Logger.log(`✅ Loaded ${dataArray.length} records from ${sheetName}`);
    return dataArray;

  } catch (error) {
    Logger.log(`❌ Error in getSheetDataAsArray for ${sheetName}: ${error.message}`);
    return [];
  }
}

/**
 * Find Row by Value (คงไว้)
 */
function findRowByValue(sheet, columnIndex, searchValue) {
  // โค้ดนี้ถูกคงไว้ตามไฟล์ต้นฉบับ
  try {
    const data = sheet.getDataRange().getValues();
    // เริ่มจากแถวที่ 1 (แถว 0 คือ header)
    for (let i = 1; i < data.length; i++) {
      if (data[i][columnIndex - 1] === searchValue) {
        return i + 1; // ส่งกลับเลขแถวที่เป็นค่าจริง (1-based index)
      }
    }
    return 0;
  } catch (error) {
    Logger.log(`❌ Error finding row: ${error.message}`);
    return 0;
  }
}

/**
 * Update Row (คงไว้)
 */
function updateRow(sheet, rowNumber, values) {
  // โค้ดนี้ถูกคงไว้ตามไฟล์ต้นฉบับ
  try {
    if (rowNumber < 1) return false;
    
    const numCols = values.length;
    // ใช้ setValues เพื่ออัพเดทแถว
    sheet.getRange(rowNumber, 1, 1, numCols).setValues([values]);
    Logger.log(`✅ Updated row ${rowNumber}`);
    return true;
    
  } catch (error) {
    Logger.log(`❌ Error updating row: ${error.message}`);
    return false;
  }
}

// ========================================
// 🛢️ OIL REPORT FUNCTIONS (ADD TO SHEETSERVICE.GS)
// ========================================

/**
 * Save Oil Report and Calculate Summary
 * บันทึกรายงานน้ำมันเก่าและคำนวณยอดสรุป
 * @param {Object} data - { userId, branch, amount, imageUrl }
 * @return {Object} Summary data { branch, latest, accumulated, remaining, goal }
 */
function saveOilReport(data) {
  try {
    const sheetName = SHEET_CONFIG.SHEETS.OIL_REPORTS; // ต้องตรงกับ Config.js ('Oil_Reports')
    // ตรวจสอบว่ามีชีตนี้หรือไม่ ถ้าไม่มีให้สร้าง
    const sheet = getOrCreateSheet(sheetName, SHEET_CONFIG.COLUMNS.OIL_REPORTS);
    
    const timestamp = new Date();
    const monthKey = Utilities.formatDate(timestamp, 'Asia/Bangkok', 'yyyy-MM'); // ใช้ Group by เดือน
    
    // 1. บันทึกข้อมูลลง Sheet
    // Columns: [timestamp, branch, amount, image_url, staff_user_id, month_key]
    sheet.appendRow([
      timestamp,
      data.branch,
      data.amount,
      data.imageUrl,
      data.userId,
      monthKey
    ]);
    
    Logger.log(`💾 Oil Report saved for ${data.branch}: ${data.amount} THB`);

    // 2. คำนวณยอดสรุป (Summary Calculation)
    const reportData = getSheetDataAsArray(sheetName);
    
    // กรองเฉพาะสาขาและเดือนปัจจุบัน
    const currentMonthData = reportData.filter(row => {
      // แปลง Timestamp ใน Sheet กลับเป็น Date object เพื่อหาเดือน
      // หรือใช้ month_key ที่เราเพิ่งสร้างก็ได้ (ถ้ามี column นี้)
      // เพื่อความชัวร์ ใช้ key ที่เราสร้าง row ล่าสุด
      return row['branch'] === data.branch && 
             row['month_key'] === monthKey;
    });

    // ยอดรวมสะสมของสาขานี้ ในเดือนนี้
    const totalAccumulated = currentMonthData.reduce((sum, row) => {
      return sum + (parseFloat(row['amount']) || 0);
    }, 0);

    // เป้าหมาย (จาก Config)
    const goal = SYSTEM_CONFIG.DEFAULTS.OIL_REPORT_GOAL || 10000;
    const remaining = Math.max(0, goal - totalAccumulated);

    return {
      branch: data.branch,
      latest: data.amount,
      accumulated: totalAccumulated,
      remaining: remaining,
      goal: goal
    };

  } catch (error) {
    Logger.log(`❌ Error saving oil report: ${error.message}`);
    throw new Error(`ไม่สามารถบันทึกข้อมูลลง Sheet ได้: ${error.message}`);
  }
}

// NOTE: ฟังก์ชันอื่น ๆ ที่ใช้ saveConversation ใน EventHandler.js ไม่ต้องแก้ไข
// เพราะเราได้ปรับปรุง saveConversation ให้ทำงานอย่างมีประสิทธิภาพแล้ว
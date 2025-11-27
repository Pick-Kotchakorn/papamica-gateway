// ========================================
// 📈 INSIGHTSERVICE.GS - ANALYTICS DATA PROCESSING
// ========================================
// ไฟล์นี้ประมวลผลข้อมูล LINE Insight Analytics
// แปลงข้อมูลดิบเป็นรายงานที่เข้าใจง่าย

/**
 * Get Insight Line Data
 * ดึงข้อมูลจาก Insight Line sheet
 * 
 * @return {Array<Object>} Array of insight data
 */
function getInsightLineData() {
  try {
    Logger.log('📥 Getting Insight Line data...');
    
    const ss = SpreadsheetApp.openById(INSIGHT_CONFIG.INSIGHT_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(INSIGHT_CONFIG.SHEETS.INSIGHT_RAW);
    
    if (!sheet) {
      Logger.log('❌ Sheet "Insight Line" not found!');
      return [];
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 4) {
      Logger.log('⚠️ Not enough data in Insight Line sheet');
      return [];
    }
    
    // Read data starting from row 4 (actual header row)
    const dataRange = sheet.getRange(4, 1, lastRow - 3, sheet.getLastColumn());
    const values = dataRange.getValues();
    
    if (values.length === 0) {
      Logger.log('⚠️ No data rows found');
      return [];
    }
    
    // Convert to array of objects
    const headers = values[0];
    const data = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const obj = {};
      
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      
      // Only include rows with date
      if (obj['date'] || obj[Object.keys(obj)[0]]) {
        data.push(obj);
      }
    }
    
    Logger.log(`✅ Loaded ${data.length} records from Insight Line`);
    return data;
    
  } catch (error) {
    Logger.log('❌ Error getting Insight Line data: ' + error);
    return [];
  }
}

/**
 * Process Overview Data
 * ประมวลผลข้อมูลภาพรวม (Analytics Daily)
 * 
 * @param {Array<Object>} insightData - Raw insight data
 */
function processOverviewData(insightData) {
  try {
    Logger.log('📊 Processing Overview Data...');
    
    const sheet = getOrCreateSheet(
      INSIGHT_CONFIG.SHEETS.ANALYTICS_DAILY,
      getInsightSheetHeaders('ANALYTICS_DAILY')
    );
    
    let processedCount = 0;
    
    insightData.forEach(row => {
      const dateValue = row['date'] || row[Object.keys(row)[0]];
      if (!dateValue) return;
      
      const date = new Date(dateValue);
      const contacts = parseFloat(row['contacts'] || 0);
      const targetReaches = parseFloat(row['targetReaches'] || 0);
      const blocks = parseFloat(row['blocks'] || 0);
      
      // Skip duplicate dates
      if (isDuplicateDate(sheet, date)) {
        return;
      }
      
      // Calculate metrics
      const previousContacts = getPreviousDayContacts(sheet, date);
      const netGain = previousContacts ? contacts - previousContacts : 0;
      const blockRate = contacts > 0 ? (blocks / contacts * 100).toFixed(2) : 0;
      const growthRate = previousContacts > 0 ? ((netGain / previousContacts) * 100).toFixed(2) : 0;
      
      sheet.appendRow([
        date,
        contacts,
        targetReaches,
        blocks,
        netGain,
        blockRate,
        growthRate,
        new Date()
      ]);
      
      processedCount++;
    });
    
    Logger.log(`✅ Processed ${processedCount} overview records`);
    
  } catch (error) {
    Logger.log('❌ Error processing overview data: ' + error);
  }
}

/**
 * Get Previous Day Contacts
 * ดึงจำนวน contacts ของวันก่อนหน้า
 * 
 * @param {Sheet} sheet - Sheet object
 * @param {Date} currentDate - Current date
 * @return {number|null} Previous day contacts or null
 */
function getPreviousDayContacts(sheet, currentDate) {
  try {
    if (!sheet || sheet.getLastRow() < 2) return null;
    
    const data = sheet.getDataRange().getValues();
    const current = new Date(currentDate);
    const previous = new Date(current);
    previous.setDate(previous.getDate() - 1);
    
    const row = data.find(r => {
      if (!r[0]) return false;
      const rowDate = new Date(r[0]);
      return rowDate.getTime() === previous.getTime();
    });
    
    return row ? row[1] : null;
    
  } catch (error) {
    Logger.log(`❌ Error getting previous day contacts: ${error.message}`);
    return null;
  }
}

/**
 * Process Messaging Data
 * ประมวลผลข้อมูลการส่งข้อความ
 * 
 * @param {Array<Object>} insightData - Raw insight data
 */
function processMessagingData(insightData) {
  try {
    Logger.log('💬 Processing Messaging Data...');
    
    const sheet = getOrCreateSheet(
      INSIGHT_CONFIG.SHEETS.MESSAGING_STATS,
      getInsightSheetHeaders('MESSAGING_STATS')
    );
    
    let processedCount = 0;
    
    insightData.forEach(row => {
      const dateValue = row['msg_date'] || row['date'];
      if (!dateValue) return;
      
      const date = new Date(dateValue);
      
      // Get messaging data
      const cmsBroadcast = parseFloat(row['msg_CMS_BROADCAST'] || 0);
      const autoResponse = parseFloat(row['msg_AUTO_RESPONSE'] || 0);
      const welcomeResponse = parseFloat(row['msg_WELCOME_RESPONSE'] || 0);
      const crmChat = parseFloat(row['msg_CRM_CHAT'] || 0);
      const apiPush = parseFloat(row['msg_API_PUSH'] || 0);
      const apiMulticast = parseFloat(row['msg_API_MULTICAST'] || 0);
      
      const totalMessages = cmsBroadcast + autoResponse + welcomeResponse + 
                           crmChat + apiPush + apiMulticast;
      
      const activeThreads = parseFloat(row['resp_activeThreads'] || 0);
      const inMessages = parseFloat(row['resp_inMessages'] || 0);
      const outMessages = parseFloat(row['resp_outMessages'] || 0);
      const responseRate = inMessages > 0 ? ((outMessages / inMessages) * 100).toFixed(2) : 0;
      
      if (totalMessages > 0 && !isDuplicateDate(sheet, date)) {
        sheet.appendRow([
          date,
          cmsBroadcast,
          autoResponse,
          welcomeResponse,
          crmChat,
          apiPush,
          apiMulticast,
          totalMessages,
          activeThreads,
          inMessages,
          outMessages,
          responseRate,
          new Date()
        ]);
        processedCount++;
      }
    });
    
    Logger.log(`✅ Processed ${processedCount} messaging records`);
    
  } catch (error) {
    Logger.log('❌ Error processing messaging data: ' + error);
  }
}

/**
 * Process Broadcast Data
 * ประมวลผลข้อมูลการบรอดแคสต์
 * 
 * @param {Array<Object>} insightData - Raw insight data
 */
function processBroadcastData(insightData) {
  try {
    Logger.log('📢 Processing Broadcast Data...');
    
    const sheet = getOrCreateSheet(
      INSIGHT_CONFIG.SHEETS.BROADCAST_PERFORMANCE,
      getInsightSheetHeaders('BROADCAST_PERFORMANCE')
    );
    
    let processedCount = 0;
    
    insightData.forEach(row => {
      const broadcastId = row['bc_broadcastId'];
      if (!broadcastId) return;
      
      const sentDate = row['bc_sentDate'];
      const statsType = row['bc_statsType'] || 'ALL';
      const impressions = parseFloat(row['bc_imp'] || 0);
      const clicks = parseFloat(row['bc_click'] || 0);
      const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0;
      
      const conversionId = row['bc_conversionId'];
      const conversionCount = parseFloat(row['bc_conversionCount'] || 0);
      const conversionUu = parseFloat(row['bc_conversionUu'] || 0);
      const conversionRate = clicks > 0 ? ((conversionUu / clicks) * 100).toFixed(2) : 0;
      
      if (!isDuplicateBroadcast(sheet, broadcastId, statsType)) {
        sheet.appendRow([
          broadcastId,
          sentDate ? new Date(sentDate) : '',
          statsType,
          impressions,
          clicks,
          ctr,
          conversionId || 'N/A',
          conversionCount,
          conversionUu,
          conversionRate,
          new Date()
        ]);
        processedCount++;
      }
    });
    
    Logger.log(`✅ Processed ${processedCount} broadcast records`);
    
  } catch (error) {
    Logger.log('❌ Error processing broadcast data: ' + error);
  }
}

/**
 * Check if Broadcast Already Exists
 * ตรวจสอบว่ามี broadcast นี้แล้วหรือไม่
 * 
 * @param {Sheet} sheet - Sheet object
 * @param {string} broadcastId - Broadcast ID
 * @param {string} statsType - Stats type
 * @return {boolean} True if exists
 */
function isDuplicateBroadcast(sheet, broadcastId, statsType) {
  try {
    if (!sheet || sheet.getLastRow() < 2) return false;
    
    const data = sheet.getDataRange().getValues();
    return data.some(row => row[0] === broadcastId && row[2] === statsType);
    
  } catch (error) {
    Logger.log(`❌ Error checking duplicate broadcast: ${error.message}`);
    return false;
  }
}

/**
 * Process Acquisition Data
 * ประมวลผลข้อมูลช่องทางการเพิ่มเพื่อน
 * 
 * @param {Array<Object>} insightData - Raw insight data
 */
function processAcquisitionData(insightData) {
  try {
    Logger.log('📈 Processing Acquisition Data...');
    
    const sheet = getOrCreateSheet(
      INSIGHT_CONFIG.SHEETS.ACQUISITION_CHANNELS,
      getInsightSheetHeaders('ACQUISITION_CHANNELS')
    );
    
    let processedCount = 0;
    
    insightData.forEach(row => {
      const dateValue = row['acq_date'] || row['date'];
      const path = row['acq_path'] || row['acq_path_daily'];
      
      if (!dateValue || !path) return;
      
      const date = new Date(dateValue);
      const originPoint = row['acq_originPoint'];
      const campaign = row['acq_campaign'];
      const gained = parseFloat(row['acq_gained'] || row['acq_gained_daily'] || 0);
      const blocked = parseFloat(row['acq_blocked'] || row['acq_blocked_daily'] || 0);
      const netGrowth = gained - blocked;
      const conversionRate = gained > 0 ? ((netGrowth / gained) * 100).toFixed(2) : 0;
      
      sheet.appendRow([
        date,
        path,
        originPoint || 'N/A',
        campaign || 'Organic',
        gained,
        blocked,
        netGrowth,
        conversionRate,
        new Date()
      ]);
      processedCount++;
    });
    
    Logger.log(`✅ Processed ${processedCount} acquisition records`);
    
  } catch (error) {
    Logger.log('❌ Error processing acquisition data: ' + error);
  }
}

/**
 * Process Rich Menu Data
 * ประมวลผลข้อมูล Rich Menu
 * 
 * @param {Array<Object>} insightData - Raw insight data
 */
function processRichMenuData(insightData) {
  try {
    Logger.log('📱 Processing Rich Menu Data...');
    
    const sheet = getOrCreateSheet(
      INSIGHT_CONFIG.SHEETS.RICH_MENU_STATS,
      getInsightSheetHeaders('RICH_MENU_STATS')
    );
    
    let processedCount = 0;
    
    insightData.forEach(row => {
      const richMenuId = row['rm_richMenuId'];
      if (!richMenuId) return;
      
      const cmsUrl = row['rm_cmsUrl'];
      const impressions = parseFloat(row['rm_imp'] || 0);
      const impressionsUu = parseFloat(row['rm_impUU'] || 0);
      const action = row['rm_action'] || 'ALL';
      const clicks = parseFloat(row['rm_click'] || 0);
      const clicksUu = parseFloat(row['rm_clickUU'] || 0);
      const clickRate = impressionsUu > 0 ? ((clicksUu / impressionsUu) * 100).toFixed(2) : 0;
      
      sheet.appendRow([
        richMenuId,
        cmsUrl || 'N/A',
        impressions,
        impressionsUu,
        action,
        clicks,
        clicksUu,
        clickRate,
        new Date()
      ]);
      processedCount++;
    });
    
    Logger.log(`✅ Processed ${processedCount} rich menu records`);
    
  } catch (error) {
    Logger.log('❌ Error processing rich menu data: ' + error);
  }
}

/**
 * Main Sync Function
 * ฟังก์ชันหลักสำหรับ sync ข้อมูลทั้งหมด
 */
function syncInsightData() {
  try {
    Logger.log('🔄 Starting Insight Data Sync...');
    Logger.log('=' .repeat(60));
    
    // 1. Load insight data
    const insightData = getInsightLineData();
    
    if (!insightData || insightData.length === 0) {
      Logger.log('❌ No data found in Insight Line sheet');
      return;
    }
    
    Logger.log(`✅ Loaded ${insightData.length} records`);
    Logger.log('=' .repeat(60));
    
    // 2. Process each data type
    processOverviewData(insightData);
    processMessagingData(insightData);
    processBroadcastData(insightData);
    processAcquisitionData(insightData);
    processRichMenuData(insightData);
    
    Logger.log('=' .repeat(60));
    Logger.log('✅ Insight Data Sync Completed!');
    Logger.log('=' .repeat(60));
    
  } catch (error) {
    Logger.log('❌ Error in syncInsightData: ' + error);
    Logger.log('Stack trace: ' + error.stack);
    throw error;
  }
}

/**
 * Test Insight Service
 * ทดสอบ Insight Service
 */
function testInsightService() {
  Logger.log('🧪 Testing Insight Service...');
  Logger.log('=' .repeat(60));
  
  // Test 1: Load Data
  Logger.log('\n1️⃣ Testing Data Loading...');
  const data = getInsightLineData();
  Logger.log(`   ✅ Loaded ${data.length} records`);
  
  if (data.length > 0) {
    Logger.log('   Sample keys: ' + Object.keys(data[0]).slice(0, 5).join(', '));
  }
  
  // Test 2: Process Sample
  if (data.length > 0) {
    Logger.log('\n2️⃣ Testing Overview Processing (sample)...');
    processOverviewData(data.slice(0, 5));
    Logger.log('   ✅ Sample processed');
  }
  
  Logger.log('=' .repeat(60));
  Logger.log('✅ Insight Service test completed!');
  Logger.log('\n💡 To run full sync: syncInsightData()');
}

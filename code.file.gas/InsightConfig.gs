// ========================================
// 📊 INSIGHTCONFIG.GS - ANALYTICS CONFIGURATION
// ========================================
// ไฟล์นี้เก็บการตั้งค่าสำหรับ LINE Insight Analytics
// แยกออกมาจาก Config.gs เพื่อความชัดเจน

/**
 * LINE Insight Analytics Configuration
 */
const INSIGHT_CONFIG = {
  // Spreadsheet IDs
  MAIN_SPREADSHEET_ID: '1afgFn-5DreAdYW50c8qDTudbvzzQiHbXEAjBpJBSmEo',
  INSIGHT_SPREADSHEET_ID: '1afgFn-5DreAdYW50c8qDTudbvzzQiHbXEAjBpJBSmEo', // Same as main
  
  // Sheet Names
  SHEETS: {
    INSIGHT_RAW: 'Insight Line',
    FOLLOWERS: 'Followers',
    CONVERSATIONS: 'Conversations',
    ANALYTICS_DAILY: 'Analytics_Daily',
    ANALYTICS_SUMMARY: 'Analytics_Summary',
    MESSAGING_STATS: 'Messaging_Stats',
    ACQUISITION_CHANNELS: 'Acquisition_Channels',
    BROADCAST_PERFORMANCE: 'Broadcast_Performance',
    SEGMENT_ANALYSIS: 'Segment_Analysis',
    RICH_MENU_STATS: 'RichMenu_Stats',
    DASHBOARD: 'Dashboard'
  },
  
  // Column Mapping for Insight Line Sheet
  COLUMNS: {
    // Overview columns (1-4)
    OVERVIEW: {
      DATE: 0,
      CONTACTS: 1,
      TARGET_REACHES: 2,
      BLOCKS: 3
    },
    
    // Demographics - Gender (5-7)
    GENDER: {
      GENDER: 4,
      AUG24: 5,
      SEP25: 6
    },
    
    // Demographics - Age (8-10)
    AGE: {
      AGE_GENDER: 7,
      AGE: 8,
      AGE_PERCENTAGE: 9
    },
    
    // Demographics - Area (14-15)
    AREA: {
      AREA: 13,
      AREA_PERCENTAGE: 14
    },
    
    // Acquisition - Overview (16-20)
    ACQUISITION: {
      PATH: 15,
      ORIGIN_POINT: 16,
      CAMPAIGN: 17,
      GAINED: 18,
      BLOCKED: 19
    },
    
    // Profile (25-27)
    PROFILE: {
      DATE: 24,
      PAGE_VIEW: 25,
      UNIQUE_USER: 26
    },
    
    // Messages (29-35)
    MESSAGES: {
      DATE: 28,
      CMS_BROADCAST: 29,
      AUTO_RESPONSE: 30,
      WELCOME_RESPONSE: 31,
      CRM_CHAT: 32,
      API_PUSH: 33,
      API_MULTICAST: 34
    },
    
    // Broadcast (37-44)
    BROADCAST: {
      ID: 36,
      SENT_DATE: 37,
      STATS_TYPE: 38,
      IMPRESSIONS: 39,
      CLICKS: 40,
      CONVERSION_ID: 41,
      CONVERSION_COUNT: 42,
      CONVERSION_UU: 43
    },
    
    // Rich Menu (46-53)
    RICH_MENU: {
      ID: 45,
      CMS_URL: 46,
      IMPRESSIONS: 47,
      IMPRESSIONS_UU: 48,
      ACTION: 49,
      CLICKS: 50,
      CLICKS_UU: 51,
      CLICKS_UU_RATE: 52
    }
  },
  
  // Data Processing Settings
  PROCESSING: {
    MAX_RECORDS_PER_BATCH: 100,
    ENABLE_DUPLICATE_CHECK: true,
    AUTO_FORMAT_DATES: true
  },
  
  // Dashboard Settings
  DASHBOARD: {
    REFRESH_INTERVAL: 3600, // seconds (1 hour)
    MAX_DISPLAY_ROWS: 30,
    DEFAULT_TIME_RANGE: 30 // days
  }
};

/**
 * Get Insight Column Index
 * ช่วยในการหาตำแหน่ง column
 * 
 * @param {string} category - Category name (e.g., 'OVERVIEW')
 * @param {string} field - Field name (e.g., 'DATE')
 * @return {number} Column index (0-based)
 */
function getInsightColumnIndex(category, field) {
  try {
    const categoryObj = INSIGHT_CONFIG.COLUMNS[category];
    if (!categoryObj) {
      throw new Error(`Category not found: ${category}`);
    }
    
    const index = categoryObj[field];
    if (index === undefined) {
      throw new Error(`Field not found: ${field} in ${category}`);
    }
    
    return index;
    
  } catch (error) {
    Logger.log(`❌ Error getting column index: ${error.message}`);
    return -1;
  }
}

/**
 * Validate Insight Configuration
 * ตรวจสอบความถูกต้องของ configuration
 * 
 * @return {boolean} Valid or not
 */
function validateInsightConfig() {
  try {
    Logger.log('🔍 Validating Insight Configuration...');
    
    const checks = [
      { 
        name: 'Main Spreadsheet ID', 
        value: INSIGHT_CONFIG.MAIN_SPREADSHEET_ID 
      },
      { 
        name: 'Insight Spreadsheet ID', 
        value: INSIGHT_CONFIG.INSIGHT_SPREADSHEET_ID 
      },
      { 
        name: 'Sheet Names', 
        value: Object.keys(INSIGHT_CONFIG.SHEETS).length > 0 
      },
      { 
        name: 'Column Mappings', 
        value: Object.keys(INSIGHT_CONFIG.COLUMNS).length > 0 
      }
    ];
    
    let allValid = true;
    
    checks.forEach(check => {
      if (!check.value) {
        Logger.log(`❌ Missing: ${check.name}`);
        allValid = false;
      } else {
        Logger.log(`✅ Valid: ${check.name}`);
      }
    });
    
    if (allValid) {
      Logger.log('✅ All insight configuration validated successfully');
    } else {
      Logger.log('⚠️ Some insight configuration values are missing');
    }
    
    return allValid;
    
  } catch (error) {
    Logger.log(`❌ Insight configuration validation error: ${error.message}`);
    return false;
  }
}

/**
 * Get Insight Sheet Headers
 * สร้าง headers สำหรับแต่ละ Analytics Sheet
 * 
 * @param {string} sheetType - Type of sheet
 * @return {Array<string>} Array of header names
 */
function getInsightSheetHeaders(sheetType) {
  const headers = {
    'ANALYTICS_DAILY': [
      'Date',
      'Total Contacts',
      'Target Reaches',
      'Blocks',
      'Net Gain',
      'Block Rate (%)',
      'Growth Rate (%)',
      'Updated'
    ],
    
    'MESSAGING_STATS': [
      'Date',
      'CMS Broadcast',
      'Auto Response',
      'Welcome Response',
      'CRM Chat',
      'API Push',
      'API Multicast',
      'Total Messages',
      'Active Threads',
      'In Messages',
      'Out Messages',
      'Response Rate (%)',
      'Updated'
    ],
    
    'ACQUISITION_CHANNELS': [
      'Date',
      'Channel Path',
      'Origin Point',
      'Campaign',
      'Gained',
      'Blocked',
      'Net Growth',
      'Conversion Rate (%)',
      'Updated'
    ],
    
    'BROADCAST_PERFORMANCE': [
      'Broadcast ID',
      'Sent Date',
      'Stats Type',
      'Impressions',
      'Clicks',
      'CTR (%)',
      'Conversion ID',
      'Conversion Count',
      'Conversion UU',
      'Conversion Rate (%)',
      'Updated'
    ],
    
    'RICH_MENU_STATS': [
      'Rich Menu ID',
      'CMS URL',
      'Impressions',
      'Impressions UU',
      'Action',
      'Clicks',
      'Clicks UU',
      'Click Rate (%)',
      'Updated'
    ]
  };
  
  return headers[sheetType] || [];
}

/**
 * Test Insight Configuration
 * ทดสอบ configuration
 */
function testInsightConfiguration() {
  Logger.log('🧪 Testing Insight Configuration...');
  Logger.log('=' .repeat(60));
  
  Logger.log('\n📋 Spreadsheet Configuration:');
  Logger.log(`  Main ID: ${INSIGHT_CONFIG.MAIN_SPREADSHEET_ID}`);
  Logger.log(`  Insight ID: ${INSIGHT_CONFIG.INSIGHT_SPREADSHEET_ID}`);
  
  Logger.log('\n📊 Sheet Names:');
  Object.keys(INSIGHT_CONFIG.SHEETS).forEach(key => {
    Logger.log(`  ${key}: ${INSIGHT_CONFIG.SHEETS[key]}`);
  });
  
  Logger.log('\n🔢 Column Categories:');
  Object.keys(INSIGHT_CONFIG.COLUMNS).forEach(category => {
    const fields = Object.keys(INSIGHT_CONFIG.COLUMNS[category]);
    Logger.log(`  ${category}: ${fields.length} fields`);
  });
  
  Logger.log('\n🧪 Testing Column Index Lookup:');
  const testIndex = getInsightColumnIndex('OVERVIEW', 'DATE');
  Logger.log(`  OVERVIEW.DATE = ${testIndex}`);
  
  Logger.log('\n🧪 Testing Sheet Headers:');
  const headers = getInsightSheetHeaders('ANALYTICS_DAILY');
  Logger.log(`  ANALYTICS_DAILY: ${headers.length} headers`);
  
  Logger.log('\n🔍 Running Validation:');
  validateInsightConfig();
  
  Logger.log('=' .repeat(60));
  Logger.log('✅ Insight Configuration test completed!');
}

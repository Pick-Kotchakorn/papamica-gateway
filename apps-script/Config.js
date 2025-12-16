// ========================================
// 🔧 CONFIG.JS - MAIN CONFIGURATION (V2.3 - Chat Flow Optimized)
// ========================================
// ไฟล์นี้เก็บการตั้งค่าทั้งหมดของระบบ
// ดึงค่าสำคัญจาก Script Properties เพื่อความปลอดภัย

// ดึงค่า PropertiesService มาเก็บไว้ในตัวแปรเพื่อความสะดวก
const PROPERTIES = PropertiesService.getScriptProperties();

/**
 * LINE Official Account Configuration
 */
const LINE_CONFIG = {
  // LINE Channel Access Token (ดึงจาก Script Properties)
  CHANNEL_ACCESS_TOKEN: PROPERTIES.getProperty('LINE_CHANNEL_ACCESS_TOKEN'),
  
  // LINE API Endpoints
  API_ENDPOINTS: {
    PUSH_MESSAGE: 'https://api.line.me/v2/bot/message/push',
    REPLY_MESSAGE: 'https://api.line.me/v2/bot/message/reply',
    GET_PROFILE: 'https://api.line.me/v2/bot/profile',
    LOADING_ANIMATION: 'https://api.line.me/v2/bot/chat/loading/start',
    // 💡 NEW: Mark as Read API
    MARK_AS_READ: 'https://api.line.me/v2/bot/chat/markAsRead'
  },
  
  // Loading Animation Settings
  LOADING_SECONDS: 5
};

/**
 * Google Sheets Configuration
 */
const SHEET_CONFIG = {
  // Main Spreadsheet ID (ดึงจาก Script Properties)
  SPREADSHEET_ID: PROPERTIES.getProperty('SHEET_SPREADSHEET_ID'),
  
  // Sheet Names
  SHEETS: {
    CONVERSATIONS: 'Conversations',
    FOLLOWERS: 'Followers',
    INSIGHT_RAW: 'Insight Line',
    ANALYTICS_DAILY: 'Analytics_Daily',
    ANALYTICS_SUMMARY: 'Analytics_Summary',
    MESSAGING_STATS: 'Messaging_Stats',
    ACQUISITION_CHANNELS: 'Acquisition_Channels',
    BROADCAST_PERFORMANCE: 'Broadcast_Performance',
    SEGMENT_ANALYSIS: 'Segment_Analysis',
    RICH_MENU_STATS: 'RichMenu_Stats',
    DASHBOARD: 'Dashboard',
    // 💡 NEW: เพิ่มชื่อ Sheet สำหรับ Oil Report
    OIL_REPORTS: 'Oil_Reports' 
  },
  
  // Column Structures
  COLUMNS: {
    CONVERSATIONS: [
      'Timestamp',
      'User ID',
      'User Message',
      'Response Format',
      'Intent'
    ],
    FOLLOWERS: [
      'User ID',
      'Display Name',
      'Picture URL',
      'Language',
      'Status Message',
      'First Follow Date',
      'Last Follow Date',
      'Follow Count',
      'Status',
      'Source Channel',
      'Tags',
      'Last Interaction',
      'Total Messages'
    ],
    // 💡 NEW: เพิ่ม Column Structure สำหรับ Oil Report
    OIL_REPORTS: [
        'timestamp',
        'branch',
        'amount',
        'type',
        'image_url',
        'staff_user_id',
        'month_key'
    ] 
  }
};

/**
 * System Configuration
 */
const SYSTEM_CONFIG = {
  // Feature Flags
  FEATURES: {
    DIALOGFLOW_ENABLED: true,      
    ANALYTICS_ENABLED: true,         
    AUTO_RESPONSE: false,             
    FOLLOWER_TRACKING: true          
  },
  
  // 💡 NEW: Delay setting for Asynchronous Tasks
  ASYNC_DELAY_MS: 100, // หน่วงเวลาการประมวลผลเบื้องหลัง (millisecond)

  // Cache Settings (ใช้ใน FollowerService.js)
  CACHE_SETTINGS: {
    FOLLOWER_TTL_SECONDS: 3600, // แคชข้อมูลผู้ติดตาม 1 ชั่วโมง
    STATS_TTL_SECONDS: 300      // แคชสถิติ 5 นาที
  },
  
  // Response Messages
  MESSAGES: {
    MAINTENANCE: 'ระบบอยู่ระหว่างการปรับปรุง กรุณาลองใหม่อีกครั้งในภายหลัง 🙏',
    ERROR: 'ขออภัยครับ ระบบอยู่ระหว่างปรับปรุง กรุณาลองใหม่อีกครั้ง',
    ECHO_TEMPLATE: '📩 คุณส่งข้อความว่า: "{message}"\n\n⚙️ ระบบอยู่ระหว่างการปรับปรุง\nขออภัยในความไม่สะดวก 🙏',
    NO_WELCOME_MESSAGE: '[NO WELCOME MESSAGE - Handled by LINE Manager]',
    AI_FALLBACK: '🤖 ขออภัยค่ะ ตอนนี้บอทไม่เข้าใจคำถามของคุณ แต่เราจะส่งเรื่องให้แอดมินช่วยดูแลต่อทันทีค่ะ'
  },
  
  // Default Values
  DEFAULTS: {
    FOLLOWER_STATUS: 'active',
    FOLLOWER_SOURCE: 'unknown',
    FOLLOWER_TAGS: 'new-customer',
    UNKNOWN_DISPLAY_NAME: 'Unknown',
    UNKNOWN_LANGUAGE: 'unknown',
    UNKNOWN_LANGUAGE: 'unknown',
    DIALOGFLOW_CONFIDENCE_THRESHOLD: 0.65,
    // 💡 NEW: กำหนดเป้าหมายสำหรับ Oil Report (ตัวอย่าง 10,000 บาท)
    OIL_REPORT_GOAL: 10000 
  }
};

/**
 * Get configuration value
 * @param {string} path - Dot notation path (e.g., 'LINE_CONFIG.API_ENDPOINTS.PUSH_MESSAGE')
 * @return {*} Configuration value
 */
function getConfig(path) {
  try {
    const parts = path.split('.');
    let value = this;
    
    for (const part of parts) {
      value = value[part];
      if (value === undefined) {
        throw new Error(`Config path not found: ${path}`);
      }
    }
    
    return value;
  } catch (error) {
    Logger.log(`❌ Config Error: ${error.message}`);
    return null;
  }
}

/**
 * Validate configuration on startup
 */
function validateConfig() {
  try {
    Logger.log('🔍 Validating configuration...');
    
    const checks = [
      { name: 'LINE Access Token (via Properties)', value: LINE_CONFIG.CHANNEL_ACCESS_TOKEN },
      { name: 'Spreadsheet ID (via Properties)', value: SHEET_CONFIG.SPREADSHEET_ID },
      { name: 'Sheet Names', value: Object.keys(SHEET_CONFIG.SHEETS).length > 0 }
    ];
    
    let allValid = true;
    
    checks.forEach(check => {
      if (!check.value) {
        if (typeof check.value === 'string' && check.value.length < 20) {
           Logger.log(`❌ Missing/Invalid: ${check.name} (Value: ${check.value})`);
           allValid = false;
        } else if (!check.value) {
           Logger.log(`❌ Missing/Invalid: ${check.name}`);
           allValid = false;
        } else {
           Logger.log(`✅ Valid: ${check.name}`);
        }
      } else {
         Logger.log(`✅ Valid: ${check.name}`);
      }
    });
    
    if (allValid) {
      Logger.log('✅ All configuration validated successfully');
    } else {
      Logger.log('⚠️ Some configuration values are missing');
    }
    
    return allValid;
    
  } catch (error) {
    Logger.log(`❌ Configuration validation error: ${error.message}`);
    return false;
  }
}

/**
 * Test configuration
 */
function testConfiguration() {
  Logger.log('🧪 Testing Configuration...');
  Logger.log('=' .repeat(60));
  
  Logger.log('\n📋 LINE Configuration:');
  Logger.log(`  Token Check: ${LINE_CONFIG.CHANNEL_ACCESS_TOKEN ? 'Loaded' : '❌ Failed'}`);
  Logger.log(`  Loading Seconds: ${LINE_CONFIG.LOADING_SECONDS}s`);
  
  Logger.log('\n📊 Sheet Configuration:');
  Logger.log(`  Spreadsheet ID Check: ${SHEET_CONFIG.SPREADSHEET_ID ? 'Loaded' : '❌ Failed'}`);
  Logger.log(`  Total Sheets: ${Object.keys(SHEET_CONFIG.SHEETS).length}`);
  
  Logger.log('\n⚙️ System Features:');
  Object.keys(SYSTEM_CONFIG.FEATURES).forEach(feature => {
    const status = SYSTEM_CONFIG.FEATURES[feature] ? '✅' : '❌';
    Logger.log(`  ${status} ${feature}: ${SYSTEM_CONFIG.FEATURES[feature]}`);
  });
  
  Logger.log('\n🛢️ Oil Report Configuration:');
  Logger.log(`  Goal: ${SYSTEM_CONFIG.DEFAULTS.OIL_REPORT_GOAL}`);
  Logger.log(`  Async Delay: ${SYSTEM_CONFIG.ASYNC_DELAY_MS}ms`);

  Logger.log('\n🔍 Running Validation:');
  validateConfig();
  
  Logger.log('=' .repeat(60));
  Logger.log('✅ Configuration test completed!');
}
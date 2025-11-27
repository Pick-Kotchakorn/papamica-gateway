// ========================================
// 🔧 CONFIG.GS - MAIN CONFIGURATION
// ========================================
// ไฟล์นี้เก็บการตั้งค่าทั้งหมดของระบบ
// แก้ไขที่นี่เมื่อต้องการเปลี่ยนค่า configuration

/**
 * LINE Official Account Configuration
 */
const LINE_CONFIG = {
  // LINE Channel Access Token
  CHANNEL_ACCESS_TOKEN: 'pK1ISEv3EpisSPdg2+LL5GNOWT9jpB9w4Q0CDMfAtp1KCZDM8yGeBvxTf7M6TwT/kTWEJ/3ZyZ5kEqvz8ZezZ2PSAP8cjipmu+n0yH1lxtRWscYYxah2S78+mPvy8yxCgo3B+QwrBLDzXztjvOQDWgdB04t89/1O/w1cDnyilFU=',
  
  // LINE API Endpoints
  API_ENDPOINTS: {
    PUSH_MESSAGE: 'https://api.line.me/v2/bot/message/push',
    REPLY_MESSAGE: 'https://api.line.me/v2/bot/message/reply',
    GET_PROFILE: 'https://api.line.me/v2/bot/profile',
    LOADING_ANIMATION: 'https://api.line.me/v2/bot/chat/loading/start'
  },
  
  // Loading Animation Settings
  LOADING_SECONDS: 5
};

/**
 * Google Sheets Configuration
 */
const SHEET_CONFIG = {
  // Main Spreadsheet ID
  SPREADSHEET_ID: '1afgFn-5DreAdYW50c8qDTudbvzzQiHbXEAjBpJBSmEo',
  
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
    DASHBOARD: 'Dashboard'
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
    ]
  }
};

/**
 * System Configuration
 */
const SYSTEM_CONFIG = {
  // Feature Flags
  FEATURES: {
    DIALOGFLOW_ENABLED: false,      // ⚠️ Dialogflow ปิดชั่วคราว
    ANALYTICS_ENABLED: true,         // ✅ Analytics เปิดใช้งาน
    AUTO_RESPONSE: true,             // ✅ Echo message เปิดใช้งาน
    FOLLOWER_TRACKING: true          // ✅ ติดตามผู้ติดตามเปิดใช้งาน
  },
  
  // Messages
  MESSAGES: {
    MAINTENANCE: 'ระบบอยู่ระหว่างการปรับปรุง กรุณาลองใหม่อีกครั้งในภายหลัง 🙏',
    ERROR: 'ขออภัยครับ ระบบอยู่ระหว่างปรับปรุง กรุณาลองใหม่อีกครั้ง',
    ECHO_TEMPLATE: '📩 คุณส่งข้อความว่า: "{message}"\n\n⚙️ ระบบอยู่ระหว่างการปรับปรุง\nขออภัยในความไม่สะดวก 🙏',
    NO_WELCOME_MESSAGE: '[NO WELCOME MESSAGE - Handled by LINE Manager]'
  },
  
  // Default Values
  DEFAULTS: {
    FOLLOWER_STATUS: 'active',
    FOLLOWER_SOURCE: 'unknown',
    FOLLOWER_TAGS: 'new-customer',
    UNKNOWN_DISPLAY_NAME: 'Unknown',
    UNKNOWN_LANGUAGE: 'unknown'
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
      { name: 'LINE Access Token', value: LINE_CONFIG.CHANNEL_ACCESS_TOKEN },
      { name: 'Spreadsheet ID', value: SHEET_CONFIG.SPREADSHEET_ID },
      { name: 'Sheet Names', value: Object.keys(SHEET_CONFIG.SHEETS).length > 0 }
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
  Logger.log(`  Token Length: ${LINE_CONFIG.CHANNEL_ACCESS_TOKEN.length} chars`);
  Logger.log(`  Loading Seconds: ${LINE_CONFIG.LOADING_SECONDS}s`);
  
  Logger.log('\n📊 Sheet Configuration:');
  Logger.log(`  Spreadsheet ID: ${SHEET_CONFIG.SPREADSHEET_ID}`);
  Logger.log(`  Total Sheets: ${Object.keys(SHEET_CONFIG.SHEETS).length}`);
  
  Logger.log('\n⚙️ System Features:');
  Object.keys(SYSTEM_CONFIG.FEATURES).forEach(feature => {
    const status = SYSTEM_CONFIG.FEATURES[feature] ? '✅' : '❌';
    Logger.log(`  ${status} ${feature}: ${SYSTEM_CONFIG.FEATURES[feature]}`);
  });
  
  Logger.log('\n🔍 Running Validation:');
  validateConfig();
  
  Logger.log('=' .repeat(60));
  Logger.log('✅ Configuration test completed!');
}

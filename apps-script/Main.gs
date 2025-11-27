// ========================================
// 🚀 MAIN.GS - ENTRY POINT
// ========================================
// ไฟล์นี้เป็นจุดเริ่มต้นของระบบ
// รับ Webhook จาก LINE และกระจายไปยัง handlers ที่เหมาะสม

/**
 * Main Webhook Handler
 * Entry point สำหรับ LINE Webhook
 * 
 * @param {Object} e - Event object from Google Apps Script
 * @return {ContentService.TextOutput} Response to LINE
 */
function doPost(e) {
  try {
    Logger.log('🔔 Webhook received from LINE');
    Logger.log('=' .repeat(60));
    
    // Parse request body
    const body = JSON.parse(e.postData.contents);
    const events = body.events || [];
    
    if (events.length === 0) {
      Logger.log('⚠️ No events in webhook');
      return createJsonResponse({ status: 'ok', message: 'No events' });
    }
    
    Logger.log(`📦 Processing ${events.length} event(s)`);
    
    // Process each event
    events.forEach((event, index) => {
      try {
        Logger.log(`\n[${index + 1}/${events.length}] Processing event type: ${event.type}`);
        routeEvent(event);
      } catch (error) {
        Logger.log(`❌ Error processing event ${index + 1}: ${error.message}`);
        // Continue processing other events
      }
    });
    
    Logger.log('=' .repeat(60));
    Logger.log('✅ Webhook processing completed');
    
    return createJsonResponse({ status: 'ok' });
    
  } catch (error) {
    Logger.log('❌ Error in doPost: ' + error);
    Logger.log('Stack trace: ' + error.stack);
    return createJsonResponse({ 
      status: 'error', 
      message: error.toString() 
    });
  }
}

/**
 * Route event to appropriate handler
 * 
 * @param {Object} event - LINE event object
 */
function routeEvent(event) {
  try {
    const eventType = event.type;
    const userId = event.source?.userId;
    
    if (!userId) {
      Logger.log('⚠️ No userId in event, skipping');
      return;
    }
    
    // Route based on event type
    switch (eventType) {
      case 'message':
        handleMessageEvent(event);
        break;
        
      case 'postback':
        handlePostbackEvent(event);
        break;
        
      case 'follow':
        handleFollowEvent(event);
        break;
        
      case 'unfollow':
        handleUnfollowEvent(event);
        break;
        
      case 'join':
        handleJoinEvent(event);
        break;
        
      case 'leave':
        handleLeaveEvent(event);
        break;
        
      default:
        Logger.log(`⚠️ Unsupported event type: ${eventType}`);
        break;
    }
    
  } catch (error) {
    Logger.log(`❌ Error in routeEvent: ${error.message}`);
    throw error;
  }
}

/**
 * Create JSON response for LINE
 * 
 * @param {Object} data - Response data
 * @return {ContentService.TextOutput} JSON response
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test webhook with sample event
 */
function testWebhook() {
  Logger.log('🧪 Testing Webhook Handler...');
  Logger.log('=' .repeat(60));
  
  // Sample text message event
  const sampleEvent = {
    postData: {
      contents: JSON.stringify({
        events: [
          {
            type: 'message',
            message: {
              type: 'text',
              text: 'Hello from test'
            },
            source: {
              userId: 'U1234567890abcdef1234567890abcdef'
            },
            timestamp: Date.now()
          }
        ]
      })
    }
  };
  
  // Process test event
  const response = doPost(sampleEvent);
  
  Logger.log('\n📤 Response:');
  Logger.log(response.getContent());
  
  Logger.log('=' .repeat(60));
  Logger.log('✅ Webhook test completed!');
}

/**
 * Health check function
 * ใช้ตรวจสอบว่าระบบทำงานปกติ
 */
function healthCheck() {
  Logger.log('🏥 Running Health Check...');
  Logger.log('=' .repeat(60));
  
  const checks = [];
  
  // Check 1: Configuration
  try {
    validateConfig();
    checks.push({ name: 'Configuration', status: '✅', message: 'Valid' });
  } catch (error) {
    checks.push({ name: 'Configuration', status: '❌', message: error.message });
  }
  
  // Check 2: Spreadsheet Access
  try {
    SpreadsheetApp.openById(SHEET_CONFIG.SPREADSHEET_ID);
    checks.push({ name: 'Spreadsheet Access', status: '✅', message: 'Connected' });
  } catch (error) {
    checks.push({ name: 'Spreadsheet Access', status: '❌', message: error.message });
  }
  
  // Check 3: LINE API Access
  try {
    // Simple check - just verify token exists
    if (LINE_CONFIG.CHANNEL_ACCESS_TOKEN) {
      checks.push({ name: 'LINE API Token', status: '✅', message: 'Configured' });
    } else {
      checks.push({ name: 'LINE API Token', status: '❌', message: 'Missing' });
    }
  } catch (error) {
    checks.push({ name: 'LINE API Token', status: '❌', message: error.message });
  }
  
  // Display results
  Logger.log('\n📊 Health Check Results:');
  checks.forEach(check => {
    Logger.log(`${check.status} ${check.name}: ${check.message}`);
  });
  
  const allHealthy = checks.every(c => c.status === '✅');
  
  Logger.log('=' .repeat(60));
  if (allHealthy) {
    Logger.log('✅ All systems operational!');
  } else {
    Logger.log('⚠️ Some systems need attention');
  }
  
  return allHealthy;
}

/**
 * Initialize system
 * รันฟังก์ชันนี้ครั้งแรกเมื่อ deploy ใหม่
 */
function initializeSystem() {
  Logger.log('🚀 Initializing System...');
  Logger.log('=' .repeat(60));
  
  // Step 1: Validate configuration
  Logger.log('\n1️⃣ Validating configuration...');
  if (!validateConfig()) {
    Logger.log('❌ Configuration validation failed!');
    return false;
  }
  
  // Step 2: Initialize sheets
  Logger.log('\n2️⃣ Initializing sheets...');
  try {
    initializeSheets();
    Logger.log('✅ Sheets initialized');
  } catch (error) {
    Logger.log(`❌ Sheet initialization failed: ${error.message}`);
    return false;
  }
  
  // Step 3: Run health check
  Logger.log('\n3️⃣ Running health check...');
  if (!healthCheck()) {
    Logger.log('⚠️ Health check showed some issues');
  }
  
  Logger.log('=' .repeat(60));
  Logger.log('✅ System initialization completed!');
  Logger.log('\n📋 Next steps:');
  Logger.log('  1. Set up LINE Webhook URL in LINE Manager');
  Logger.log('  2. Test with testWebhook() function');
  Logger.log('  3. Monitor logs for incoming webhooks');
  
  return true;
}

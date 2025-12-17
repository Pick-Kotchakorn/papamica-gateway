// ========================================
// 🚀 MAIN.GS - ENTRY POINT (V2.3 - Async Ready)
// ========================================
// ไฟล์นี้เป็นจุดเริ่มต้นของระบบ
// ปรับปรุง: ใช้ Cache Queue และ Trigger เพื่อแยกงานหนักออกไปทำแบบ Asynchronous

/**
 * Helper to create a fast JSON response for Webhook
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data || { status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Main Webhook Handler
 * Entry point สำหรับ LINE Webhook (ปรับปรุงให้ทำงานเร็วที่สุด)
 */
function doPost(e) {
  try {
    Logger.log('🔔 Webhook received from LINE (Fast Exit Mode)');
    Logger.log('=' .repeat(60));
    
    // Parse request body
    const body = JSON.parse(e.postData.contents);
    const events = body.events || [];
    
    if (events.length === 0) {
      Logger.log('⚠️ No events in webhook');
      return createJsonResponse({ status: 'ok', message: 'No events' });
    }
    
    Logger.log(`📦 Processing ${events.length} event(s) in sync phase.`);
    
    // Process each event
    events.forEach((event, index) => {
      try {
        Logger.log(`\n[${index + 1}/${events.length}] Sync Routing Event type: ${event.type}`);
        
        // 1. SYNC PROCESSING (ต้องตอบกลับทันที: Message, Postback, Follow)
        // Follow ถูกรวมใน SYNC เพื่อส่ง Welcome Message ทันที
        if (event.type === 'message' || event.type === 'postback' || event.type === 'follow') {
          routeEvent(event); 
        }
        
        // 2. ASYNC ENQUEUEING (งานหนักเบื้องหลัง: Save Sheet, Update Follower Status)
        // บันทึก Event ทั้งหมดลงคิว
        enqueueEvent(event); 
        
      } catch (error) {
        Logger.log(`❌ SYNC Error processing event ${index + 1}: ${error.message}`);
        // Continue processing other events
      }
    });

    // 3. ตั้ง TRIGGER สำหรับงานหนัก
    if (!isTriggerActive('heavyProcessing')) {
      // ใช้ getConfig เพื่อดึง ASYNC_DELAY_MS ที่เราเพิ่มเข้าไปใน Config.js
      const delay = SYSTEM_CONFIG.ASYNC_DELAY_MS || 100;
      
      ScriptApp.newTrigger('heavyProcessing')
        .timeBased()
        .after(delay) 
        .create();
      Logger.log(`⏰ Scheduled heavyProcessing in ${delay}ms.`);
    }

    Logger.log('=' .repeat(60));
    Logger.log('✅ Webhook processing completed (Fast Exit)');
    
    // 4. คืนค่าตอบกลับ LINE ทันที
    return createJsonResponse({ status: 'ok' }); 

  } catch (error) {
    Logger.log('❌ FATAL Error in doPost: ' + error);
    Logger.log('Stack trace: ' + error.stack);
    return createJsonResponse({ 
      status: 'error', 
      message: error.toString() 
    });
  }
}


// ========================================
// ⚙️ ASYNCHRONOUS PROCESSING HANDLER
// ========================================

/**
 * Background function to process events dequeued from the Cache.
 * Handles tasks that do not require immediate LINE response (Sheet writes, Analytics).
 */
function heavyProcessing() {
  Logger.log('⚡ Starting heavyProcessing (Async Job)...');
  
  // 1. ดึง Events ทั้งหมดออกจาก Queue และล้าง Cache
  const events = dequeueAllEvents(); 
  
  if (events.length === 0) {
    Logger.log('ℹ️ Heavy processing: Queue is empty.');
    // 2. Cleanup: ลบ Trigger ที่เรียกตัวเอง (ถ้าไม่มี Event จะได้ไม่เปลืองทรัพยากร)
    removeSelfTrigger('heavyProcessing');
    return;
  }
  
  Logger.log(`Processing ${events.length} events asynchronously.`);
  
  events.forEach((event, index) => {
    try {
      Logger.log(`\n[Async ${index + 1}/${events.length}] Event type: ${event.type}`);
      
      const eventType = event.type;
      
      // 3. จัดการงานที่ต้องทำในพื้นหลัง
      switch (eventType) {
        case 'message':
          // บันทึก Conversation และ Update Follower Interaction
          asyncHandleMessage(event); 
          break;
          
        case 'postback':
          // บันทึก Conversation
          asyncHandlePostback(event);
          break;
          
        case 'follow':
          // บันทึก Follower (งานหนัก: Get Profile, Sheet Save)
          asyncHandleFollow(event); 
          break;
          
        case 'unfollow':
          // อัพเดท Unfollow
          asyncHandleUnfollow(event); 
          break;
          
        default:
          Logger.log(`⚠️ Async processing skipped for type: ${eventType}`);
          break;
      }
      
    } catch (error) {
      Logger.log(`❌ ASYNC Error processing event ${index + 1}: ${error.message}`);
    }
  });
  
  // 4. Cleanup: ลบ Trigger ที่เรียกตัวเอง
  removeSelfTrigger('heavyProcessing');
  Logger.log('✅ Async Job completed and Trigger removed.');
}


/**
 * Helper: Checks if a trigger with a specific function name is already running/scheduled.
 */
function isTriggerActive(functionName) {
  const triggers = ScriptApp.getProjectTriggers();
  // ตรวจสอบว่ามี Trigger ที่เป็น CLOCK และเรียก functionName นี้หรือไม่
  return triggers.some(trigger => 
    trigger.getHandlerFunction() === functionName &&
    trigger.getEventType() === ScriptApp.EventType.CLOCK
  );
}

/**
 * Helper: Remove the trigger that initiated the current function run.
 * @param {string} functionName - Name of the function to remove (e.g., 'heavyProcessing')
 */
function removeSelfTrigger(functionName) {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === functionName && 
        trigger.getEventType() === ScriptApp.EventType.CLOCK) {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });
  
  if (removed > 0) {
    Logger.log(`🗑️ Deleted ${removed} trigger(s) for ${functionName}`);
  }
}

/**
 * Route event to appropriate handler
 * **Routing Logic ที่พร้อมสำหรับ Feature Expansion**
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
        handleMessageEvent(event); // SYNC: ตอบกลับข้อความ
        break;
        
      case 'postback':
        handlePostbackEvent(event); // SYNC: ตอบกลับ Postback
        break;
        
      case 'follow':
        handleFollowEvent(event); // SYNC: ส่ง Welcome Message
        break;
        
      case 'unfollow':
        // ไม่ต้องทำอะไรใน SYNC
        break;
        
      case 'join':
        Logger.log('🎉 Bot joined. (Skipped handler)');
        break;
        
      case 'leave':
        Logger.log('👋 Bot left. (Skipped handler)');
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


// ========================================
// 🔧 ASYNC HELPER FUNCTIONS (เพิ่มส่วนนี้)
// ========================================

/**
 * Async Handler: Message Event
 * บันทึก Conversation และ Update Follower Interaction
 */
function asyncHandleMessage(event) {
  try {
    const userId = event.source?.userId;
    const userMessage = event.message?.text?.trim();
    
    if (!userId) return;
    
    Logger.log(`[Async] Processing message from: ${userId}`);
    
    // ดึงข้อมูล Profile (อาจใช้เวลา)
    const profile = getUserProfile(userId);
    const displayName = profile?.displayName || 'Unknown';
    
    // บันทึกบทสนทนา (ใช้ข้อมูลจาก event)
    saveConversation({
      userId: userId,
      displayName: displayName,
      userMessage: userMessage || '[Non-text message]',
      aiResponse: '[Processed in sync phase]',
      intent: 'async.background',
      timestamp: new Date(event.timestamp)
    });
    
    Logger.log(`[Async] ✅ Saved conversation for ${userId}`);
    
  } catch (error) {
    Logger.log(`[Async] ❌ Error handling message: ${error.message}`);
  }
}

/**
 * Async Handler: Postback Event
 * บันทึก Postback Interaction
 */
function asyncHandlePostback(event) {
  try {
    const userId = event.source?.userId;
    const postbackData = event.postback?.data;
    
    if (!userId) return;
    
    Logger.log(`[Async] Processing postback from: ${userId}`);
    
    // ดึงข้อมูล Profile
    const profile = getUserProfile(userId);
    const displayName = profile?.displayName || 'Unknown';
    
    // บันทึกบทสนทนา
    saveConversation({
      userId: userId,
      displayName: displayName,
      userMessage: `[Postback] ${postbackData}`,
      aiResponse: '[Processed in sync phase]',
      intent: 'postback',
      timestamp: new Date(event.timestamp)
    });
    
    // อัพเดท Interaction
    updateFollowerInteraction(userId);
    
    Logger.log(`[Async] ✅ Saved postback for ${userId}`);
    
  } catch (error) {
    Logger.log(`[Async] ❌ Error handling postback: ${error.message}`);
  }
}

/**
 * Async Handler: Follow Event
 * บันทึกผู้ติดตามใหม่ (งานหนัก)
 */
function asyncHandleFollow(event) {
  try {
    const userId = event.source?.userId;
    const timestamp = new Date(event.timestamp);
    
    if (!userId) return;
    
    Logger.log(`[Async] Processing follow event for: ${userId}`);
    
    // 1. ดึงข้อมูล Profile จาก LINE API (อาจใช้เวลา)
    const profile = getUserProfile(userId);
    
    // 2. ตรวจสอบข้อมูลเดิม
    const existingData = getFollowerData(userId);
    const followCount = existingData ? (existingData['Follow Count'] || 0) + 1 : 1;
    const firstFollowDate = existingData ? 
      existingData['First Follow Date'] : timestamp;
    
    // 3. บันทึกข้อมูลลง Sheet Followers
    saveFollower({
      userId: userId,
      displayName: profile?.displayName || 'Unknown',
      pictureUrl: profile?.pictureUrl || '',
      language: profile?.language || 'unknown',
      statusMessage: profile?.statusMessage || '',
      firstFollowDate: firstFollowDate,
      lastFollowDate: timestamp,
      followCount: followCount,
      status: 'active',
      sourceChannel: 'unknown',
      tags: 'new-customer',
      lastInteraction: timestamp,
      totalMessages: 0
    });
    
    // 4. บันทึก Log ลง Conversations
    saveConversation({ 
      userId: userId,
      displayName: profile?.displayName || 'Unknown',
      userMessage: '[Follow Event]',
      aiResponse: '[Welcome message sent in sync phase]',
      intent: 'system.follow',
      timestamp: timestamp
    });
    
    Logger.log(`[Async] ✅ Saved follower data for ${userId}`);
    
  } catch (error) {
    Logger.log(`[Async] ❌ Error handling follow: ${error.message}`);
  }
}

/**
 * Async Handler: Unfollow Event
 * อัพเดทสถานะเป็น Blocked
 */
function asyncHandleUnfollow(event) {
  try {
    const userId = event.source?.userId;
    const timestamp = new Date(event.timestamp);
    
    if (!userId) return;
    
    Logger.log(`[Async] Processing unfollow event for: ${userId}`);
    
    // อัพเดทสถานะใน Sheet Followers
    updateFollowerStatus(userId, 'blocked', timestamp);
    
    Logger.log(`[Async] ✅ Updated status to blocked for ${userId}`);
    
  } catch (error) {
    Logger.log(`[Async] ❌ Error handling unfollow: ${error.message}`);
  }
}


// ========================================
// 🧪 TESTING & UTILITY FUNCTIONS
// ========================================

/**
 * ทดสอบ End-to-End Flow
 */
function testOilReportFlow() {
  Logger.log('🧪 Testing Oil Report Flow...');
  Logger.log('=' .repeat(60));
  
  // Test 1: Config Validation
  Logger.log('\n1️⃣ Testing Configuration...');
  const hasToken = !!LINE_CONFIG.CHANNEL_ACCESS_TOKEN;
  const hasSpreadsheet = !!SHEET_CONFIG.SPREADSHEET_ID;
  Logger.log(`   Token: ${hasToken ? '✅' : '❌'}`);
  Logger.log(`   Spreadsheet: ${hasSpreadsheet ? '✅' : '❌'}`);
  
  // Test 2: Sheet Creation
  Logger.log('\n2️⃣ Testing Sheet Creation...');
  try {
    const sheet = getOrCreateSheet(
      SHEET_CONFIG.SHEETS.OIL_REPORTS,
      ['Timestamp', 'User ID', 'Branch', 'Amount', 'Type', 'Image URL', 'Month Key']
    );
    Logger.log(`   Sheet exists: ${!!sheet ? '✅' : '❌'}`);
  } catch (error) {
    Logger.log(`   ❌ Sheet creation failed: ${error.message}`);
  }
  
  // Test 3: Save Test Data
  Logger.log('\n3️⃣ Testing Data Save...');
  try {
    const testData = {
      userId: 'TEST_USER_' + Date.now(),
      branch: 'KSQ',
      amount: 999.99,
      imageUrl: 'https://drive.google.com/test_' + Date.now(),
      type: 'deposit'
    };
    
    const result = saveOilReport(testData);
    Logger.log(`   ✅ Save successful`);
    Logger.log(`   Branch: ${result.branch}`);
    Logger.log(`   Latest: ${result.latest}`);
    Logger.log(`   Accumulated: ${result.accumulated}`);
    Logger.log(`   Goal: ${result.goal}`);
  } catch (error) {
    Logger.log(`   ❌ Save failed: ${error.message}`);
  }
  
  // Test 4: State Management
  Logger.log('\n4️⃣ Testing State Management...');
  try {
    const testUserId = 'TEST_STATE_' + Date.now();
    
    setReportState(testUserId, 'AWAITING_AMOUNT', { branch: 'KSQ' });
    const state1 = getReportState(testUserId);
    Logger.log(`   Set state: ${state1 ? '✅' : '❌'}`);
    
    clearReportState(testUserId);
    const state2 = getReportState(testUserId);
    Logger.log(`   Clear state: ${!state2 ? '✅' : '❌'}`);
  } catch (error) {
    Logger.log(`   ❌ State test failed: ${error.message}`);
  }
  
  // Test 5: Async Functions Exist
  Logger.log('\n5️⃣ Testing Async Functions...');
  const asyncFunctions = [
    'asyncHandleMessage',
    'asyncHandlePostback',
    'asyncHandleFollow',
    'asyncHandleUnfollow'
  ];
  
  asyncFunctions.forEach(funcName => {
    const exists = typeof this[funcName] === 'function';
    Logger.log(`   ${funcName}: ${exists ? '✅' : '❌'}`);
  });
  
  Logger.log('=' .repeat(60));
  Logger.log('✅ Test completed!');
}
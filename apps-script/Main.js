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
      const delay = getConfig('SYSTEM_CONFIG.ASYNC_DELAY_MS') || 100;
      
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

// NOTE: ฟังก์ชัน initializeSystem(), healthCheck(), และฟังก์ชันทดสอบอื่น ๆ 
// (ถ้ามีในไฟล์ Main.js เดิมของคุณ) ยังคงต้องอยู่
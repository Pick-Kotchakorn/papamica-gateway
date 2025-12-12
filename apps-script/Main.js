// ========================================
// 🚀 MAIN.GS - ENTRY POINT (V2.0 FINAL)
// ========================================
// ไฟล์นี้เป็นจุดเริ่มต้นของระบบ
// รับ Webhook จาก LINE และกระจายไปยัง handlers ที่เหมาะสม

/**
 * Main Webhook Handler
 * Entry point สำหรับ LINE Webhook
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
        routeEvent(event); // <-- Router จะจัดการแยกประเภท Event
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
        handleMessageEvent(event); // Go to EventHandler.gs
        break;
        
      case 'postback':
        handlePostbackEvent(event); // Go to EventHandler.gs
        break;
        
      case 'follow':
        handleFollowEvent(event); // <-- Feature Expansion: Follower Management
        break;
        
      case 'unfollow':
        handleUnfollowEvent(event); // <-- Feature Expansion: Follower Management
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

/**
 * Create JSON response for LINE
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// NOTE: ฟังก์ชัน initializeSystem(), healthCheck(), และฟังก์ชันทดสอบอื่น ๆ 
// ควรอยู่ใน Main.gs ต้นฉบับ และควรคงไว้เพื่อการทดสอบ
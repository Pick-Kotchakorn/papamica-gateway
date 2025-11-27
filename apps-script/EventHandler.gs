// ========================================
// 📨 EVENTHANDLER.GS - EVENT PROCESSING
// ========================================
// ไฟล์นี้จัดการ Events ต่างๆ จาก LINE
// แยกตาม event type และประมวลผลตามความเหมาะสม

/**
 * Handle Message Event
 * จัดการข้อความที่ส่งเข้ามา
 * 
 * @param {Object} event - LINE message event
 */
function handleMessageEvent(event) {
  try {
    const messageType = event.message?.type;
    
    if (!messageType) {
      Logger.log('⚠️ No message type');
      return;
    }
    
    Logger.log(`📨 Message type: ${messageType}`);
    
    // Route based on message type
    switch (messageType) {
      case 'text':
        handleTextMessage(event);
        break;
        
      case 'image':
        handleImageMessage(event);
        break;
        
      case 'video':
        handleVideoMessage(event);
        break;
        
      case 'audio':
        handleAudioMessage(event);
        break;
        
      case 'file':
        handleFileMessage(event);
        break;
        
      case 'location':
        handleLocationMessage(event);
        break;
        
      case 'sticker':
        handleStickerMessage(event);
        break;
        
      default:
        Logger.log(`⚠️ Unsupported message type: ${messageType}`);
        break;
    }
    
  } catch (error) {
    Logger.log(`❌ Error in handleMessageEvent: ${error.message}`);
    throw error;
  }
}

/**
 * Handle Text Message
 * 
 * @param {Object} event - LINE text message event
 */
function handleTextMessage(event) {
  try {
    const userId = event.source?.userId;
    const userMessage = event.message?.text?.trim();
    
    if (!userId || !userMessage) {
      Logger.log('⚠️ Missing userId or userMessage');
      return;
    }
    
    Logger.log(`📝 User: ${userId}`);
    Logger.log(`💬 Message: ${userMessage}`);
    
    // Send loading animation
    sendLoadingAnimation(userId);
    
    // Check if Dialogflow is enabled
    if (SYSTEM_CONFIG.FEATURES.DIALOGFLOW_ENABLED) {
      // TODO: Process with Dialogflow
      Logger.log('🤖 Dialogflow processing (not implemented)');
      pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.MAINTENANCE);
    } else {
      // Echo mode (Dialogflow disabled)
      const echoMessage = SYSTEM_CONFIG.MESSAGES.ECHO_TEMPLATE
        .replace('{message}', userMessage);
      pushSimpleMessage(userId, echoMessage);
      Logger.log('📤 Sent echo message');
    }
    
    // Update follower interaction
    if (SYSTEM_CONFIG.FEATURES.FOLLOWER_TRACKING) {
      updateFollowerInteraction(userId);
    }
    
    // Save to sheet
    saveConversation({
      userId: userId,
      userMessage: userMessage,
      aiResponse: '[SYSTEM MAINTENANCE] Echo: ' + userMessage,
      intent: 'N/A',
      timestamp: new Date()
    });
    
    Logger.log('✅ Text message processed');
    
  } catch (error) {
    Logger.log(`❌ Error in handleTextMessage: ${error.message}`);
    
    // Send error message to user
    try {
      pushSimpleMessage(event.source?.userId, SYSTEM_CONFIG.MESSAGES.ERROR);
    } catch (e) {
      Logger.log(`❌ Failed to send error message: ${e.message}`);
    }
  }
}

/**
 * Handle Postback Event
 * จัดการเมื่อผู้ใช้กด button หรือ quick reply
 * 
 * @param {Object} event - LINE postback event
 */
function handlePostbackEvent(event) {
  try {
    const userId = event.source?.userId;
    const postbackData = event.postback?.data;
    
    if (!userId || !postbackData) {
      Logger.log('⚠️ Missing userId or postbackData');
      return;
    }
    
    Logger.log(`🔘 User: ${userId}`);
    Logger.log(`📦 Data: ${postbackData}`);
    
    // Send loading animation
    sendLoadingAnimation(userId);
    
    // Check if Dialogflow is enabled
    if (SYSTEM_CONFIG.FEATURES.DIALOGFLOW_ENABLED) {
      // TODO: Process with Dialogflow
      Logger.log('🤖 Dialogflow processing (not implemented)');
      pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.MAINTENANCE);
    } else {
      // Send maintenance message
      pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.MAINTENANCE);
    }
    
    // Update follower interaction
    if (SYSTEM_CONFIG.FEATURES.FOLLOWER_TRACKING) {
      updateFollowerInteraction(userId);
    }
    
    // Save to sheet
    saveConversation({
      userId: userId,
      userMessage: '[Postback] ' + postbackData,
      aiResponse: '[SYSTEM MAINTENANCE]',
      intent: 'N/A',
      timestamp: new Date()
    });
    
    Logger.log('✅ Postback processed');
    
  } catch (error) {
    Logger.log(`❌ Error in handlePostbackEvent: ${error.message}`);
    
    try {
      pushSimpleMessage(event.source?.userId, SYSTEM_CONFIG.MESSAGES.ERROR);
    } catch (e) {
      Logger.log(`❌ Failed to send error message: ${e.message}`);
    }
  }
}

/**
 * Handle Follow Event
 * จัดการเมื่อมีผู้ใช้เพิ่มเพื่อน (Follow)
 * 
 * @param {Object} event - LINE follow event
 */
function handleFollowEvent(event) {
  try {
    const userId = event.source?.userId;
    const timestamp = new Date(event.timestamp);
    
    if (!userId) {
      Logger.log('⚠️ No userId in follow event');
      return;
    }
    
    Logger.log(`👤 New Follower: ${userId}`);
    
    // Get user profile
    const profile = getUserProfile(userId);
    
    // Check if user followed before
    const existingData = getFollowerData(userId);
    const followCount = existingData ? existingData.followCount + 1 : 1;
    const firstFollowDate = existingData ? existingData.firstFollowDate : timestamp;
    
    // Save follower data
    saveFollower({
      userId: userId,
      displayName: profile.displayName || SYSTEM_CONFIG.DEFAULTS.UNKNOWN_DISPLAY_NAME,
      pictureUrl: profile.pictureUrl || '',
      language: profile.language || SYSTEM_CONFIG.DEFAULTS.UNKNOWN_LANGUAGE,
      statusMessage: profile.statusMessage || '',
      firstFollowDate: firstFollowDate,
      lastFollowDate: timestamp,
      followCount: followCount,
      status: SYSTEM_CONFIG.DEFAULTS.FOLLOWER_STATUS,
      sourceChannel: SYSTEM_CONFIG.DEFAULTS.FOLLOWER_SOURCE,
      tags: SYSTEM_CONFIG.DEFAULTS.FOLLOWER_TAGS,
      lastInteraction: timestamp,
      totalMessages: 0
    });
    
    // Save follow event to conversations
    saveConversation({
      userId: userId,
      userMessage: '[Follow Event]',
      aiResponse: SYSTEM_CONFIG.MESSAGES.NO_WELCOME_MESSAGE,
      intent: 'system.follow',
      timestamp: timestamp
    });
    
    Logger.log('✅ Follow event processed (Welcome message handled by LINE Manager)');
    
  } catch (error) {
    Logger.log(`❌ Error in handleFollowEvent: ${error.message}`);
  }
}

/**
 * Handle Unfollow Event
 * จัดการเมื่อผู้ใช้บล็อกหรือลบเพื่อน (Unfollow)
 * 
 * @param {Object} event - LINE unfollow event
 */
function handleUnfollowEvent(event) {
  try {
    const userId = event.source?.userId;
    const timestamp = new Date(event.timestamp);
    
    if (!userId) {
      Logger.log('⚠️ No userId in unfollow event');
      return;
    }
    
    Logger.log(`👋 User Unfollowed: ${userId}`);
    
    // Update follower status to blocked
    updateFollowerStatus(userId, 'blocked', timestamp);
    
    Logger.log('✅ Unfollow event processed');
    
  } catch (error) {
    Logger.log(`❌ Error in handleUnfollowEvent: ${error.message}`);
  }
}

/**
 * Handle Join Event
 * จัดการเมื่อ Bot ถูกเพิ่มเข้า Group หรือ Room
 * 
 * @param {Object} event - LINE join event
 */
function handleJoinEvent(event) {
  try {
    const sourceType = event.source?.type;
    const sourceId = event.source?.groupId || event.source?.roomId;
    
    Logger.log(`🎉 Bot joined ${sourceType}: ${sourceId}`);
    
    // ส่งข้อความทักทาย (ถ้าต้องการ)
    // Note: ใช้ sourceId แทน userId สำหรับ group/room
    
    Logger.log('✅ Join event processed');
    
  } catch (error) {
    Logger.log(`❌ Error in handleJoinEvent: ${error.message}`);
  }
}

/**
 * Handle Leave Event
 * จัดการเมื่อ Bot ถูกนำออกจาก Group หรือ Room
 * 
 * @param {Object} event - LINE leave event
 */
function handleLeaveEvent(event) {
  try {
    const sourceType = event.source?.type;
    const sourceId = event.source?.groupId || event.source?.roomId;
    
    Logger.log(`👋 Bot left ${sourceType}: ${sourceId}`);
    
    Logger.log('✅ Leave event processed');
    
  } catch (error) {
    Logger.log(`❌ Error in handleLeaveEvent: ${error.message}`);
  }
}

/**
 * Handle Image Message
 * 
 * @param {Object} event - LINE image message event
 */
function handleImageMessage(event) {
  Logger.log('📸 Image message received');
  const userId = event.source?.userId;
  
  if (userId) {
    pushSimpleMessage(userId, 'ขอบคุณสำหรับรูปภาพค่ะ 📸');
    
    saveConversation({
      userId: userId,
      userMessage: '[Image Message]',
      aiResponse: 'Image received',
      intent: 'media.image',
      timestamp: new Date()
    });
  }
}

/**
 * Handle Video Message
 * 
 * @param {Object} event - LINE video message event
 */
function handleVideoMessage(event) {
  Logger.log('🎥 Video message received');
  const userId = event.source?.userId;
  
  if (userId) {
    pushSimpleMessage(userId, 'ขอบคุณสำหรับวิดีโอค่ะ 🎥');
    
    saveConversation({
      userId: userId,
      userMessage: '[Video Message]',
      aiResponse: 'Video received',
      intent: 'media.video',
      timestamp: new Date()
    });
  }
}

/**
 * Handle Audio Message
 * 
 * @param {Object} event - LINE audio message event
 */
function handleAudioMessage(event) {
  Logger.log('🎵 Audio message received');
  const userId = event.source?.userId;
  
  if (userId) {
    pushSimpleMessage(userId, 'ขอบคุณสำหรับไฟล์เสียงค่ะ 🎵');
    
    saveConversation({
      userId: userId,
      userMessage: '[Audio Message]',
      aiResponse: 'Audio received',
      intent: 'media.audio',
      timestamp: new Date()
    });
  }
}

/**
 * Handle File Message
 * 
 * @param {Object} event - LINE file message event
 */
function handleFileMessage(event) {
  Logger.log('📎 File message received');
  const userId = event.source?.userId;
  
  if (userId) {
    pushSimpleMessage(userId, 'ขอบคุณสำหรับไฟล์ค่ะ 📎');
    
    saveConversation({
      userId: userId,
      userMessage: '[File Message]',
      aiResponse: 'File received',
      intent: 'media.file',
      timestamp: new Date()
    });
  }
}

/**
 * Handle Location Message
 * 
 * @param {Object} event - LINE location message event
 */
function handleLocationMessage(event) {
  Logger.log('📍 Location message received');
  const userId = event.source?.userId;
  const location = event.message;
  
  if (userId && location) {
    const address = location.address || 'Unknown location';
    pushSimpleMessage(userId, `ขอบคุณสำหรับตำแหน่ง: ${address} 📍`);
    
    saveConversation({
      userId: userId,
      userMessage: `[Location] ${address}`,
      aiResponse: 'Location received',
      intent: 'media.location',
      timestamp: new Date()
    });
  }
}

/**
 * Handle Sticker Message
 * 
 * @param {Object} event - LINE sticker message event
 */
function handleStickerMessage(event) {
  Logger.log('😊 Sticker message received');
  const userId = event.source?.userId;
  
  if (userId) {
    // ตอบกลับด้วย sticker (ถ้าต้องการ)
    pushSimpleMessage(userId, 'ขอบคุณสำหรับสติกเกอร์นะคะ 😊');
    
    saveConversation({
      userId: userId,
      userMessage: '[Sticker]',
      aiResponse: 'Sticker received',
      intent: 'media.sticker',
      timestamp: new Date()
    });
  }
}

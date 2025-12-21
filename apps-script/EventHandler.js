// ========================================
// 📨 EVENTHANDLER.GS - FULL VERSION (Oil Report + Logging + Fix ReplyToken)
// ========================================

/**
 * 1. Message Router
 * ฟังก์ชันหลักในการแยกประเภทข้อความและส่งไปยัง Handler ที่เหมาะสม
 */
function handleMessageEvent(event) {
  try {
    const userId = event.source?.userId;
    const messageType = event.message?.type;
    const readToken = event.message?.markAsReadToken;
    
    if (!messageType || !userId) return;

    // ⚡ Fast Action: Mark as Read
    if (readToken && typeof markAsRead === 'function') {
      markAsRead(readToken);
    }

    Logger.log(`📨 Message type: ${messageType} from ${userId}`);

    switch (messageType) {
      case 'text':
        handleTextMessage(event);
        break;
        
      case 'image':
        // ✅ ตรวจสอบก่อนว่าเป็นรูปสำหรับรายงานน้ำมันหรือไม่?
        const isOilReport = handleOilReportImage(event);
        
        if (!isOilReport) {
           // ถ้าไม่ใช่รูปรายงานน้ำมัน ให้บันทึก Interaction ว่ามีการส่งรูปมา
           updateFollowerInteraction(userId);
           Logger.log(`ℹ️ General Image received.`);
        }
        break;
        
      default:
        Logger.log(`⚠️ Unsupported message type: ${messageType}`);
        break;
    }
    
  } catch (error) {
    Logger.log(`❌ Error in handleMessageEvent: ${error.message}`);
  }
}

/**
 * 2. Handle Text Message
 * จัดการข้อความตัวอักษร + Dialogflow + Logging
 */
function handleTextMessage(event) {
  const userId = event.source?.userId;
  const userMessage = event.message?.text?.trim();
  const replyToken = event.replyToken;

  if (!userId || !userMessage) return;

  try {
    sendLoadingAnimation(userId);
    const profile = getUserProfile(userId);
    const displayName = profile.displayName || 'Unknown';

    let aiResponse = '';
    let intent = 'N/A';

    if (SYSTEM_CONFIG.FEATURES.DIALOGFLOW_ENABLED) {
      const dfResponse = queryDialogflow(userMessage, userId);
      const intentName = dfResponse.intent;
      const parameters = dfResponse.parameters;

      // ====================================================
      // 💰 NEW: เช็คยอดเงินสะสม (พร้อม Dynamic Quick Reply)
      // ====================================================
      if ((intentName === 'oil-check-balance' || intentName === 'oil-check-balance-branch') && parameters.branch) {
         
           const branch = parameters.branch;
           const summary = getBranchSummary(branch);

           // 1. Mapping ชื่อสาขา
           const branchNames = {
             'EMQ': 'EmQuartier',
             'ONB': 'One Bangkok',
             'KSQ': 'KingsQuare'
           };
           
           const displayBranch = branchNames[summary.branch] || summary.branch;
           
           const fmt = (num) => Number(num).toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
           const nowStr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm');

           if (dfResponse.messages) {
             let msgString = JSON.stringify(dfResponse.messages);
             
             // แทนที่ตัวแปรต่างๆ
             msgString = msgString.replace(/###BRANCH###/g, displayBranch); 
             msgString = msgString.replace(/###MONTH###/g, summary.month);
             msgString = msgString.replace(/###BALANCE###/g, fmt(summary.netBalance));
             msgString = msgString.replace(/###DATE###/g, nowStr);
             msgString = msgString.replace(/###USER_ID###/g, userId);

             const finalMessages = JSON.parse(msgString);

             // ✨ LOGIC ใหม่: สร้าง Quick Reply แบบ Dynamic (ตัดสาขาปัจจุบันออก)
             const allBranches = [
                { code: 'EMQ', label: 'EmQuartier', text: 'เช็คยอด EmQuartier' },
                { code: 'ONB', label: 'One Bangkok', text: 'เช็คยอด One Bangkok' },
                { code: 'KSQ', label: 'KingsQuare', text: 'เช็คยอด KingsQuare' }
             ];

             // กรองเอาเฉพาะสาขาที่ "ไม่ใช่" สาขาปัจจุบัน
             const quickReplyItems = allBranches
                .filter(b => b.code !== summary.branch) // summary.branch คือรหัสย่อ (EMQ, ONB, KSQ)
                .map(b => ({
                   "type": "action",
                   "action": {
                     "type": "message",
                     "label": b.label,
                     "text": b.text
                   }
                }));

             // ยัด Quick Reply ใส่เข้าไปใน Message ก้อนแรก (Flex Message)
             if (finalMessages.length > 0 && quickReplyItems.length > 0) {
                finalMessages[0].quickReply = {
                   "items": quickReplyItems
                };
             }

             sendLineMessages(userId, { messages: finalMessages }, replyToken);
             
             intent = intentName;
             aiResponse = `[Sent Balance Summary for ${displayBranch}]`;
           } else {
             pushSimpleMessage(userId, `ยอดสาขา ${displayBranch}: ${fmt(summary.netBalance)} บาท`);
           }
        
      }
      // ====================================================
      // 🟢 Default Case
      // ====================================================
      else if (dfResponse.messages) { 
        let msgString = JSON.stringify(dfResponse.messages);
        if (msgString.includes('###USER_ID###')) {
           msgString = msgString.replace(/###USER_ID###/g, userId);
        }
        const finalMessages = JSON.parse(msgString);
        sendLineMessages(userId, { messages: finalMessages }, replyToken);
        
        intent = intentName || 'dialogflow.general';
        aiResponse = '[Dialogflow Response]';
      }
      
    } else {
      pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.MAINTENANCE);
      intent = 'manual.maintenance';
      aiResponse = SYSTEM_CONFIG.MESSAGES.MAINTENANCE;
    }
    
    updateFollowerInteraction(userId);
    saveConversation({
      userId: userId,
      displayName: displayName,
      userMessage: userMessage,
      aiResponse: aiResponse,
      intent: intent,
      timestamp: new Date()
    });
    
  } catch (error) {
    Logger.log(`❌ Error in handleTextMessage: ${error.message}`);
    pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.ERROR);
  }
}

/**
 * 3. Handle Oil Report Image
 * จัดการรูปภาพสลิป บันทึกลง Drive และ Sheet
 * (ยังคงไว้ แต่จะไม่ถูกเรียกใช้ถ้าไม่มีการ Set State AWAITING_IMAGE)
 */
function handleOilReportImage(event) {
  const userId = event.source.userId;
  const messageId = event.message.id;
  
  // ตรวจสอบสถานะการทำรายการของ User
  const state = getReportState(userId);

  if (state && state.step === 'AWAITING_IMAGE') {
      try {
        pushSimpleMessage(userId, '⏳ กำลังบันทึกข้อมูลและอัปโหลดรูปภาพ...');

        const timestampStr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmm');
        const fileName = `SLIP_${state.data.branch}_${timestampStr}.jpg`;
        const driveImageUrl = getMediaContent(messageId, fileName); 

        // 2. เตรียมข้อมูลสำหรับบันทึกลง Sheet
        const finalData = {
          userId: userId,
          branch: state.data.branch,
          amount: state.data.amount,
          imageUrl: driveImageUrl, 
          type: 'deposit'
        };

        // 3. บันทึกและคำนวณยอดสะสมผ่าน SheetService
        const summary = saveOilReport(finalData);

        // 4. ฟังก์ชันจัดการรูปแบบตัวเลขสำหรับข้อความตอบกลับ
        const formatNum = (num) => {
             return Number(num).toLocaleString('th-TH', {minimumFractionDigits: 2});
        };

        // 5. สร้างข้อความตอบกลับสรุปผลการรายงาน
        const replyText = `✅ บันทึกสำเร็จ!\n\n` +
                          `📍 สาขา: ${summary.branch}\n` +
                          `💰 ยอดครั้งนี้: ${formatNum(summary.latest)} บ.\n` +
                          `📊 สะสมเดือนนี้: ${formatNum(summary.accumulated)} บ.\n` + 
                          `🎯 เป้าหมาย: ${formatNum(summary.goal)} บ.\n` + 
                          `🖼️ หลักฐาน: บันทึกลง Drive เรียบร้อย`;
        
        pushSimpleMessage(userId, replyText);
        
        // 6. ล้างสถานะรายการและบันทึกการโต้ตอบ
        clearReportState(userId);
        updateFollowerInteraction(userId);

      } catch (error) {
        Logger.log('Error processing image: ' + error.message);
        pushSimpleMessage(userId, '❌ เกิดข้อผิดพลาด: ' + error.message);
      }
      return true; // ยืนยันว่าประมวลผล Event นี้แล้ว
  }
  return false; // ไม่ใช่ Flow ของการรายงานน้ำมัน
}

/**
 * 4. Handle Follow Event
 * บันทึกผู้ติดตามใหม่ (ไม่ต้องส่งข้อความต้อนรับ)
 */
function handleFollowEvent(event) {
  try {
    const userId = event.source?.userId;
    const timestamp = new Date(event.timestamp);
    if (!userId) return;
    
    Logger.log(`👤 New Follower: ${userId}`);
    
    // 1️⃣ ดึงข้อมูล Profile จาก LINE API
    const profile = getUserProfile(userId);
    
    // 2️⃣ ตรวจสอบข้อมูลเดิม (เพื่อดูว่าเป็นเพื่อนเก่ากลับมาใหม่หรือเปล่า)
    const existingData = getFollowerDataSheet(userId); // เรียกฟังก์ชัน helper จาก SheetService
    const followCount = existingData ? existingData.followCount + 1 : 1;
    const firstFollowDate = existingData ? existingData.firstFollowDate : timestamp;
    
    // 3️⃣ บันทึกข้อมูลลง Sheet Followers
    saveFollower({
      userId: userId,
      displayName: profile.displayName || 'Unknown',
      pictureUrl: profile.pictureUrl || '',
      language: profile.language || 'unknown',
      statusMessage: profile.statusMessage || '',
      firstFollowDate: firstFollowDate,
      lastFollowDate: timestamp,
      followCount: followCount,
      status: 'active',
      sourceChannel: 'unknown',
      tags: 'new-customer',
      lastInteraction: timestamp,
      totalMessages: 0
    });
    
    // ❌ ตัดส่วน welcomeMessage ออกตามคำสั่ง ❌
    // const welcomeMessage = '...';
    // pushSimpleMessage(userId, welcomeMessage);

    // 4️⃣ บันทึก Log ลง Conversations (ระบุว่าไม่ได้ส่งข้อความ)
    saveConversation({ 
      userId: userId,
      displayName: profile.displayName || 'Unknown',
      userMessage: '[Follow Event]',
      aiResponse: '[No Welcome Message]', // ปรับ Log ให้ตรงตามจริง
      intent: 'system.follow',
      timestamp: timestamp
    });

  } catch (error) {
    Logger.log(`❌ Error in handleFollowEvent: ${error.message}`);
  }
}

/**
 * 5. Handle Unfollow Event
 * อัปเดตสถานะเป็น Blocked
 */
function handleUnfollowEvent(event) {
    const userId = event.source?.userId;
    const timestamp = new Date(event.timestamp);
    if (!userId) return;
    
    Logger.log(`👋 User Unfollowed: ${userId}`);
    
    // อัปเดตสถานะใน Sheet Followers
    updateFollowerStatus(userId, 'blocked', timestamp);
}

/**
 * 6. Handle Postback Event
 * จัดการการกดปุ่ม (ถ้ามี)
 */
function handlePostbackEvent(event) {
  const userId = event.source?.userId;
  const postbackData = event.postback?.data;
  const replyToken = event.replyToken;

  if (!userId || !postbackData) return;

  try {
    sendLoadingAnimation(userId);
    
    // Log Postback
    saveConversation({
        userId: userId,
        displayName: 'User',
        userMessage: `[Postback] ${postbackData}`,
        aiResponse: 'Processing...',
        intent: 'postback',
        timestamp: new Date()
    });

    if (SYSTEM_CONFIG.FEATURES.DIALOGFLOW_ENABLED) {
        const dialogflowResponse = queryDialogflow(postbackData, userId);
        if (dialogflowResponse && dialogflowResponse.messages) {
            sendLineMessages(userId, dialogflowResponse, replyToken);
        }
    } else {
        pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.MAINTENANCE);
    }
    
    updateFollowerInteraction(userId);
    
  } catch (error) {
    Logger.log(`❌ Error in handlePostbackEvent: ${error.message}`);
    pushSimpleMessage(userId, SYSTEM_CONFIG.MESSAGES.ERROR);
  }
}
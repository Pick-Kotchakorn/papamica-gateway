// ========================================
// 🤖 DIALOGFLOWSERVICE.GS - DIALOGFLOW INTEGRATION (V2.0 FINAL)
// ========================================
// ไฟล์นี้จัดการการเชื่อมต่อกับ Dialogflow Agent

// Project Configuration (Pulled from user's loading-animation.js/Config.gs)
const DIALOGFLOW_PROJECT_ID = 'yondaimebot-dailogflow';
const DIALOGFLOW_LANGUAGE_CODE = 'th';

/**
 * Query Dialogflow
 * ส่งข้อความไปยัง Dialogflow และประมวลผลผลลัพธ์
 */
function queryDialogflow(message, sessionId) {
  try {
    const accessToken = getDialogflowAccessToken();
    const url = `https://dialogflow.googleapis.com/v2/projects/${DIALOGFLOW_PROJECT_ID}/agent/sessions/${sessionId}:detectIntent`;

    const payload = {
      queryInput: {
        text: {
          text: message,
          languageCode: DIALOGFLOW_LANGUAGE_CODE
        }
      }
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    if (result.error) {
      Logger.log('❌ Dialogflow Error: ' + JSON.stringify(result.error));
      throw new Error(result.error.message);
    }

    const queryResult = result.queryResult;
    Logger.log('🤖 Dialogflow Raw Response: ' + JSON.stringify(result));

    return {
      intent: queryResult.intent ? queryResult.intent.displayName : 'Unknown',
      confidence: queryResult.intentDetectionConfidence || 0,
      fulfillmentText: queryResult.fulfillmentText || '',
      fulfillmentMessages: queryResult.fulfillmentMessages || [],
      webhookPayload: queryResult.webhookPayload || null,
      parameters: queryResult.parameters || {},
      messages: parseDialogflowMessages(queryResult)
    };
  } catch (error) {
    Logger.log('❌ Dialogflow API Error: ' + error);
    return null;
  }
}

/**
 * Parse Dialogflow Messages (รวม Logic การแปลง Payload จากโค้ดเดิม)
 */
function parseDialogflowMessages(queryResult) {
  const messages = [];

  // 1️⃣ Webhook Payload (สำหรับ Custom Payload)
  if (queryResult.webhookPayload && queryResult.webhookPayload.line) {
    Logger.log('✅ Found webhookPayload.line');
    const linePayload = queryResult.webhookPayload.line;
    
    if (Array.isArray(linePayload)) { messages.push(...linePayload); } else { messages.push(linePayload); }
    if (messages.length > 0) return messages;
  }

  // 2️⃣ Fulfillment Messages
  if (queryResult.fulfillmentMessages && queryResult.fulfillmentMessages.length > 0) {
    queryResult.fulfillmentMessages.forEach(msg => {
      
      // ✅ Text messages
      if (msg.text && msg.text.text) { msg.text.text.forEach(t => messages.push({ type: 'text', text: t })); }
      
      // ✅ Custom Payload for LINE (รองรับ Flex Message)
      if (msg.payload && msg.payload.line) { 
        Logger.log('✅ Found payload.line');
        const linePayload = msg.payload.line; 
        if (Array.isArray(linePayload)) { messages.push(...linePayload); } else { messages.push(linePayload); }
      }
      
      // ✅ Quick Reply
      if (msg.quickReplies && msg.quickReplies.quickReplies) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.type === 'text') {
          lastMessage.quickReply = { items: msg.quickReplies.quickReplies.map(qr => ({
            type: 'action', action: { type: 'message', label: qr.substring(0, 20), text: qr }
          })) };
          Logger.log('✅ Quick Reply added');
        }
      }
      
      // ✅ Image messages
      if (msg.image && msg.image.imageUri) {
        messages.push({ type: 'image', originalContentUrl: msg.image.imageUri, previewImageUrl: msg.image.imageUri });
      }
      
      // ✅ Card messages (LINE Template)
      if (msg.card) {
        const card = msg.card;
        const buttons = [];
        
        if (card.buttons) { 
          card.buttons.forEach(btn => { 
            if (btn.postback) {
              buttons.push({ type: 'postback', label: btn.text.substring(0, 20), data: btn.postback });
            } else if (btn.text) {
              buttons.push({ type: 'message', label: btn.text.substring(0, 20), text: btn.text });
            }
          }); 
        }
        
        messages.push({
          type: 'template', altText: card.title || 'Card message',
          template: { type: 'buttons', text: card.subtitle || card.title || 'Information', actions: buttons.slice(0, 4) }
        });
      }
    });
  }

  // 3️⃣ Fallback: ใช้ fulfillmentText
  if (messages.length === 0 && queryResult.fulfillmentText) { 
    messages.push({ type: 'text', text: queryResult.fulfillmentText });
  }

  // 4️⃣ Default fallback
  if (messages.length === 0) { 
    messages.push({ type: 'text', text: 'ขอโทษครับ ไม่เข้าใจคำถาม' });
  }

  Logger.log('📤 Parsed Messages: ' + JSON.stringify(messages));
  return messages;
}

/**
 * Get Dialogflow Access Token (โค้ดสำหรับ Auth)
 */
function getDialogflowAccessToken() {
  const serviceAccount = JSON.parse(PropertiesService.getScriptProperties().getProperty('DIALOGFLOW_SERVICE_ACCOUNT'));
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/dialogflow',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const jwt = createJWT(header, claim, serviceAccount.private_key);
  const options = {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }
  };

  const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', options);
  const result = JSON.parse(response.getContentText());
  return result.access_token;
}

function createJWT(header, claim, privateKey) {
  const encHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header));
  const encClaim = Utilities.base64EncodeWebSafe(JSON.stringify(claim));
  const sig = Utilities.base64EncodeWebSafe(
    Utilities.computeRsaSha256Signature(encHeader + '.' + encClaim, privateKey)
  );
  return encHeader + '.' + encClaim + '.' + sig;
}
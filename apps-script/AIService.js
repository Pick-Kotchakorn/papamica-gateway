// ========================================
// 🧠 AISERVICE.GS - EXTERNAL AI / LLM INTEGRATION
// ========================================
// ไฟล์นี้จัดการการเชื่อมต่อกับ Generative AI ภายนอก
// เพื่อใช้เป็น Fallback หรือ Advanced Answer Generator

// ⚠️ Note: API Key ควรถูกเก็บใน Script Properties เพื่อความปลอดภัย

/**
 * Query External AI (LLM)
 * ใช้ LLM ภายนอก (เช่น Gemini, Claude, GPT) ในการตอบคำถาม
 * @param {string} message - ข้อความจากผู้ใช้
 * @return {string} คำตอบที่สร้างโดย AI หรือข้อความ Fallback
 */
function queryExternalAI(message) {
  try {
    Logger.log('🧠 Querying External AI for fallback...');
    
    // 1. ดึง API Key อย่างปลอดภัยจาก Script Properties
    // สมมติว่าใช้ Gemini API Key
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    
    if (!apiKey) {
      Logger.log('❌ GEMINI_API_KEY not set in Script Properties.');
      return SYSTEM_CONFIG.MESSAGES.AI_FALLBACK; // ใช้ Fallback Message
    }

    // 2. ตั้งค่าการเรียก API (ใช้ Gemini API เป็นตัวอย่าง)
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    
    // System instruction (กำหนดบทบาทของ AI)
    const systemInstruction = "You are a helpful and polite chatbot for UNAGI YONDAIME KIKUKAWA. Answer the user's questions concisely in Thai. If you don't know the answer, politely state that you cannot answer.";

    const payload = {
      // Configuration และ Contents
      contents: [{ role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 2048,
        // ... (อื่นๆ)
      }
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': `Bearer ${apiKey}` // หากใช้ Gemini API (ขึ้นอยู่กับวิธีการ Auth)
        // หรือ 'x-api-key': apiKey (สำหรับบาง API)
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    // 3. ประมวลผลคำตอบ
    const candidates = result.candidates;
    if (candidates && candidates.length > 0) {
      const generatedText = candidates[0].content?.parts[0]?.text;
      if (generatedText) {
        Logger.log('✅ AI Response generated.');
        return generatedText;
      }
    }

    Logger.log('⚠️ AI response empty or blocked.');
    return SYSTEM_CONFIG.MESSAGES.AI_FALLBACK;

  } catch (error) {
    Logger.log(`❌ External AI API Error: ${error.message}`);
    // ส่งข้อความ Fallback เพื่อไม่ให้ระบบหยุดทำงาน
    return SYSTEM_CONFIG.MESSAGES.AI_FALLBACK; 
  }
}

// ========================================
// Helper Function (สำหรับ OCR ใน Phase II)
// ========================================

/**
 * Call Google Cloud Vision API for OCR (Placeholder for Phase II)
 * @param {Blob} imageBlob - Image file as a Blob
 * @return {string} Detected text
 */
function callVisionOCR(imageBlob) {
  // Logic สำหรับ Phase II จะถูกเติมเต็มที่นี่
  // Placeholder:
  Logger.log('OCR Service Placeholder called. Requires Google Cloud Vision setup.');
  return "[OCR_PROCESSING_PENDING]";
}

// NOTE: ต้องตั้งค่า GEMINI_API_KEY ใน Script Properties และแก้ไข Config.gs
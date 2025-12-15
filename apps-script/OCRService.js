// ========================================
// 🔎 OCRSERVICE.GS - IMAGE TO TEXT PROCESSING (V2.1 - Added Retry)
// ========================================
// ไฟล์นี้จัดการการประมวลผลรูปภาพ (เช่น สลิป) ด้วย OCR

/**
 * Call Google Cloud Vision API for OCR
 * ดึงข้อความทั้งหมดจากรูปภาพที่ส่งมา
 * * @param {Blob} imageBlob - Image file as a Blob (เช่น สลิปโอนเงิน)
 * @return {string} Detected text string
 */
function detectTextFromImage(imageBlob) {
  try {
    Logger.log('🔎 Calling Cloud Vision API for OCR...');
    
    // 1. ใช้ retry ครอบ Logic การเรียก API ทั้งหมด
    const fullText = retry(() => {
        Logger.log('🔄 Attempting Cloud Vision API call...');

        // ⚠️ Note: ต้องเปิดใช้งาน Cloud Vision API ใน Google Cloud Console
        
        // 1. แปลง Blob เป็น Base64
        const base64Image = Utilities.base64Encode(imageBlob.getBytes());
        
        // 2. สร้าง Payload สำหรับ Vision API
        const payload = {
          requests: [{
            image: {
              content: base64Image
            },
            features: [{
              type: 'TEXT_DETECTION' // ฟีเจอร์ OCR พื้นฐาน
            }]
          }]
        };
        
        // 3. ดึง OAuth Token (ต้องเปิดบริการ Drive API ใน GAS Services เพื่อให้สิทธิ์)
        const token = ScriptApp.getOAuthToken();
        
        const options = {
          method: 'post',
          contentType: 'application/json',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        };
        
        // 4. เรียกใช้ Vision API
        const url = 'https://vision.googleapis.com/v1/images:annotate';
        const response = UrlFetchApp.fetch(url, options);
        const result = JSON.parse(response.getContentText());
        
        // 5. ประมวลผลผลลัพธ์
        if (result.responses && result.responses.length > 0) {
          const annotations = result.responses[0].textAnnotations;
          if (annotations && annotations.length > 0) {
            // textAnnotations[0].description คือข้อความทั้งหมดที่ถูกอ่าน
            const detectedText = annotations[0].description;
            Logger.log('✅ OCR Success. Detected length: ' + detectedText.length);
            return detectedText;
          }
        }
        
        // ถ้า API สำเร็จ แต่ไม่พบข้อความ ให้ Throw error เพื่อให้ retry
        throw new Error('OCR failed to detect text.');
        
    }, 3, 3000); // Retry 3 ครั้ง, 3 วินาที delay

    return fullText;
    
  } catch (error) {
    // Error ที่นี่คือ error หลังจากที่ retry ครบจำนวนครั้งแล้ว
    Logger.log(`❌ OCR Service Error after retries: ${error.message}`);
    // ตรวจสอบว่าเปิดใช้งาน Vision API ใน Google Cloud Project และ GAS Service หรือยัง
    return `[OCR_ERROR: ${error.message}]`;
  }
}

/**
 * Process Bank Slip Data
 * ฟังก์ชันสำหรับประมวลผลข้อมูลที่อ่านได้จากสลิปโอนเงิน
 * @param {string} ocrText - ข้อความดิบที่ได้จาก OCR
 * @return {Object} Object ที่มีข้อมูลที่ดึงได้ (เช่น amount, date, time)
 */
function processSlipData(ocrText) {
    Logger.log('✂️ Processing slip data...');
    const result = {
        amount: null,
        date: null,
        time: null,
        sender: null,
        rawText: ocrText
    };
    
    // ⚠️ Logic การดึงข้อมูลจากข้อความดิบ (RegEx) จะถูกเพิ่มในภายหลัง
    // เนื่องจากรูปแบบสลิปแต่ละธนาคารไม่เหมือนกัน
    
    // Example: ดึงจำนวนเงิน (สมมติว่าใช้ RegEx หาตัวเลขที่มีคอมม่าหรือทศนิยม)
    const amountMatch = ocrText.match(/(\d{1,3}(,\d{3})*(\.\d{2})?)/);
    if (amountMatch) {
        result.amount = parseFloat(amountMatch[0].replace(/,/g, ''));
    }
    
    // Example: ดึงวันที่ (สมมติว่าใช้ RegEx หา DD/MM/YYYY หรือ DD-MM-YYYY)
    const dateMatch = ocrText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (dateMatch) {
        result.date = dateMatch[0];
    }
    
    Logger.log('✅ Slip data extracted.');
    return result;
}

// NOTE: ต้องเปิดใช้งาน Cloud Vision API ใน Google Cloud Project และ
// ต้องเปิดใช้งาน Drive API ใน GAS Editor (เพื่อใช้ ScriptApp.getOAuthToken)
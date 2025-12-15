// apps-script/OilReportWeb.gs

// ========================================
// 🌐 OILREPORTWEB.GS - WEB APP HANDLER (V1.1 - Parameter Fix)
// ========================================

/**
 * Main Web App Entry Point (Handles the display of the HTML form)
 * @param {Object} e - Event object containing request parameters (userId, branch)
 * @return {HtmlOutput} Rendered HTML form
 */
function doGet(e) {
  Logger.log('🌐 Web App accessed via doGet');
  
  // 1. Get user parameters from URL (passed by Line Bot)
  const branch = e.parameter.branch || '';
  const userId = e.parameter.userId || '';
  
  // 💡 FIX: ใช้ String().trim() เพื่อป้องกันค่าว่าง/ช่องว่าง ที่อาจทำให้ Logic การตรวจสอบล้มเหลว
  const cleanBranch = String(branch).trim();
  const cleanUserId = String(userId).trim();
  
  // 2. Validate essential parameters
  if (!cleanBranch || !cleanUserId) {
    // 💡 Note: Error นี้ควรเกิดขึ้นเฉพาะเมื่อเปิด URL โดยตรง
    return HtmlService.createHtmlOutput('<h1>❌ Error: Missing Branch or User ID Parameter.</h1><p>Please start the report process from the LINE Bot again.</p>');
  }
  
  // 3. Render HTML template and pass data
  const template = HtmlService.createTemplateFromFile('OilReportForm');
  
  // 💡 **CRITICAL FIX:** กำหนดตัวแปรให้กับ HTML Template (เพื่อให้ HTML เข้าถึงได้ด้วย < ? = ... ? >)
  template.branch = cleanBranch;
  template.userId = cleanUserId;

  const htmlOutput = template
    .evaluate()
    .setTitle('รายงานยอดขายน้ำมันเก่า');
  
  return htmlOutput;
}

/**
 * Backend function to receive form data and process the report
 * (Called by google.script.run from the HTML form)
 * @param {Object} formData - Form data object including file Blob
 * @return {Object} Summary data to be displayed on the form and sent back to Line
 */
function processWebReport(formData) {
  try {
    const userId = formData.userId;
    const branchCode = formData.branch;
    // 💡 Note: ต้องมั่นใจว่า safeParseFloat, formatNumber, pushSimpleMessage, saveOilReport อยู่ในขอบเขตการทำงาน (Global Scope)
    const amount = safeParseFloat(formData.amount); // From Utils.js
    const imageBlob = formData.image; // File Blob
    
    // 1. Validation
    if (amount <= 0 || !branchCode || !userId || !imageBlob) {
        throw new Error('กรุณากรอกยอดขายที่ถูกต้องและแนบรูปบิล');
    }
    
    // 2. Save Image to Drive (ใช้ Logic จาก LineAPI.js ที่ถูกนำมาใช้ใน Web)
    const FOLDER_ID = PROPERTIES.getProperty('OIL_REPORT_DRIVE_FOLDER_ID') || 'root'; 
    const fileName = `web_report_bill_${branchCode}_${new Date().getTime()}.jpg`;
    imageBlob.setName(fileName);
    
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(imageBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const imageUrl = file.getUrl();

    // 3. Prepare Final Data
    const finalData = {
        userId: userId,
        branch: branchCode,
        amount: amount,
        imageUrl: imageUrl 
    };

    // 4. Save Report and Get Summary
    const summary = saveOilReport(finalData); // จาก OilReportService.gs

    // 5. Send Confirmation Summary back to the Employee via Line (1:1 Push)
    const responseMessage = `
บันทึกข้อมูลสำเร็จครับ ✔
สาขา: ${summary.branch}
ยอดล่าสุด: ${formatNumber(summary.latest)} บาท
ยอดสะสมเดือนนี้: ${formatNumber(summary.accumulated)} บาท
ยอดคงเหลือ: ${formatNumber(summary.remaining)} บาท (จากเป้า ${formatNumber(summary.goal)} บาท)

ขอบคุณครับ 🙏
`.trim();
    
    pushSimpleMessage(userId, responseMessage); // Push Message (จาก LineAPI.js)

    Logger.log(`✅ Web Report submission COMPLETE for ${userId}. Branch: ${branchCode}`);
    
    // 6. Return summary for display on the form
    return summary;

  } catch (error) {
    Logger.log(`❌ Error processing web report: ${error.message}`);
    // ต้องโยน Error กลับไปให้ onFailure ใน HTML client-side
    throw new Error(error.message); 
  }
}
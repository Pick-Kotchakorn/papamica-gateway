// ========================================
// 🌐 OILREPORTWEB.GS - WEB APP HANDLER (V1.2 - Base64 Fix)
// ========================================

/**
 * Main Web App Entry Point
 */
function doGet(e) {
  Logger.log('🌐 Web App accessed via doGet');
  
  const branch = e.parameter.branch || '';
  const userId = e.parameter.userId || '';
  
  const cleanBranch = String(branch).trim();
  const cleanUserId = String(userId).trim();
  
  if (!cleanBranch || !cleanUserId) {
    return HtmlService.createHtmlOutput(
      '<h1>❌ Error: Missing Branch or User ID Parameter.</h1>' +
      '<p>Please start the report process from the LINE Bot again.</p>'
    );
  }
  
  const template = HtmlService.createTemplateFromFile('OilReportForm');
  template.branch = cleanBranch;
  template.userId = cleanUserId;

  const htmlOutput = template
    .evaluate()
    .setTitle('รายงานยอดขายน้ำมันเก่า');
  
  return htmlOutput;
}

/**
 * ✅ FIXED: Backend function to receive separate parameters
 * @param {string} userId - LINE User ID
 * @param {string} branchCode - Branch code (EMQ/KSQ/ONB)
 * @param {number} amount - Sales amount
 * @param {string} imageBase64 - Base64 encoded image (without prefix)
 * @param {string} imageMimeType - MIME type (image/jpeg or image/png)
 * @param {string} imageFileName - Original file name
 * @return {Object} Summary data
 */
function processWebReport(userId, branchCode, amount, imageBase64, imageMimeType, imageFileName) {
  try {
    Logger.log('🔄 Processing web report...');
    Logger.log('Parameters received:');
    Logger.log('  userId: ' + userId);
    Logger.log('  branch: ' + branchCode);
    Logger.log('  amount: ' + amount);
    Logger.log('  mimeType: ' + imageMimeType);
    Logger.log('  hasImage: ' + (imageBase64 ? 'YES' : 'NO'));
    
    // 1. Validation
    if (!userId || !branchCode || !amount || amount <= 0 || !imageBase64) {
      throw new Error('กรุณากรอกยอดขายที่ถูกต้องและแนบรูปบิล');
    }
    
    // 2. Convert Base64 to Blob
    const imageBytes = Utilities.base64Decode(imageBase64);
    const imageBlob = Utilities.newBlob(imageBytes, imageMimeType || 'image/jpeg');
    
    // 3. Save Image to Drive
    const FOLDER_ID = PROPERTIES.getProperty('OIL_REPORT_DRIVE_FOLDER_ID') || 'root';
    const fileName = `web_report_bill_${branchCode}_${new Date().getTime()}.jpg`;
    imageBlob.setName(fileName);
    
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(imageBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const imageUrl = file.getUrl();
    
    Logger.log('✅ Image saved to Drive: ' + imageUrl);

    // 4. Prepare Final Data
    const finalData = {
      userId: userId,
      branch: branchCode,
      amount: amount,
      imageUrl: imageUrl 
    };

    // 5. Save Report and Get Summary
    const summary = saveOilReport(finalData);

    // 6. Send Confirmation via LINE
    const responseMessage = `
บันทึกข้อมูลสำเร็จครับ ✔
สาขา: ${summary.branch}
ยอดล่าสุด: ${formatNumber(summary.latest)} บาท
ยอดสะสมเดือนนี้: ${formatNumber(summary.accumulated)} บาท
ยอดคงเหลือ: ${formatNumber(summary.remaining)} บาท (จากเป้า ${formatNumber(summary.goal)} บาท)

ขอบคุณครับ 🙏
    `.trim();
    
    pushSimpleMessage(userId, responseMessage);

    Logger.log(`✅ Web Report complete for ${userId}. Branch: ${branchCode}`);
    
    return summary;

  } catch (error) {
    Logger.log(`❌ Error processing web report: ${error.message}`);
    Logger.log('Stack trace: ' + error.stack);
    throw new Error(error.message); 
  }
}
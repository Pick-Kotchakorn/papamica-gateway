// ========================================
// ⚙️ REPORTSTATESERVICE.GS - STATE MANAGEMENT FOR OIL REPORT
// ========================================
// ไฟล์นี้ใช้ Cache Service จัดการสถานะ Multi-step Flow ของพนักงาน

const REPORT_CACHE = CacheService.getScriptCache();
const STATE_TTL_SECONDS = 300; // 5 นาทีในการกรอกข้อมูล

/**
 * Get current state for a user.
 * @param {string} userId - LINE User ID
 * @return {Object|null} State object or null
 */
function getReportState(userId) {
  const cachedData = REPORT_CACHE.get(userId);
  if (cachedData) {
    Logger.log(`✅ Loaded report state for ${userId}`);
    return JSON.parse(cachedData);
  }
  return null;
}

/**
 * Set new state for a user.
 * @param {string} userId - LINE User ID
 * @param {string} step - Current step (e.g., 'AWAITING_AMOUNT', 'AWAITING_IMAGE', 'COMPLETE')
 * @param {Object} data - Current data (e.g., {branch: 'KSQ', amount: 350})
 */
function setReportState(userId, step, data = {}) {
  const state = {
    step: step,
    data: data,
    timestamp: new Date().toISOString()
  };
  REPORT_CACHE.put(userId, JSON.stringify(state), STATE_TTL_SECONDS);
  Logger.log(`💾 Set report state for ${userId} to ${step}`);
}

/**
 * Clear user state after submission is complete.
 * @param {string} userId - LINE User ID
 */
function clearReportState(userId) {
  REPORT_CACHE.remove(userId);
  Logger.log(`🗑️ Cleared report state for ${userId}`);
}

// 📌 สถานะที่ใช้:
// - 'INIT': เริ่มต้น (รู้สาขาแล้ว)
// - 'AWAITING_AMOUNT': รอรับยอดเงิน (Text Message)
// - 'AWAITING_IMAGE': รอรับรูปบิล (Image Message)
// - 'COMPLETE': บันทึกสำเร็จ
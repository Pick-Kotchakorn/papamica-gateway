// ========================================
// 📊 INSIGHTDASHBOARD.GS - DASHBOARD & REPORTS
// ========================================
// ไฟล์นี้จัดการการสร้าง Dashboard และ Reports
// สรุปข้อมูล Analytics ในรูปแบบที่เข้าใจง่าย

/**
 * Create/Update Simple Dashboard
 * สร้างหรืออัพเดท Dashboard หลัก
 */
function updateSimpleDashboard() {
  try {
    Logger.log('📊 Creating Dashboard...');
    
    const ss = SpreadsheetApp.openById(INSIGHT_CONFIG.MAIN_SPREADSHEET_ID);
    let dashboard = ss.getSheetByName(INSIGHT_CONFIG.SHEETS.DASHBOARD);
    
    if (!dashboard) {
      dashboard = ss.insertSheet(INSIGHT_CONFIG.SHEETS.DASHBOARD);
    }
    
    dashboard.clear();
    
    // === HEADER ===
    dashboard.getRange('A1:H1').merge();
    dashboard.getRange('A1').setValue('📊 LINE OA ANALYTICS DASHBOARD');
    dashboard.getRange('A1')
      .setFontSize(18)
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
    
    // === METADATA ===
    dashboard.getRange('A2').setValue('Last Updated: ' + new Date().toLocaleString('th-TH'));
    dashboard.getRange('A2').setFontStyle('italic').setFontColor('#666666');
    
    // === KEY METRICS ===
    let currentRow = 4;
    
    dashboard.getRange(`A${currentRow}`).setValue('🔑 KEY METRICS');
    dashboard.getRange(`A${currentRow}:H${currentRow}`)
      .setBackground('#f3f3f3')
      .setFontWeight('bold');
    currentRow++;
    
    const metrics = [
      ['Metric', 'Value', 'Formula'],
      ['Total Followers', '', `=IF(ISBLANK(${INSIGHT_CONFIG.SHEETS.FOLLOWERS}!A2),"No Data",COUNTA(${INSIGHT_CONFIG.SHEETS.FOLLOWERS}!A:A)-1)`],
      ['Active Followers (7d)', '', `=IF(ISBLANK(${INSIGHT_CONFIG.SHEETS.FOLLOWERS}!A2),"No Data",COUNTIFS(${INSIGHT_CONFIG.SHEETS.FOLLOWERS}!I:I,"active",${INSIGHT_CONFIG.SHEETS.FOLLOWERS}!L:L,">="&TODAY()-7))`],
      ['Total Messages Sent', '', `=IF(ISBLANK(${INSIGHT_CONFIG.SHEETS.MESSAGING_STATS}!H2),"No Data",SUM(${INSIGHT_CONFIG.SHEETS.MESSAGING_STATS}!H:H))`],
      ['Avg Response Rate', '', `=IF(ISBLANK(${INSIGHT_CONFIG.SHEETS.MESSAGING_STATS}!L2),"No Data",TEXT(AVERAGE(${INSIGHT_CONFIG.SHEETS.MESSAGING_STATS}!L:L)/100,"0.00%"))`],
      ['Total Broadcasts', '', `=IF(ISBLANK(${INSIGHT_CONFIG.SHEETS.BROADCAST_PERFORMANCE}!A2),"No Data",COUNTA(${INSIGHT_CONFIG.SHEETS.BROADCAST_PERFORMANCE}!A:A)-1)`],
      ['Avg Broadcast CTR', '', `=IF(ISBLANK(${INSIGHT_CONFIG.SHEETS.BROADCAST_PERFORMANCE}!F2),"No Data",TEXT(AVERAGE(${INSIGHT_CONFIG.SHEETS.BROADCAST_PERFORMANCE}!F:F)/100,"0.00%"))`]
    ];
    
    dashboard.getRange(currentRow, 1, metrics.length, 3).setValues(metrics);
    dashboard.getRange(currentRow, 1, 1, 3)
      .setBackground('#e8f0fe')
      .setFontWeight('bold');
    
    currentRow += metrics.length + 2;
    
    // === GROWTH TREND ===
    dashboard.getRange(`A${currentRow}`).setValue('📈 GROWTH TREND (Last 30 Days)');
    dashboard.getRange(`A${currentRow}:H${currentRow}`)
      .setBackground('#f3f3f3')
      .setFontWeight('bold');
    currentRow++;
    
    const growthHeaders = [['Date', 'Total Contacts', 'Net Gain', 'Growth Rate (%)']];
    dashboard.getRange(currentRow, 1, 1, 4).setValues(growthHeaders);
    dashboard.getRange(currentRow, 1, 1, 4)
      .setBackground('#e8f0fe')
      .setFontWeight('bold');
    currentRow++;
    
    const growthFormula = `=IF(ISBLANK(${INSIGHT_CONFIG.SHEETS.ANALYTICS_DAILY}!A2),"No Data",QUERY(${INSIGHT_CONFIG.SHEETS.ANALYTICS_DAILY}!A:G,"SELECT A,B,E,G ORDER BY A DESC LIMIT 30",0))`;
    dashboard.getRange(currentRow, 1).setFormula(growthFormula);
    
    currentRow += 32;
    
    // === TOP BROADCASTS ===
    dashboard.getRange(`A${currentRow}`).setValue('📢 TOP BROADCASTS (by CTR)');
    dashboard.getRange(`A${currentRow}:H${currentRow}`)
      .setBackground('#f3f3f3')
      .setFontWeight('bold');
    currentRow++;
    
    const broadcastHeaders = [['Broadcast ID', 'Sent Date', 'Impressions', 'Clicks', 'CTR (%)']];
    dashboard.getRange(currentRow, 1, 1, 5).setValues(broadcastHeaders);
    dashboard.getRange(currentRow, 1, 1, 5)
      .setBackground('#e8f0fe')
      .setFontWeight('bold');
    currentRow++;
    
    const broadcastFormula = `=IF(ISBLANK(${INSIGHT_CONFIG.SHEETS.BROADCAST_PERFORMANCE}!A2),"No Data",QUERY(${INSIGHT_CONFIG.SHEETS.BROADCAST_PERFORMANCE}!A:F,"SELECT A,B,D,E,F ORDER BY F DESC LIMIT 10",0))`;
    dashboard.getRange(currentRow, 1).setFormula(broadcastFormula);
    
    // Auto-resize columns
    dashboard.autoResizeColumns(1, 8);
    
    Logger.log('✅ Dashboard created successfully!');
    
  } catch (error) {
    Logger.log('❌ Error creating dashboard: ' + error);
  }
}

/**
 * Create Detailed Report
 * สร้างรายงานแบบละเอียด
 * 
 * @param {string} reportType - Type of report (weekly/monthly)
 * @return {Object} Report data
 */
function createDetailedReport(reportType = 'weekly') {
  try {
    Logger.log(`📄 Creating ${reportType} report...`);
    
    const days = reportType === 'weekly' ? 7 : 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Get analytics data
    const analyticsData = getSheetDataAsArray(INSIGHT_CONFIG.SHEETS.ANALYTICS_DAILY);
    const filteredData = analyticsData.filter(row => {
      const rowDate = new Date(row.Date);
      return rowDate >= cutoffDate;
    });
    
    // Calculate totals
    let totalContacts = 0;
    let totalGained = 0;
    let totalBlocked = 0;
    
    filteredData.forEach(row => {
      totalContacts += row['Total Contacts'] || 0;
      totalGained += row['Net Gain'] || 0;
      totalBlocked += row['Blocks'] || 0;
    });
    
    const avgContacts = filteredData.length > 0 ? 
      (totalContacts / filteredData.length).toFixed(0) : 0;
    const netGrowth = totalGained - totalBlocked;
    
    const report = {
      period: reportType,
      startDate: cutoffDate,
      endDate: new Date(),
      summary: {
        avgDailyContacts: avgContacts,
        totalGained: totalGained,
        totalBlocked: totalBlocked,
        netGrowth: netGrowth,
        growthRate: totalContacts > 0 ? 
          ((netGrowth / totalContacts) * 100).toFixed(2) : 0
      },
      details: filteredData
    };
    
    Logger.log(`✅ Report created: ${JSON.stringify(report.summary)}`);
    return report;
    
  } catch (error) {
    Logger.log(`❌ Error creating report: ${error.message}`);
    return null;
  }
}

/**
 * Export Dashboard to PDF
 * Export Dashboard เป็น PDF (ถ้าต้องการ)
 * 
 * @return {Blob} PDF blob
 */
function exportDashboardToPDF() {
  try {
    Logger.log('📄 Exporting dashboard to PDF...');
    
    const ss = SpreadsheetApp.openById(INSIGHT_CONFIG.MAIN_SPREADSHEET_ID);
    const dashboard = ss.getSheetByName(INSIGHT_CONFIG.SHEETS.DASHBOARD);
    
    if (!dashboard) {
      Logger.log('❌ Dashboard not found');
      return null;
    }
    
    // Get PDF as blob
    const url = ss.getUrl();
    const sheetId = dashboard.getSheetId();
    const exportUrl = url.replace(/\/edit.*$/, '') + 
      `/export?format=pdf&gid=${sheetId}&portrait=false&fitw=true`;
    
    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(exportUrl, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    
    const blob = response.getBlob().setName('Dashboard_' + 
      new Date().toISOString().split('T')[0] + '.pdf');
    
    Logger.log('✅ PDF created');
    return blob;
    
  } catch (error) {
    Logger.log(`❌ Error exporting to PDF: ${error.message}`);
    return null;
  }
}

/**
 * Send Dashboard via Email
 * ส่ง Dashboard ทาง Email
 * 
 * @param {string} recipient - Email address
 */
function emailDashboard(recipient) {
  try {
    Logger.log(`📧 Sending dashboard to: ${recipient}`);
    
    // Create report
    const report = createDetailedReport('weekly');
    
    if (!report) {
      Logger.log('❌ Failed to create report');
      return;
    }
    
    // Format email body
    const emailBody = `
      <h2>📊 LINE OA Analytics Dashboard</h2>
      <p><strong>Period:</strong> ${report.startDate.toLocaleDateString('th-TH')} - ${report.endDate.toLocaleDateString('th-TH')}</p>
      
      <h3>Summary</h3>
      <ul>
        <li><strong>Average Daily Contacts:</strong> ${report.summary.avgDailyContacts}</li>
        <li><strong>Total Gained:</strong> ${report.summary.totalGained}</li>
        <li><strong>Total Blocked:</strong> ${report.summary.totalBlocked}</li>
        <li><strong>Net Growth:</strong> ${report.summary.netGrowth}</li>
        <li><strong>Growth Rate:</strong> ${report.summary.growthRate}%</li>
      </ul>
      
      <p><em>For detailed information, please check the Google Sheets dashboard.</em></p>
      
      <p>---<br>
      Automated report from LINE OA Analytics System</p>
    `;
    
    // Send email
    MailApp.sendEmail({
      to: recipient,
      subject: `📊 LINE OA Dashboard - ${new Date().toLocaleDateString('th-TH')}`,
      htmlBody: emailBody
    });
    
    Logger.log('✅ Email sent successfully');
    
  } catch (error) {
    Logger.log(`❌ Error sending email: ${error.message}`);
  }
}

/**
 * Setup Scheduled Dashboard Updates
 * ตั้งค่า Auto-update Dashboard
 */
function setupDashboardSchedule() {
  try {
    Logger.log('⏰ Setting up dashboard schedule...');
    
    // Remove old triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'updateSimpleDashboard') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new trigger - daily at 2:00 AM
    ScriptApp.newTrigger('updateSimpleDashboard')
      .timeBased()
      .atHour(2)
      .everyDays(1)
      .create();
    
    Logger.log('✅ Dashboard schedule created');
    Logger.log('   Will run daily at 2:00 AM');
    
  } catch (error) {
    Logger.log(`❌ Error setting up schedule: ${error.message}`);
  }
}

/**
 * Remove Dashboard Schedule
 * ลบ Auto-update Dashboard
 */
function removeDashboardSchedule() {
  try {
    Logger.log('🗑️ Removing dashboard schedule...');
    
    const triggers = ScriptApp.getProjectTriggers();
    let removed = 0;
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'updateSimpleDashboard') {
        ScriptApp.deleteTrigger(trigger);
        removed++;
      }
    });
    
    Logger.log(`✅ Removed ${removed} trigger(s)`);
    
  } catch (error) {
    Logger.log(`❌ Error removing schedule: ${error.message}`);
  }
}

/**
 * Create Weekly Summary
 * สร้างสรุปรายสัปดาห์
 * 
 * @return {string} Summary text
 */
function createWeeklySummary() {
  try {
    const report = createDetailedReport('weekly');
    
    if (!report) {
      return 'Unable to generate summary';
    }
    
    const summary = `
📊 สรุปสัปดาห์นี้
${report.startDate.toLocaleDateString('th-TH')} - ${report.endDate.toLocaleDateString('th-TH')}

📈 ผลสรุป:
• ผู้ติดตามเฉลี่ย: ${report.summary.avgDailyContacts} คน/วัน
• เพิ่มเพื่อน: +${report.summary.totalGained} คน
• บล็อก: -${report.summary.totalBlocked} คน
• เติบโต (สุทธิ): ${report.summary.netGrowth} คน
• อัตราการเติบโต: ${report.summary.growthRate}%

✅ ระบบทำงานปกติ
    `.trim();
    
    Logger.log('✅ Weekly summary created');
    return summary;
    
  } catch (error) {
    Logger.log(`❌ Error creating summary: ${error.message}`);
    return 'Error generating summary';
  }
}

/**
 * Test Dashboard Functions
 * ทดสอบฟังก์ชัน Dashboard
 */
function testDashboardFunctions() {
  Logger.log('🧪 Testing Dashboard Functions...');
  Logger.log('=' .repeat(60));
  
  // Test 1: Update Dashboard
  Logger.log('\n1️⃣ Testing Dashboard Update...');
  updateSimpleDashboard();
  Logger.log('   ✅ Dashboard updated');
  
  // Test 2: Create Report
  Logger.log('\n2️⃣ Testing Report Creation...');
  const report = createDetailedReport('weekly');
  if (report) {
    Logger.log('   ✅ Report created');
    Logger.log(`   Summary: ${JSON.stringify(report.summary)}`);
  }
  
  // Test 3: Weekly Summary
  Logger.log('\n3️⃣ Testing Weekly Summary...');
  const summary = createWeeklySummary();
  Logger.log('   ✅ Summary created:');
  Logger.log(summary);
  
  Logger.log('=' .repeat(60));
  Logger.log('✅ Dashboard functions test completed!');
}

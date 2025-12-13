// ========================================
// 👥 FOLLOWERSERVICE.GS - FOLLOWER MANAGEMENT (V2.1 - Cache Optimized)
// ========================================
// ไฟล์นี้จัดการข้อมูลผู้ติดตาม (Followers)
// ครอบคลุมการเพิ่ม, อัพเดท, และดึงข้อมูลผู้ติดตาม
// เพิ่มการใช้ CacheService เพื่อเพิ่มประสิทธิภาพในการอ่านข้อมูล

// Global Cache Object
const CACHE = CacheService.getScriptCache();

/**
 * Save Follower Data (พร้อม Invalidation)
 * บันทึกหรืออัพเดทข้อมูลผู้ติดตาม
 * * @param {Object} data - Follower data
 */
function saveFollower(data) {
  try {
    const sheet = getOrCreateSheet(
      SHEET_CONFIG.SHEETS.FOLLOWERS,
      SHEET_CONFIG.COLUMNS.FOLLOWERS
    );
    
    // Check if user already exists
    const existingRow = findRowByValue(sheet, 1, data.userId);
    
    const rowData = [
      data.userId,
      data.displayName,
      data.pictureUrl,
      data.language,
      data.statusMessage,
      data.firstFollowDate,
      data.lastFollowDate,
      data.followCount,
      data.status,
      data.sourceChannel,
      data.tags,
      data.lastInteraction,
      data.totalMessages
    ];
    
    if (existingRow > 0) {
      // Update existing record
      updateRow(sheet, existingRow, rowData);
      Logger.log(`✅ Updated follower at row ${existingRow}`);
    } else {
      // Add new record
      sheet.appendRow(rowData);
      Logger.log('✅ Added new follower');
    }
    
    // 💡 Invalidation: ลบ Cache ของผู้ใช้รายนี้และสถิติเมื่อมีการเปลี่ยนแปลง
    CACHE.remove(`follower_${data.userId}`);
    CACHE.remove('follower_stats');
    
  } catch (error) {
    Logger.log(`❌ Error saving follower: ${error.message}`);
  }
}

/**
 * Get Follower Data (Cache Optimized)
 * ดึงข้อมูลผู้ติดตาม
 * * @param {string} userId - User ID
 * @return {Object|null} Follower data or null
 */
function getFollowerData(userId) {
  const cacheKey = `follower_${userId}`;
  
  try {
    // 1. ตรวจสอบ Cache ก่อน
    const cachedData = CACHE.get(cacheKey);
    if (cachedData) {
      Logger.log(`✅ Loaded follower from Cache: ${userId}`);
      return JSON.parse(cachedData);
    }

    // 2. ถ้าไม่มีใน Cache ให้ดึงจาก Sheet
    const sheet = getOrCreateSheet(SHEET_CONFIG.SHEETS.FOLLOWERS);
    const rowNum = findRowByValue(sheet, 1, userId);
    
    if (rowNum === 0) {
      return null;
    }
    
    const data = sheet.getRange(rowNum, 1, 1, 13).getValues()[0];
    
    const follower = {
      userId: data[0],
      displayName: data[1],
      pictureUrl: data[2],
      language: data[3],
      statusMessage: data[4],
      firstFollowDate: data[5],
      lastFollowDate: data[6],
      followCount: data[7],
      status: data[8],
      sourceChannel: data[9],
      tags: data[10],
      lastInteraction: data[11],
      totalMessages: data[12]
    };
    
    // 3. บันทึกผลลัพธ์ลง Cache
    const ttl = SYSTEM_CONFIG.CACHE_SETTINGS.FOLLOWER_TTL_SECONDS;
    CACHE.put(cacheKey, JSON.stringify(follower), ttl);
    
    Logger.log(`✅ Retrieved and Cached follower: ${follower.displayName}`);
    return follower;
    
  } catch (error) {
    Logger.log(`❌ Error getting follower data: ${error.message}`);
    return null;
  }
}

/**
 * Update Follower Status (พร้อม Invalidation)
 * อัพเดทสถานะของผู้ติดตาม
 * * @param {string} userId - User ID
 * @param {string} status - New status (active/blocked)
 * @param {Date} timestamp - Timestamp
 */
function updateFollowerStatus(userId, status, timestamp) {
  try {
    const sheet = getOrCreateSheet(SHEET_CONFIG.SHEETS.FOLLOWERS);
    const rowNum = findRowByValue(sheet, 1, userId);
    
    if (rowNum === 0) {
      Logger.log(`⚠️ User not found: ${userId}`);
      return;
    }
    
    // Update status (column 9) and last interaction (column 12)
    sheet.getRange(rowNum, 9).setValue(status);
    sheet.getRange(rowNum, 12).setValue(timestamp);
    
    Logger.log(`✅ Updated user ${userId} status to: ${status}`);
    
    // 💡 Invalidation
    CACHE.remove(`follower_${userId}`);
    CACHE.remove('follower_stats');
    
  } catch (error) {
    Logger.log(`❌ Error updating follower status: ${error.message}`);
  }
}

/**
 * Update Follower Interaction (พร้อม Invalidation)
 * อัพเดทข้อมูลการโต้ตอบของผู้ติดตาม
 * * @param {string} userId - User ID
 */
function updateFollowerInteraction(userId) {
  try {
    const sheet = getOrCreateSheet(SHEET_CONFIG.SHEETS.FOLLOWERS);
    const rowNum = findRowByValue(sheet, 1, userId);
    
    if (rowNum === 0) {
      Logger.log(`⚠️ User not found: ${userId}`);
      return;
    }
    
    // Get current message count
    const currentMessages = sheet.getRange(rowNum, 13).getValue() || 0;
    
    // Update last interaction (column 12) and total messages (column 13)
    sheet.getRange(rowNum, 12).setValue(new Date());
    sheet.getRange(rowNum, 13).setValue(currentMessages + 1);
    
    Logger.log(`✅ Updated interaction for user: ${userId}`);
    
    // 💡 Invalidation
    CACHE.remove(`follower_${userId}`);
    CACHE.remove('follower_stats');
    
  } catch (error) {
    Logger.log(`❌ Error updating follower interaction: ${error.message}`);
  }
}

/**
 * Get Active Followers
 * ดึงรายชื่อผู้ติดตามที่ active
 * * @param {number} days - Number of days to consider (default: 7)
 * @return {Array<Object>} Array of active followers
 */
function getActiveFollowers(days = 7) {
  try {
    const data = getSheetDataAsArray(SHEET_CONFIG.SHEETS.FOLLOWERS);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const activeFollowers = data.filter(follower => {
      if (follower.status !== 'active') {
        return false;
      }
      
      const lastInteraction = new Date(follower['Last Interaction']);
      return lastInteraction >= cutoffDate;
    });
    
    Logger.log(`✅ Found ${activeFollowers.length} active followers (${days}d)`);
    return activeFollowers;
    
  } catch (error) {
    Logger.log(`❌ Error getting active followers: ${error.message}`);
    return [];
  }
}

/**
 * Get Follower Statistics (Cache Optimized)
 * ดึงสถิติผู้ติดตาม
 * * @return {Object} Follower statistics
 */
function getFollowerStatistics() {
  const cacheKey = 'follower_stats';
  
  try {
    // 1. ตรวจสอบ Cache ก่อน
    const cachedStats = CACHE.get(cacheKey);
    if (cachedStats) {
      Logger.log('✅ Loaded follower statistics from Cache');
      return JSON.parse(cachedStats);
    }
    
    // 2. ถ้าไม่มีใน Cache ให้ดึงจาก Sheet
    const data = getSheetDataAsArray(SHEET_CONFIG.SHEETS.FOLLOWERS);
    
    const stats = {
      total: data.length,
      active: 0,
      blocked: 0,
      newThisWeek: 0,
      activeLastWeek: 0,
      totalMessages: 0
    };
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    data.forEach(follower => {
      // Count by status
      if (follower.Status === 'active') {
        stats.active++;
      } else if (follower.Status === 'blocked') {
        stats.blocked++;
      }
      
      // Count new followers
      const followDate = new Date(follower['First Follow Date']);
      if (followDate >= oneWeekAgo) {
        stats.newThisWeek++;
      }
      
      // Count active last week
      const lastInteraction = new Date(follower['Last Interaction']);
      if (lastInteraction >= oneWeekAgo) {
        stats.activeLastWeek++;
      }
      
      // Sum total messages
      stats.totalMessages += follower['Total Messages'] || 0;
    });
    
    // 3. บันทึกผลลัพธ์ลง Cache
    const ttl = SYSTEM_CONFIG.CACHE_SETTINGS.STATS_TTL_SECONDS;
    CACHE.put(cacheKey, JSON.stringify(stats), ttl);
    
    Logger.log('✅ Calculated and Cached follower statistics');
    return stats;
    
  } catch (error) {
    Logger.log(`❌ Error getting follower statistics: ${error.message}`);
    return null;
  }
}

/**
 * Get Followers by Tag
 * ดึงรายชื่อผู้ติดตามตาม Tag
 * * @param {string} tag - Tag to filter
 * @return {Array<Object>} Array of followers with tag
 */
function getFollowersByTag(tag) {
  try {
    const data = getSheetDataAsArray(SHEET_CONFIG.SHEETS.FOLLOWERS);
    
    const filtered = data.filter(follower => {
      const tags = follower.Tags || '';
      return tags.includes(tag);
    });
    
    Logger.log(`✅ Found ${filtered.length} followers with tag: ${tag}`);
    return filtered;
    
  } catch (error) {
    Logger.log(`❌ Error getting followers by tag: ${error.message}`);
    return [];
  }
}

/**
 * Add Tag to Follower (พร้อม Invalidation)
 * เพิ่ม Tag ให้กับผู้ติดตาม
 * * @param {string} userId - User ID
 * @param {string} tag - Tag to add
 */
function addTagToFollower(userId, tag) {
  try {
    const sheet = getOrCreateSheet(SHEET_CONFIG.SHEETS.FOLLOWERS);
    const rowNum = findRowByValue(sheet, 1, userId);
    
    if (rowNum === 0) {
      Logger.log(`⚠️ User not found: ${userId}`);
      return;
    }
    
    // Get current tags
    const currentTags = sheet.getRange(rowNum, 11).getValue() || '';
    
    // Check if tag already exists
    if (currentTags.includes(tag)) {
      Logger.log(`ℹ️ Tag already exists: ${tag}`);
      return;
    }
    
    // Add new tag
    const newTags = currentTags ? `${currentTags}, ${tag}` : tag;
    sheet.getRange(rowNum, 11).setValue(newTags);
    
    Logger.log(`✅ Added tag "${tag}" to user: ${userId}`);
    
    // 💡 Invalidation
    CACHE.remove(`follower_${userId}`);
    
  } catch (error) {
    Logger.log(`❌ Error adding tag: ${error.message}`);
  }
}

/**
 * Remove Tag from Follower (พร้อม Invalidation)
 * ลบ Tag ออกจากผู้ติดตาม
 * * @param {string} userId - User ID
 * @param {string} tag - Tag to remove
 */
function removeTagFromFollower(userId, tag) {
  try {
    const sheet = getOrCreateSheet(SHEET_CONFIG.SHEETS.FOLLOWERS);
    const rowNum = findRowByValue(sheet, 1, userId);
    
    if (rowNum === 0) {
      Logger.log(`⚠️ User not found: ${userId}`);
      return;
    }
    
    // Get current tags
    const currentTags = sheet.getRange(rowNum, 11).getValue() || '';
    
    // Remove tag
    const tagsArray = currentTags.split(',').map(t => t.trim());
    const newTagsArray = tagsArray.filter(t => t !== tag);
    const newTags = newTagsArray.join(', ');
    
    sheet.getRange(rowNum, 11).setValue(newTags);
    
    Logger.log(`✅ Removed tag "${tag}" from user: ${userId}`);
    
    // 💡 Invalidation
    CACHE.remove(`follower_${userId}`);
    
  } catch (error) {
    Logger.log(`❌ Error removing tag: ${error.message}`);
  }
}

/**
 * Get Top Active Users
 * ดึงรายชื่อผู้ใช้ที่ active ที่สุด
 * * @param {number} limit - Number of users to return (default: 10)
 * @return {Array<Object>} Array of top users
 */
function getTopActiveUsers(limit = 10) {
  try {
    const data = getSheetDataAsArray(SHEET_CONFIG.SHEETS.FOLLOWERS);
    
    // Sort by total messages (descending)
    const sorted = data.sort((a, b) => {
      const messagesA = a['Total Messages'] || 0;
      const messagesB = b['Total Messages'] || 0;
      return messagesB - messagesA;
    });
    
    const topUsers = sorted.slice(0, limit);
    
    Logger.log(`✅ Retrieved top ${topUsers.length} active users`);
    return topUsers;
    
  } catch (error) {
    Logger.log(`❌ Error getting top active users: ${error.message}`);
    return [];
  }
}

/**
 * Export Followers to CSV
 * Export ข้อมูลผู้ติดตามเป็น CSV
 * * @param {string} status - Filter by status (optional)
 * @return {string} CSV content
 */
function exportFollowersToCSV(status = null) {
  try {
    let data = getSheetDataAsArray(SHEET_CONFIG.SHEETS.FOLLOWERS);
    
    // Filter by status if provided
    if (status) {
      data = data.filter(f => f.Status === status);
    }
    
    // Add headers
    const headers = SHEET_CONFIG.COLUMNS.FOLLOWERS;
    const csvRows = [headers.join(',')];
    
    // Add data rows
    data.forEach(follower => {
      const row = headers.map(header => {
        const value = follower[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });
    
    const csv = csvRows.join('\n');
    
    Logger.log(`✅ Exported ${data.length} followers to CSV`);
    return csv;
    
  } catch (error) {
    Logger.log(`❌ Error exporting followers: ${error.message}`);
    return '';
  }
}

/**
 * Test Follower Service (เพิ่มการทดสอบ Cache Hit)
 * ทดสอบฟังก์ชันต่างๆ ของ Follower Service
 */
function testFollowerService() {
  Logger.log('🧪 Testing Follower Service...');
  Logger.log('=' .repeat(60));
  
  try {
    // Test User ID
    const testUserId = 'TEST_USER_' + Date.now();
    
    // Test 1: Save Follower
    Logger.log('\n1️⃣ Testing Save Follower...');
    saveFollower({
      userId: testUserId,
      displayName: 'Test User',
      pictureUrl: 'https://example.com/pic.jpg',
      language: 'th',
      statusMessage: 'Hello!',
      firstFollowDate: new Date(),
      lastFollowDate: new Date(),
      followCount: 1,
      status: 'active',
      sourceChannel: 'qr-code',
      tags: 'test-user',
      lastInteraction: new Date(),
      totalMessages: 0
    });
    Logger.log('   ✅ Follower saved (Cache invalidated)');
    
    // Test 2: Get Follower (Should hit sheet and cache)
    Logger.log('\n2️⃣ Testing Get Follower (First Call - Sheet Read)...');
    let follower = getFollowerData(testUserId);
    Logger.log(`   ✅ Retrieved: ${follower?.displayName}`);
    
    // Test 3: Get Follower (Should hit cache)
    Logger.log('\n3️⃣ Testing Get Follower (Second Call - Cache Hit)...');
    follower = getFollowerData(testUserId);
    Logger.log(`   ✅ Retrieved: ${follower?.displayName}`);
    
    // Test 4: Update Interaction (Invalidates cache)
    Logger.log('\n4️⃣ Testing Update Interaction (Invalidates Cache)...');
    updateFollowerInteraction(testUserId);
    Logger.log('   ✅ Interaction updated');
    
    // Test 5: Add Tag (Invalidates cache)
    Logger.log('\n5️⃣ Testing Add Tag (Invalidates Cache)...');
    addTagToFollower(testUserId, 'vip');
    Logger.log('   ✅ Tag added');
    
    // Test 6: Get Statistics (Should hit sheet and cache)
    Logger.log('\n6️⃣ Testing Get Statistics (First Call - Sheet Read)...');
    let stats = getFollowerStatistics();
    Logger.log(`   ✅ Stats: ${JSON.stringify(stats)}`);
    
    // Test 7: Get Statistics (Should hit cache)
    Logger.log('\n7️⃣ Testing Get Statistics (Second Call - Cache Hit)...');
    stats = getFollowerStatistics();
    Logger.log(`   ✅ Stats: ${JSON.stringify(stats)}`);
    
    // Test 8: Get Active Followers
    Logger.log('\n8️⃣ Testing Get Active Followers...');
    const activeFollowers = getActiveFollowers(7);
    Logger.log(`   ✅ Found ${activeFollowers.length} active followers`);
    
    Logger.log('=' .repeat(60));
    Logger.log('✅ Follower Service test completed!');
    
  } catch (error) {
    Logger.log(`❌ Test failed: ${error.message}`);
  }
}
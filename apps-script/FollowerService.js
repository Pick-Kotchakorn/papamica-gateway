// ========================================
// 👥 FOLLOWERSERVICE.GS - FOLLOWER MANAGEMENT (V2.2 - Full Map Cache Optimized)
// ========================================
// ไฟล์นี้จัดการข้อมูลผู้ติดตาม (Followers)
// เพิ่มการใช้ Cache Map สำหรับการค้นหาที่เร็วขึ้น และ Invalidation ที่ครอบคลุม

// Global Cache Object
const CACHE = CacheService.getScriptCache();

// New Cache Keys for better performance
const FOLLOWER_STATS_KEY = 'follower_stats';
const FOLLOWER_MAP_KEY = 'all_followers_map';

/**
 * [HELPER] Get Follower Data Map (Cache Optimized Lookup)
 * ดึงข้อมูลผู้ติดตามทั้งหมดจาก Sheet และสร้าง Map โดยใช้ UserId เป็น Key
 * ถ้าไม่มีใน Cache จะทำการดึงจาก Sheet และ Cache ใหม่ทั้งหมด (Heavy I/O)
 * @return {Object<string, Object>|null} Map of follower data keyed by userId
 */
function _getFollowerMap() {
  const cacheKey = FOLLOWER_MAP_KEY;
  
  try {
    // 1. ตรวจสอบ Cache Map ก่อน
    const cachedMap = CACHE.get(cacheKey);
    if (cachedMap) {
      Logger.log('✅ Loaded follower map from Cache.');
      return JSON.parse(cachedMap);
    }

    // 2. ถ้าไม่มีใน Cache ให้ดึงจาก Sheet ทั้งหมด (Single Heavy I/O)
    Logger.log('⏳ Cache Miss for Follower Map. Reading entire sheet...');
    const dataArray = getSheetDataAsArray(SHEET_CONFIG.SHEETS.FOLLOWERS); 
    
    if (dataArray.length === 0) {
      return {};
    }
    
    // 3. สร้าง Map { userId: {data} }
    const followerMap = dataArray.reduce((map, follower) => {
      // ใช้คอลัมน์แรก (User ID) เป็น Key
      const userId = follower[SHEET_CONFIG.COLUMNS.FOLLOWERS[0]] || '';
      if (userId) {
        map[userId] = follower;
      }
      return map;
    }, {});
    
    // 4. บันทึกผลลัพธ์ลง Cache (TTL 1 ชั่วโมง)
    const ttl = SYSTEM_CONFIG.CACHE_SETTINGS.FOLLOWER_TTL_SECONDS;
    CACHE.put(cacheKey, JSON.stringify(followerMap), ttl);
    
    Logger.log(`✅ Retrieved, Mapped, and Cached ${dataArray.length} followers.`);
    return followerMap;
    
  } catch (error) {
    Logger.log(`❌ Error getting follower map: ${error.message}`);
    return null;
  }
}

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
    
    // ใช้ findRowByValue สำหรับการเขียน (Update) เนื่องจากยังไม่มีทางอื่นที่เร็วเท่านี้ใน GAS
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
    
    // 💡 Invalidation: ลบ Cache ของผู้ใช้รายนี้, สถิติ, และ Map ทั้งหมดเมื่อมีการเปลี่ยนแปลง
    CACHE.remove(`follower_${data.userId}`);
    CACHE.remove(FOLLOWER_STATS_KEY);
    CACHE.remove(FOLLOWER_MAP_KEY); // <--- Invalidate Map
    
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
    // 1. ตรวจสอบ Cache เฉพาะผู้ใช้ก่อน
    const cachedData = CACHE.get(cacheKey);
    if (cachedData) {
      Logger.log(`✅ Loaded follower from Cache (Individual): ${userId}`);
      return JSON.parse(cachedData);
    }
    
    // 2. ถ้า Cache Miss ให้ตรวจสอบจาก Follower Map Cache
    const followerMap = _getFollowerMap();
    if (followerMap && followerMap[userId]) {
      const follower = followerMap[userId];
      
      // 3. บันทึกผลลัพธ์ลง Cache เฉพาะผู้ใช้นี้
      const ttl = SYSTEM_CONFIG.CACHE_SETTINGS.FOLLOWER_TTL_SECONDS;
      CACHE.put(cacheKey, JSON.stringify(follower), ttl);
      
      Logger.log(`✅ Retrieved from Map Cache and Cached individual: ${follower.displayName}`);
      return follower;
    }

    // 4. ถ้าไม่มีใน Map Cache (หรือ Map Cache Missed และ User ไม่พบใน Sheet)
    return null;
    
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
    
    // 💡 Invalidation: ลบ Cache ของผู้ใช้, สถิติ, และ Map
    CACHE.remove(`follower_${userId}`);
    CACHE.remove(FOLLOWER_STATS_KEY);
    CACHE.remove(FOLLOWER_MAP_KEY); // <--- Invalidate Map
    
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
    
    // 💡 Invalidation: ลบ Cache ของผู้ใช้, สถิติ, และ Map
    CACHE.remove(`follower_${userId}`);
    CACHE.remove(FOLLOWER_STATS_KEY);
    CACHE.remove(FOLLOWER_MAP_KEY); // <--- Invalidate Map
    
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
    // ใช้ _getFollowerMap() แทน getSheetDataAsArray โดยตรง
    const followerMap = _getFollowerMap();
    if (!followerMap) return [];
    
    const data = Object.values(followerMap); // ดึง Array จาก Map
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const activeFollowers = data.filter(follower => {
      // ใช้ Header Name ที่ถูกแปลงเป็น Key ใน Map
      if (follower.Status !== 'active') {
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
  const cacheKey = FOLLOWER_STATS_KEY;
  
  try {
    // 1. ตรวจสอบ Cache ก่อน
    const cachedStats = CACHE.get(cacheKey);
    if (cachedStats) {
      Logger.log('✅ Loaded follower statistics from Cache');
      return JSON.parse(cachedStats);
    }
    
    // 2. ถ้าไม่มีใน Cache ให้ดึงจาก Follower Map Cache
    const followerMap = _getFollowerMap();
    if (!followerMap) return null;
    
    const data = Object.values(followerMap); // ดึง Array จาก Map
    
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
    // ใช้ _getFollowerMap() แทน getSheetDataAsArray โดยตรง
    const followerMap = _getFollowerMap();
    if (!followerMap) return [];
    
    const data = Object.values(followerMap); // ดึง Array จาก Map
    
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
    CACHE.remove(FOLLOWER_MAP_KEY); // <--- Invalidate Map
    
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
    CACHE.remove(FOLLOWER_MAP_KEY); // <--- Invalidate Map
    
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
    // ใช้ _getFollowerMap() แทน getSheetDataAsArray โดยตรง
    const followerMap = _getFollowerMap();
    if (!followerMap) return [];
    
    const data = Object.values(followerMap); // ดึง Array จาก Map
    
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
    // ใช้ _getFollowerMap() แทน getSheetDataAsArray โดยตรง
    const followerMap = _getFollowerMap();
    if (!followerMap) return '';
    
    let data = Object.values(followerMap); // ดึง Array จาก Map
    
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
  Logger.log('🧪 Testing Follower Service (Optimized)...');
  Logger.log('=' .repeat(60));
  
  try {
    // Clear Map Cache for clean test
    CACHE.remove(FOLLOWER_MAP_KEY);
    Logger.log('🗑️ Force cleared Follower Map Cache for test run.');
    
    // Test User ID
    const testUserId = 'TEST_USER_' + Date.now();
    
    // Test 1: Save Follower
    Logger.log('\n1️⃣ Testing Save Follower (Invalidates Map Cache)...');
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
    
    // Test 2: Get Follower (Should call _getFollowerMap() -> Sheet Read/Map Cache Build)
    Logger.log('\n2️⃣ Testing Get Follower (First Call - Map Cache Build)...');
    let follower = getFollowerData(testUserId);
    Logger.log(`   ✅ Retrieved: ${follower?.displayName}`);
    
    // Test 3: Get Follower (Should hit individual cache)
    Logger.log('\n3️⃣ Testing Get Follower (Second Call - Individual Cache Hit)...');
    follower = getFollowerData(testUserId);
    Logger.log(`   ✅ Retrieved: ${follower?.displayName}`);
    
    // Test 4: Get Follower (New User, Should hit Map Cache)
    Logger.log('\n4️⃣ Testing Get Follower (Check Map Cache Hit for non-test user)...');
    // Note: การทดสอบนี้จะสมมติว่ามีผู้ใช้รายอื่นใน Sheet แล้ว
    
    // Test 5: Update Interaction (Invalidates map and individual cache)
    Logger.log('\n5️⃣ Testing Update Interaction (Invalidates All Caches)...');
    updateFollowerInteraction(testUserId);
    Logger.log('   ✅ Interaction updated');
    
    // Test 6: Get Statistics (Should call _getFollowerMap() -> Map Cache Build again)
    Logger.log('\n6️⃣ Testing Get Statistics (First Call - Stats Cache Build)...');
    let stats = getFollowerStatistics();
    Logger.log(`   ✅ Stats: Total=${stats?.total}`);
    
    // Test 7: Get Statistics (Should hit Stats Cache)
    Logger.log('\n7️⃣ Testing Get Statistics (Second Call - Stats Cache Hit)...');
    stats = getFollowerStatistics();
    Logger.log(`   ✅ Stats: Total=${stats?.total}`);
    
    Logger.log('=' .repeat(60));
    Logger.log('✅ Follower Service test completed (Highly Optimized)!');
    
  } catch (error) {
    Logger.log(`❌ Test failed: ${error.message}`);
  }
}
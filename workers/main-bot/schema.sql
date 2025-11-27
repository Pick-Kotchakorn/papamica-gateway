-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🏪 PAPAMICA RESTAURANT DATABASE SCHEMA
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 🏢 ตาราง Branches (สาขา)
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  phone TEXT,
  map_url TEXT,
  open_hours TEXT DEFAULT '10:00-22:00',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 📋 ตาราง Menu Items (รายการอาหาร)
CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL, -- ข้าว, ก๋วยเตี๋ยว, สลัด, เครื่องดื่ม
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  image_url TEXT,
  available BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 📅 ตาราง Bookings (การจองโต๊ะ)
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  branch_id INTEGER,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  guests INTEGER DEFAULT 2,
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- 👥 ตาราง Members (สมาชิก)
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_user_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  phone TEXT,
  email TEXT,
  points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze', -- bronze, silver, gold, platinum
  birthday DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 💬 ตาราง Conversations (บันทึกการสนทนา)
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  context TEXT, -- JSON: {current_page, selected_branch, etc.}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 📊 Indexes สำหรับ Performance
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_members_line_id ON members(line_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 🎉 Insert ข้อมูลทดสอบ
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- สาขา (3 สาขา)
INSERT INTO branches (name, location, phone, map_url, open_hours) VALUES
('EmQuartier', 'EmQuartier, ชั้น 6, ถนนสุขุมวิท, กรุงเทพฯ', '02-123-4567', 'https://maps.google.com/?q=EmQuartier+Bangkok', '10:00-22:00'),
('One Bangkok', 'One Bangkok, ถนนวิทยุ, ปทุมวัน, กรุงเทพฯ', '02-234-5678', 'https://maps.google.com/?q=One+Bangkok', '10:00-22:00'),
('KingSquare', 'King Power Mahanakhon, ถนนสีลม, กรุงเทพฯ', '02-345-6789', 'https://maps.google.com/?q=King+Power+Mahanakhon', '10:00-22:00');

-- เมนูอาหาร
-- หมวด: ข้าว
INSERT INTO menu_items (category, name, price, description, available) VALUES
('ข้าว', 'ข้าวหน้าปลาไหลญี่ปุ่นย่าง', 299.00, 'ปลาไหลนำเข้าจากญี่ปุ่น ย่างสไตล์ญี่ปุ่นแท้ เสร็ฟพร้อมซอสเทริยากิพิเศษ', 1),
('ข้าว', 'ข้าวหน้าแซลมอนซาชิมิ', 249.00, 'แซลมอนนอร์เวย์สดใหม่ หั่นชิ้นหนา เสร็ฟบนข้าวญี่ปุ่น', 1),
('ข้าว', 'ข้าวผัดกิมจิ', 149.00, 'ผัดสไตล์เกาหลี เผ็ดร้อน กลมกล่อม ใส่ไข่ดาว', 1),
('ข้าว', 'ข้าวหน้าไก่เทริยากิ', 179.00, 'ไก่ย่างซอสเทริยากิหวานมัน เสร็ฟพร้อมผักสด', 1),

-- หมวด: ก๋วยเตี๋ยว
('ก๋วยเตี๋ยว', 'ราเมนต้นตำรับ', 179.00, 'น้ำซุปกระดูกหมูต้มนาน 12 ชั่วโมง หอมกลิ่นโชยุ', 1),
('ก๋วยเตี๋ยว', 'อุด้งกุ้งเทมปุระ', 199.00, 'เส้นอุด้งนุ่ม น้ำซุปร้อนๆ กุ้งเทมปุระกรอบนอก', 1),
('ก๋วยเตี๋ยว', 'โซบะเย็น', 159.00, 'เส้นโซบะเย็น จิ้มน้ำจิ้มพิเศษ เสร็ฟพร้อมวาซาบิ', 1),

-- หมวด: สลัด
('สลัด', 'สลัดผักญี่ปุ่น', 129.00, 'ผักสดจากฟาร์มออร์แกนิค ราดด้วยน้ำสลัดซอสโซยุ', 1),
('สลัด', 'สลัดแซลมอนอบ', 189.00, 'แซลมอนอบน้ำผึ้งมัสตาร์ด เสร็ฟกับผักสดกรอบๆ', 1),
('สลัด', 'สลัดซีซาร์ไก่ย่าง', 159.00, 'ผักกรีนโอ๊ค ไก่ย่าง ราดซอสซีซาร์', 1),

-- หมวด: เครื่องดื่ม
('เครื่องดื่ม', 'ชาเขียวเย็น', 59.00, 'ชาเขียวญี่ปุ่นแท้ หอมกลิ่นมัทฉะ', 1),
('เครื่องดื่ม', 'น้ำส้มคั้นสด', 69.00, 'ส้มนำเข้าจากญี่ปุ่น คั้นสดใหม่', 1),
('เครื่องดื่ม', 'กาแฟลาเต้', 79.00, 'เมล็ดกาแฟคั่วสด นมสดแท้', 1),
('เครื่องดื่ม', 'โคล่าญี่ปุ่น', 49.00, 'โคล่าญี่ปุ่นนำเข้า รสชาติต่างจากเดิม', 1);

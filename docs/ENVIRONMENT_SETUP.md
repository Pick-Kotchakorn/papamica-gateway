# 🔧 Environment Setup Guide

คู่มือนี้จะอธิบายวิธีการตั้งค่า Environment Variables สำหรับโปรเจกต์ Papamica Gateway

## 1. สำหรับการพัฒนาบนเครื่อง (Local Development)

หากคุณต้องการรันโปรเจกต์ในเครื่องตัวเอง (เช่น wrangler dev):

1. สร้างไฟล์ \.env.local\ ที่ root folder (ไฟล์นี้จะไม่ถูก commit ขึ้น Git)
2. ก๊อปปี้เนื้อหาจาก \.env.example\ มาใส่
3. เติมค่าจริงๆ ของคุณลงไป:

\\\ash
# .env.local
LINE_CHANNEL_ACCESS_TOKEN=รหัสยาวๆจากLINE
LINE_CHANNEL_SECRET=รหัสสั้นๆจากLINE
CLOUDFLARE_API_TOKEN=รหัสจากCloudflare
CLOUDFLARE_ACCOUNT_ID=รหัสบัญชีCloudflare
\\\

## 2. สำหรับการ Deploy (GitHub Actions)

เราใช้ **GitHub Secrets** ในการเก็บค่าเหล่านี้เพื่อความปลอดภัย:

| Secret Name | คำอธิบาย | หาได้จาก |
|-------------|----------|----------|
| \CLOUDFLARE_API_TOKEN\ | Token สำหรับจัดการ Workers | Cloudflare Dash > Profile > API Tokens |
| \CLOUDFLARE_ACCOUNT_ID\ | ID บัญชี Cloudflare | Cloudflare Dash > Workers > Sidebar |
| \LINE_CHANNEL_ACCESS_TOKEN\ | Token สำหรับส่งข้อความ | LINE Developers > Messaging API |
| \LINE_CHANNEL_SECRET\ | Secret สำหรับตรวจสอบ Webhook | LINE Developers > Basic Settings |

## 3. การใช้งานใน Code

- **Cloudflare Workers:** เรียกใช้ผ่าน \env.VARIABLE_NAME\
- **Google Apps Script:** เรียกใช้ผ่าน \PropertiesService.getScriptProperties()\


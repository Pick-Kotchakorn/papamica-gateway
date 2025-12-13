﻿// workers/gateway/src/index.js

import { validateSignature } from '@line/bot-sdk';

// 📌 รายการ Webhook Endpoints ทั้งหมด
// แก้ไข: ใช้ env.GAS_ENDPOINT แทนการ hardcode list
const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxEgtnl4WFLSIqYsHRGxTKsn6JOkSnF6jMmpht3AHm_CuXtIoGwcRN6DvUOaQVpe7w/exec';

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    console.log('🔔 Webhook received from LINE');

    const signature = request.headers.get('x-line-signature');
    if (!signature) {
      console.log('❌ No signature found');
      return new Response('No signature', { status: 400 });
    }

    // อ่าน body เป็น text เพื่อใช้ validate และ parse
    const body = await request.text();
    
    // 💡 V2.1 Security Fix: เปิดใช้งาน Signature Validation
    const channelSecret = env.LINE_CHANNEL_SECRET;
    
    if (!channelSecret) {
      console.error('❌ LINE_CHANNEL_SECRET is NOT set in Cloudflare Secrets!');
      return new Response('Server Error: Missing Secret', { status: 500 });
    }
    
    try {
      const isValid = validateSignature(body, channelSecret, signature); 
      
      if (!isValid) {
        console.log('❌ Invalid signature. Request rejected.');
        return new Response('Invalid signature', { status: 403 }); // 403 Forbidden
      }
    } catch (error) {
      console.error('❌ Signature Validation Error:', error.message);
      return new Response('Validation failed', { status: 500 });
    }

    console.log('✅ Signature validated');

    const eventData = JSON.parse(body);

    // บันทึก User Message ลง D1 (Optional)
    if (env.DB) {
      ctx.waitUntil(saveUserMessage(env.DB, eventData));
    }

    // 🎯 ส่งต่อไปยัง GAS Endpoint
    // 💡 ใช้ env.GAS_ENDPOINT ที่ตั้งค่าใน wrangler.toml/Secrets
    const endpointToForward = env.GAS_ENDPOINT || GAS_ENDPOINT;
    console.log(`🚀 Forwarding to GAS Endpoint: ${endpointToForward}`);
    
    ctx.waitUntil(
      (async () => {
        try {
            const response = await fetch(endpointToForward, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-line-signature': signature,
                'user-agent': 'line-webhook-gateway'
              },
              body: body
            });

            console.log(`✅ Forward Success: ${response.status} → ${response.statusText}`);
          } catch (err) {
            console.error('❌ Forward Failed to GAS:', err.message);
          }
      })()
    );

    return new Response('OK', { status: 200 });
  }
};

async function saveUserMessage(db, eventData) {
  // ... (โค้ดเดิม)
  try {
    if (!eventData.events || eventData.events.length === 0) return;

    for (const event of eventData.events) {
      if (event.type === 'message' && event.message.type === 'text') {
        await db.prepare(
          `INSERT INTO conversations 
           (user_id, message_type, message_text, timestamp, raw_event) 
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          event.source.userId,
          'user',
          event.message.text,
          new Date(event.timestamp).toISOString(),
          JSON.stringify(event)
        )
        .run();

        console.log(`✅ Saved to D1: ${event.source.userId}`);
      }
    }
  } catch (err) {
    console.error('❌ D1 save error:', err.message);
  }
}
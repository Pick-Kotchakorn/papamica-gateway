﻿// workers/gateway/src/index.js

import { validateSignature } from '@line/bot-sdk';

// 📌 GAS Endpoint 1 (Original)
const GAS_ENDPOINT_1 = 'https://script.google.com/macros/s/AKfycbzSksjKBT_LoifYrKdtuBZ0b8q-gVThIJ2v7M286N98sYdegrMIMDQM8oudXeobrKQL/exec';

// 📌 GAS Endpoint 2 (New) -> อันนี้คืออันที่คุณขอเพิ่มครับ
const GAS_ENDPOINT_2 = 'https://script.google.com/macros/s/AKfycbzvSzJSI_f0LgCMCfvLzZwylcPp7YLLmevGdTtehkUDHWbvuGkBNWIpEDhOGd2lVt2g/exec';

// 📌 Webhook.site Endpoint (Debug/Monitor)
const WEBHOOK_SITE_URL = 'https://webhook.site/581662c1-e473-45d4-bf27-b8322220f377';

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

    // อ่าน body เป็น text
    const body = await request.text();
    
    // ✅ Validate Signature
    const channelSecret = env.LINE_CHANNEL_SECRET;
    
    if (!channelSecret) {
      console.error('❌ LINE_CHANNEL_SECRET is NOT set!');
      return new Response('Server Error: Missing Secret', { status: 500 });
    }
    
    try {
      const isValid = validateSignature(body, channelSecret, signature); 
      
      if (!isValid) {
        console.log('❌ Invalid signature. Request rejected.');
        return new Response('Invalid signature', { status: 403 });
      }
    } catch (error) {
      console.error('❌ Signature Validation Error:', error.message);
      return new Response('Validation failed', { status: 500 });
    }

    console.log('✅ Signature validated');

    const eventData = JSON.parse(body);

    // 💾 บันทึกลง D1 (Optional)
    if (env.DB) {
      ctx.waitUntil(saveUserMessage(env.DB, eventData));
    }

    // 🎯 ส่งต่อไปยัง Multiple Endpoints (รวมทั้งหมด 3 Links)
    const endpoints = [
      { 
        name: 'GAS Primary', 
        url: env.GAS_ENDPOINT || GAS_ENDPOINT_1,
        enabled: true
      },
      { 
        name: 'GAS Secondary', // เพิ่มใหม่
        url: env.GAS_ENDPOINT_2 || GAS_ENDPOINT_2,
        enabled: true
      },
      { 
        name: 'Webhook.site', 
        url: env.WEBHOOK_SITE_URL || WEBHOOK_SITE_URL,
        enabled: env.ENABLE_WEBHOOK_SITE !== 'false'
      }
    ];

    // ส่งแบบ parallel
    ctx.waitUntil(
      forwardToEndpoints(endpoints, body, signature)
    );

    return new Response('OK', { status: 200 });
  }
};

/**
 * ส่ง webhook ไปยังหลาย endpoints พร้อมกัน
 */
async function forwardToEndpoints(endpoints, body, signature) {
  const promises = endpoints
    .filter(ep => ep.enabled)
    .map(async (endpoint) => {
      try {
        console.log(`🚀 Forwarding to ${endpoint.name}: ${endpoint.url}`);
        
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-line-signature': signature,
            'user-agent': 'line-webhook-gateway'
          },
          body: body
        });

        console.log(`✅ ${endpoint.name} Success: ${response.status}`);
        return { name: endpoint.name, success: true, status: response.status };
        
      } catch (err) {
        console.error(`❌ ${endpoint.name} Failed:`, err.message);
        return { name: endpoint.name, success: false, error: err.message };
      }
    });

  const results = await Promise.allSettled(promises);
  console.log('📊 Forward Results:', JSON.stringify(results, null, 2));
}

/**
 * บันทึก User Message ลง D1
 */
async function saveUserMessage(db, eventData) {
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
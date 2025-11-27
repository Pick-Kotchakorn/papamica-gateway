import { validateSignature } from '@line/bot-sdk';

// 📌 รายการ Webhook Endpoints ทั้งหมด
const WebhookEndpointList = [
  'https://script.google.com/macros/s/AKfycbzxK7kH5QaCnfpfY2J_76I1EgCBzvSD15nR9CK6eFc66OGaHzK96w742vankKjX4p5K/exec', //แสดง Loadding Animation และ บันทึกข้อมูลลง Google Sheets
];

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

    const body = await request.clone().text();
    const isValid = validateSignature(body, env.CHANNEL_SECRET, signature);
    
    if (!isValid) {
      console.log('❌ Invalid signature');
      return new Response('Invalid signature', { status: 400 });
    }

    console.log('✅ Signature validated');

    const eventData = JSON.parse(body);

    // บันทึก User Message ลง D1 (Optional)
    if (env.DB) {
      ctx.waitUntil(saveUserMessage(env.DB, eventData));
    }

    // 🎯 ส่งต่อไปยังทุก Endpoints
    console.log(`🚀 Broadcasting to ${WebhookEndpointList.length} endpoints`);
    
    ctx.waitUntil(
      Promise.all(
        WebhookEndpointList.map(async (endpoint, index) => {
          try {
            console.log(`📤 [${index + 1}] Forwarding to: ${endpoint}`);
            
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-line-signature': signature,
                'user-agent': 'line-webhook-gateway'
              },
              body: body
            });

            console.log(`✅ [${index + 1}] Success: ${endpoint} → ${response.status}`);
          } catch (err) {
            console.error(`❌ [${index + 1}] Failed: ${endpoint}`, err.message);
          }
        })
      )
    );

    return new Response('OK', { status: 200 });
  }
};

// ฟังก์ชันบันทึก User Message
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
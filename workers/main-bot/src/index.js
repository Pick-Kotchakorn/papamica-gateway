export default {
  async fetch(request, env, ctx) {
    return new Response('🤖 Papamica Main Bot is Standing By...', {
      status: 200,
      headers: { 'content-type': 'text/plain' }
    });
  }
};

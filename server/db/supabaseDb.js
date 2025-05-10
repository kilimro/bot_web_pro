const supabase = require('../supabaseClient');

module.exports = {
  async getBotsOnline() {
    const { data, error } = await supabase.from('bots').select('*').eq('status', 'online');
    if (error) throw error;
    return data;
  },
  async getBotInfo(botId) {
    const { data, error } = await supabase.from('bots').select('user_id').eq('id', botId).single();
    if (error) throw error;
    return data;
  },
  async getAIModels(userId) {
    const { data, error } = await supabase.from('ai_models').select('*').eq('user_id', userId).eq('enabled', true);
    if (error) throw error;
    return data || [];
  },
  async getKeywordReplies(userId) {
    const { data, error } = await supabase.from('keyword_replies').select('*').eq('user_id', userId).eq('is_active', true);
    if (error) throw error;
    return data || [];
  },
  async getPlugins(userId) {
    const { data, error } = await supabase.from('plugins').select('*').eq('user_id', userId).eq('is_active', true);
    if (error) throw error;
    return data || [];
  },
  async recordMessage(record) {
    const { error } = await supabase.from('bot_messages').insert([record]);
    if (error) throw error;
  },
  async updateBotStatus(botId, status) {
    const { error } = await supabase.from('bots').update({ status, last_active_at: new Date().toISOString() }).eq('id', botId);
    if (error) throw error;
  }
}; 
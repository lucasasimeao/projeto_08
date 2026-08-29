const axios = require('axios');

async function enviarAlerta(mensagem) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID nao configurado no .env.');
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: mensagem,
    parse_mode: 'HTML'
  };

  const response = await axios.post(url, payload, { timeout: 10000 });
  return response.data;
}

module.exports = {
  enviarAlerta,
  sendTelegramMessage: enviarAlerta
};

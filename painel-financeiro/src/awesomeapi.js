const axios = require('axios');

const AWESOME_API_URL = 'https://economia.awesomeapi.com.br/json/last/USD-BRL';

async function getDollarQuote() {
  const response = await axios.get(AWESOME_API_URL, { timeout: 10000 });
  const quote = response.data && response.data.USDBRL;

  if (!quote || !quote.bid) {
    throw new Error('Resposta invalida da AwesomeAPI para USD-BRL.');
  }

  return {
    moeda: 'USD/BRL',
    valor: Number(quote.bid),
    timestamp: quote.create_date || new Date().toISOString()
  };
}

module.exports = {
  getDollarQuote
};

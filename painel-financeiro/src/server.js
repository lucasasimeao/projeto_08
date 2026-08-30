const path = require('path');
const express = require('express');
const dotenv = require('dotenv');

const { getDollarQuote } = require('./awesomeapi');
const { enviarAlerta } = require('./telegram');
const { saveQuoteToAirtable, clearAirtableTable } = require('./airtable');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DAILY_REPORT_TIME = process.env.DAILY_REPORT_TIME || '09:00';
const DAILY_REPORT_ENABLED = process.env.DAILY_REPORT_ENABLED !== 'false';

let lastDailyReportDate = null;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

function formatQuoteMessage(title, quote, extraLines = []) {
  return [
    title,
    `<b>Cotacao atual: ${quote.moeda} = R$ ${quote.valor.toFixed(4)}</b>`,
    `Horario: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    ...extraLines
  ].join('\n');
}

function buildMarketStatusMessage(quote, threshold) {
  if (quote.valor < threshold) {
    return formatQuoteMessage('🚨 ALERTA DE CAMBIO - DOLAR ABAIXO DO PISO', quote, [
      `Piso de referencia: R$ ${threshold.toFixed(4)}`,
      'O cambio caiu abaixo do piso e acendeu sinal vermelho no mercado.'
    ]);
  }

  return formatQuoteMessage('🟢 MERCADO EM EQUILIBRIO - TUDO CERTO', quote, [
    `Piso de referencia: R$ ${threshold.toFixed(4)}`,
    'O cambio segue em terreno firme e a mesa pode operar com tranquilidade.'
  ]);
}

function buildDailySummaryMessage(quote, threshold, marketStatus) {
  const statusLinha = marketStatus.alerta
    ? 'Sinal do dia: pressao vendedora no dolar.'
    : 'Sinal do dia: mercado de cambio em faixa de normalidade.';

  return formatQuoteMessage('📊 BOLETIM DIARIO DE CAMBIO', quote, [
    `Faixa de monitoramento: R$ ${threshold.toFixed(4)}`,
    statusLinha,
    'Resumo diario emitido automaticamente pela central.'
  ]);
}

function buildMarketStatus(quote, threshold) {
  const alerta = quote.valor < threshold;

  return {
    alerta,
    visual: alertarParaVisual(alerta),
    label: alerta ? 'alerta' : 'ok'
  };
}

function alertarParaVisual(alerta) {
  return alerta ? '🚨' : '🟢';
}

async function gerarResumoDiario() {
  const quote = await getDollarQuote();
  const threshold = Number(process.env.DOLLAR_ALERT_THRESHOLD || 5.0);
  const marketStatus = buildMarketStatus(quote, threshold);
  const message = buildDailySummaryMessage(quote, threshold, marketStatus);

  await saveQuoteToAirtable({
    data: new Date().toISOString(),
    moeda: quote.moeda,
    valor: quote.valor
  });

  await enviarAlerta(message);

  lastDailyReportDate = new Date().toISOString().slice(0, 10);

  return {
    ok: true,
    cotacao: quote,
    limite: threshold,
    marketStatus,
    tipoFluxo: 'resumo-diario',
    notificacaoEnviada: true,
    message,
    dataEnvio: new Date().toISOString()
  };
}

function deveEnviarResumoHoje(now = new Date()) {
  const currentDate = now.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 5);

  return DAILY_REPORT_ENABLED && currentTime === DAILY_REPORT_TIME && lastDailyReportDate !== currentDate;
}

setInterval(async () => {
  if (!deveEnviarResumoHoje()) {
    return;
  }

  try {
    await gerarResumoDiario();
    console.log(`Resumo diario enviado em ${DAILY_REPORT_TIME}`);
  } catch (error) {
    console.error('Falha ao enviar resumo diario:', error.message);
  }
}, 60 * 1000);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/config', (req, res) => {
  res.status(200).json({
    dailyReportEnabled: DAILY_REPORT_ENABLED,
    dailyReportTime: DAILY_REPORT_TIME
  });
});

app.post('/verificar', async (req, res) => {
  try {
    const threshold = Number(process.env.DOLLAR_ALERT_THRESHOLD || 5.0);
    const quote = await getDollarQuote();
    const marketStatus = buildMarketStatus(quote, threshold);

    await saveQuoteToAirtable({
      data: new Date().toISOString(),
      moeda: quote.moeda,
      valor: quote.valor
    });

    let message = [
      '🔎 CHECAGEM OPERACIONAL CONCLUIDA',
      `<b>Cotacao atual: ${quote.moeda} = R$ ${quote.valor.toFixed(4)}</b>`,
      `Piso de monitoramento: R$ ${threshold.toFixed(4)}`,
      'Sem disparo de alerta no Telegram nesta checagem.'
    ].join('\n');

    let alertaEnviado = false;

    if (marketStatus.alerta) {
      message = buildMarketStatusMessage(quote, threshold);
      await enviarAlerta(message);
      alertaEnviado = true;
    }

    res.status(200).json({
      ok: true,
      cotacao: quote,
      limite: threshold,
      tipoFluxo: 'verificacao-manual',
      alertaEnviado,
      notificacaoEnviada: alertaEnviado,
      marketStatus,
      mensagem: message
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      erro: error.message
    });
  }
});

app.post('/resumo-diario', async (req, res) => {
  try {
    const result = await gerarResumoDiario();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      erro: error.message
    });
  }
});

app.post('/limpar-tabela', async (req, res) => {
  try {
    const result = await clearAirtableTable();
    res.status(200).json({
      ok: true,
      deletedCount: result.deletedCount,
      message: result.deletedCount > 0 ? 'Livro-caixa zerado no Airtable.' : 'Tabela ja estava limpa.'
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      erro: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Resumo diario configurado para ${DAILY_REPORT_TIME}`);
});

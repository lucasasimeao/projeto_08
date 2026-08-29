const axios = require('axios');

async function saveQuoteToAirtable({ data, moeda, valor }) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;

  if (!apiKey || !baseId || !tableName) {
    throw new Error('AIRTABLE_API_KEY, AIRTABLE_BASE_ID ou AIRTABLE_TABLE_NAME nao configurado no .env.');
  }

  const endpoint = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;

  const body = {
    records: [
      {
        fields: {
          Data: data,
          Moeda: moeda,
          Valor: valor
        }
      }
    ]
  };

  try {
    const response = await axios.post(endpoint, body, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    const details = error.response ? ` (${error.response.status}) ${JSON.stringify(error.response.data)}` : '';
    throw new Error(`Falha ao salvar no Airtable${details}`);
  }
}

async function getAllRecordIds() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;

  if (!apiKey || !baseId || !tableName) {
    throw new Error('AIRTABLE_API_KEY, AIRTABLE_BASE_ID ou AIRTABLE_TABLE_NAME nao configurado no .env.');
  }

  const endpoint = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  const recordIds = [];
  let offset;

  while (true) {
    try {
      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        params: {
          pageSize: 100,
          ...(offset ? { offset } : {})
        },
        timeout: 10000
      });

      const records = response.data.records || [];
      for (const record of records) {
        recordIds.push(record.id);
      }

      offset = response.data.offset;
      if (!offset) {
        break;
      }
    } catch (error) {
      const details = error.response ? ` (${error.response.status}) ${JSON.stringify(error.response.data)}` : '';
      throw new Error(`Falha ao listar registros do Airtable${details}`);
    }
  }

  return recordIds;
}

async function deleteRecordsInBatches(recordIds) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME;

  if (!apiKey || !baseId || !tableName) {
    throw new Error('AIRTABLE_API_KEY, AIRTABLE_BASE_ID ou AIRTABLE_TABLE_NAME nao configurado no .env.');
  }

  const endpoint = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  let deletedCount = 0;

  for (let index = 0; index < recordIds.length; index += 10) {
    const batch = recordIds.slice(index, index + 10);
    const deleteUrl = `${endpoint}?${batch.map((id) => `records[]=${encodeURIComponent(id)}`).join('&')}`;

    try {
      const response = await axios.delete(deleteUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`
        },
        timeout: 10000
      });

      deletedCount += (response.data.records || []).length;
    } catch (error) {
      const details = error.response ? ` (${error.response.status}) ${JSON.stringify(error.response.data)}` : '';
      throw new Error(`Falha ao limpar registros do Airtable${details}`);
    }
  }

  return deletedCount;
}

async function clearAirtableTable() {
  const recordIds = await getAllRecordIds();

  if (recordIds.length === 0) {
    return { deletedCount: 0 };
  }

  const deletedCount = await deleteRecordsInBatches(recordIds);
  return { deletedCount };
}

module.exports = {
  saveQuoteToAirtable,
  clearAirtableTable
};

# Central Inteligente de Monitoramento Financeiro

Servidor Node.js que monitora a cotação USD/BRL em tempo real via [AwesomeAPI](https://docs.awesomeapi.com.br/), dispara alertas no Telegram quando o dólar cai abaixo de um piso configurado, e persiste o histórico de cotações no Airtable.

## Funcionalidades

- **Monitoramento de câmbio** — busca a cotação USD/BRL em tempo real
- **Alerta via Telegram** — envia mensagem automática quando o dólar fica abaixo do piso definido
- **Resumo diário** — boletim automático enviado no horário configurado
- **Persistência no Airtable** — cada verificação salva data, moeda e valor na base
- **Painel web** — interface HTML/CSS customizada para disparar operações e visualizar o status do mercado

## Pré-requisitos

- Node.js 18+
- Conta no [Telegram](https://core.telegram.org/bots) com um bot criado via BotFather
- Conta no [Airtable](https://airtable.com) com uma base e tabela criadas
- Tabela no Airtable com os campos: `Data` (Date), `Moeda` (Single line text), `Valor` (Number)

## Instalação

```bash
git clone https://github.com/lucasasimeao/projeto_08.git
cd projeto_08/painel-financeiro
npm install
```

## Configuração

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.example .env
```

| Variável                | Descrição                                              |
|-------------------------|--------------------------------------------------------|
| `PORT`                  | Porta do servidor (padrão: `3000`)                     |
| `DOLLAR_ALERT_THRESHOLD`| Piso do dólar para disparo de alerta (ex: `5.30`)      |
| `DAILY_REPORT_ENABLED`  | Habilita o boletim diário automático (`true`/`false`)  |
| `DAILY_REPORT_TIME`     | Horário do boletim diário no formato `HH:MM`           |
| `TELEGRAM_BOT_TOKEN`    | Token do bot gerado pelo BotFather                     |
| `TELEGRAM_CHAT_ID`      | ID do chat/grupo onde as mensagens serão enviadas      |
| `AIRTABLE_API_KEY`      | Personal Access Token do Airtable                      |
| `AIRTABLE_BASE_ID`      | ID da base do Airtable (começa com `app...`)           |
| `AIRTABLE_TABLE_NAME`   | Nome da tabela (padrão: `Cotacoes`)                    |

> O Personal Access Token do Airtable precisa das scopes `data.records:read` e `data.records:write`.

## Execução

```bash
# produção
npm start

# desenvolvimento (reinicia ao salvar)
npm run dev
```

O painel estará disponível em `http://localhost:3000`.

## Endpoints da API

| Método | Rota             | Descrição                                                                 |
|--------|------------------|---------------------------------------------------------------------------|
| GET    | `/health`        | Verifica se o servidor está no ar                                         |
| GET    | `/config`        | Retorna as configurações ativas de boletim diário                         |
| POST   | `/verificar`     | Busca cotação, salva no Airtable e alerta no Telegram se abaixo do piso   |
| POST   | `/resumo-diario` | Envia boletim completo no Telegram independente do status do mercado       |
| POST   | `/limpar-tabela` | Remove todos os registros da tabela no Airtable                           |

## Justificativa Teórica

Este projeto aplica na prática o conceito de **orquestração de APIs** estudado na disciplina. A escolha de cada serviço foi deliberada:

- **AwesomeAPI** — API pública gratuita, sem autenticação para leitura, ideal para consumo em ambiente acadêmico. Demonstra o padrão REST com `GET` e desserialização de JSON.
- **Airtable** — solução No-Code que expõe um banco de dados relacional via API REST autenticada. Demonstra o padrão de persistência via `POST` com Bearer Token, sem necessidade de infraestrutura de banco de dados própria.
- **Telegram Bot API** — canal de notificação assíncrona. Demonstra integração de webhooks/push e o uso de `parse_mode: HTML` para formatação de mensagens.

A combinação dos três serviços demonstra o ciclo completo de um sistema de integração: **coleta → persistência → notificação**.

## Segurança e LGPD

### Proteção de credenciais

- Todas as chaves, tokens e IDs estão **exclusivamente no arquivo `.env`**, que está listado no `.gitignore` e nunca é enviado ao repositório público.
- O `.env.example` documenta as variáveis necessárias sem expor valores reais.
- O servidor valida a presença de cada variável de ambiente antes de realizar qualquer chamada às APIs externas, falhando com mensagem de erro explícita se alguma estiver ausente.

### Proteção contra XSS

- A interface web aplica `escapeHtml()` em todos os dados externos antes de inseri-los no DOM via `innerHTML`, prevenindo ataques de Cross-Site Scripting (XSS). As únicas tags HTML permitidas (`<b>`) são reinseridas de forma controlada após o escape.

### LGPD — Dados tratados

| Dado | Origem | Finalidade | Armazenamento |
|------|--------|------------|---------------|
| Cotação USD/BRL | AwesomeAPI (pública) | Monitoramento de câmbio | Airtable (por operação) |
| Data/hora da verificação | Sistema local | Auditoria e histórico | Airtable (por operação) |

Nenhum dado pessoal de usuários é coletado ou processado. O projeto não se enquadra como controlador de dados pessoais conforme a Lei 13.709/2018 (LGPD).

## Estrutura do projeto

```
painel-financeiro/
├── public/
│   └── index.html       # Painel web
├── src/
│   ├── server.js        # Servidor Express e lógica de negócio
│   ├── awesomeapi.js    # Integração com AwesomeAPI (cotação USD/BRL)
│   ├── telegram.js      # Envio de mensagens via Telegram Bot API
│   └── airtable.js      # Leitura e escrita de registros no Airtable
├── .env.example
└── package.json
```

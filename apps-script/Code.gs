/**
 * CABINE SÓ ALEGRIA — Google Apps Script
 * Recebe dados do formulário e registra no Google Planilhas.
 *
 * INSTRUÇÕES:
 * 1. Abra o Google Planilhas desejado
 * 2. Extensões → Apps Script
 * 3. Cole este código
 * 4. Salve e publique: Implantar → Nova implantação → App da Web
 *    - Executar como: Eu mesmo
 *    - Quem tem acesso: Qualquer pessoa
 * 5. Copie a URL gerada e cole em src/lib/googleSheets.ts
 */

// ─── Configurações ───────────────────────────────────────
var SHEET_ALL     = 'Respostas';
var SHEET_PF      = 'Pessoa Física';
var SHEET_PJ      = 'Pessoa Jurídica';
var SHEET_ERRORS  = 'Erros de integração';

var HEADERS_ALL = [
  'submission_id', 'protocolo', 'data_envio', 'tipo_pessoa',
  'nome_contratante', 'data_nascimento', 'cpf', 'rg',
  'nome_fantasia', 'razao_social', 'cnpj', 'nome_responsavel',
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
  'telefone', 'email', 'contato_cerimonial',
  'nome_evento',
  'cep_evento', 'logradouro_evento', 'numero_evento', 'complemento_evento',
  'bairro_evento', 'cidade_evento', 'estado_evento', 'referencia_evento',
  'data_evento', 'horario_inicio_evento', 'horario_inicio_fotos',
  'forma_pagamento', 'forma_pagamento_outro',
  'quantidade_horas', 'quantidade_horas_outro',
  'pacote', 'pacote_outro',
  'equipamento',
  'autoriza_publicacao_fotos',
  'solicita_nota_fiscal',
  'comentarios',
  'consentimento_dados',
  'origem'
];

var HEADERS_PF = [
  'submission_id', 'protocolo', 'data_envio',
  'nome_contratante', 'data_nascimento', 'cpf', 'rg',
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
  'telefone', 'email', 'contato_cerimonial',
  'nome_evento', 'data_evento', 'horario_inicio_evento', 'horario_inicio_fotos',
  'cep_evento', 'logradouro_evento', 'numero_evento', 'cidade_evento', 'estado_evento',
  'referencia_evento',
  'forma_pagamento', 'forma_pagamento_outro',
  'quantidade_horas', 'quantidade_horas_outro',
  'pacote', 'equipamento',
  'autoriza_publicacao_fotos',
  'comentarios', 'origem'
];

var HEADERS_PJ = [
  'submission_id', 'protocolo', 'data_envio',
  'nome_fantasia', 'cnpj', 'nome_responsavel',
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
  'telefone', 'email',
  'nome_evento', 'data_evento', 'horario_inicio_evento', 'horario_inicio_fotos',
  'cep_evento', 'logradouro_evento', 'numero_evento', 'cidade_evento', 'estado_evento',
  'referencia_evento',
  'forma_pagamento', 'forma_pagamento_outro',
  'quantidade_horas', 'quantidade_horas_outro',
  'pacote', 'pacote_outro', 'equipamento',
  'autoriza_publicacao_fotos', 'solicita_nota_fiscal',
  'comentarios', 'origem'
];

// ─── Main handler ─────────────────────────────────────────
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (err) {
    Logger.log('Lock timeout: ' + err);
    return jsonResponse({ status: 'error', message: 'Lock timeout' });
  }

  try {
    // Parse JSON body
    var raw = e.postData && e.postData.contents ? e.postData.contents : '{}';
    var data;
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      logError('JSON parse error', parseErr.toString(), raw.slice(0, 200));
      return jsonResponse({ status: 'error', message: 'Invalid JSON' });
    }

    // Validate submission_id
    if (!data.submission_id) {
      logError('Missing submission_id', 'No submission_id in payload', '');
      return jsonResponse({ status: 'error', message: 'Missing submission_id' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Ensure sheets exist
    var sheetAll    = ensureSheet(ss, SHEET_ALL,    HEADERS_ALL);
    var sheetPF     = ensureSheet(ss, SHEET_PF,     HEADERS_PF);
    var sheetPJ     = ensureSheet(ss, SHEET_PJ,     HEADERS_PJ);
    var sheetErrors = ensureSheet(ss, SHEET_ERRORS, ['timestamp', 'tipo', 'mensagem', 'detalhe']);

    // Check duplicate in "Respostas" sheet
    if (isDuplicate(sheetAll, data.submission_id)) {
      Logger.log('Duplicate submission_id: ' + data.submission_id);
      return jsonResponse({ status: 'duplicate', message: 'Already registered' });
    }

    // Build row for Respostas
    var rowAll = buildRow(data, HEADERS_ALL, {
      pacote: data.pacote_nome_snapshot || data.pacote_outro || '',
      equipamento: data.equipamento_nome_snapshot || '',
    });
    sheetAll.appendRow(rowAll);

    // Insert in PF or PJ sheet
    if (data.tipo_pessoa === 'PF') {
      var rowPF = buildRow(data, HEADERS_PF, {
        pacote: data.pacote_nome_snapshot || '',
        equipamento: data.equipamento_nome_snapshot || '',
      });
      sheetPF.appendRow(rowPF);
    } else if (data.tipo_pessoa === 'PJ') {
      var rowPJ = buildRow(data, HEADERS_PJ, {
        pacote: data.pacote_nome_snapshot || '',
        pacote_outro: data.pacote_outro || '',
        equipamento: data.equipamento_nome_snapshot || '',
      });
      sheetPJ.appendRow(rowPJ);
    }

    return jsonResponse({ status: 'ok', protocolo: data.protocolo || '' });

  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    try {
      var ss2 = SpreadsheetApp.getActiveSpreadsheet();
      var errSheet = ensureSheet(ss2, SHEET_ERRORS, ['timestamp', 'tipo', 'mensagem', 'detalhe']);
      errSheet.appendRow([new Date().toISOString(), 'doPost', err.toString(), '']);
    } catch (e2) {
      Logger.log('Failed to log error: ' + e2);
    }
    return jsonResponse({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ─── Helper: ensure sheet exists and has headers ──────────
function ensureSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    // Style header row
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1a1008');
    headerRange.setFontColor('#F7941D');
    sheet.setFrozenRows(1);
  } else {
    // Ensure headers exist
    var existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (existing.length === 0 || existing[0] === '') {
      sheet.insertRowBefore(1);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  return sheet;
}

// ─── Helper: check duplicate by submission_id ─────────────
function isDuplicate(sheet, submissionId) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var col = headers.indexOf('submission_id');
  if (col < 0) return false;

  var values = sheet.getRange(2, col + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === submissionId) return true;
  }
  return false;
}

// ─── Helper: build row from data + headers ────────────────
function buildRow(data, headers, extra) {
  extra = extra || {};
  return headers.map(function(h) {
    if (extra.hasOwnProperty(h)) return extra[h];
    var val = data[h];
    if (val === null || val === undefined) return '';
    if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
    return val.toString();
  });
}

// ─── Helper: log error ───────────────────────────────────
function logError(tipo, mensagem, detalhe) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ensureSheet(ss, SHEET_ERRORS, ['timestamp', 'tipo', 'mensagem', 'detalhe']);
    sheet.appendRow([new Date().toISOString(), tipo, mensagem, detalhe]);
  } catch (e) {
    Logger.log('logError failed: ' + e);
  }
}

// ─── Helper: JSON response ───────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Test function (run manually in Apps Script editor) ───
function testDoPost() {
  var testData = {
    submission_id: 'test-' + new Date().getTime(),
    protocolo: 'CSA-2026-000001',
    tipo_pessoa: 'PF',
    nome_contratante: 'João Teste Silva',
    cpf: '12345678900',
    email: 'joao@teste.com',
    telefone: '31999990000',
    data_evento: '2026-12-31',
    cidade_evento: 'Belo Horizonte',
    pacote_nome_snapshot: 'Pacote 1 — 10x15 cm',
    equipamento_nome_snapshot: 'Cabine de Fotos',
    forma_pagamento: 'pix',
    quantidade_horas: '3',
    consentimento_dados: true,
    autoriza_publicacao_fotos: true,
    data_envio: new Date().toISOString(),
    origem: 'https://test.local',
  };
  var mockE = { postData: { contents: JSON.stringify(testData) } };
  var result = doPost(mockE);
  Logger.log(result.getContent());
}

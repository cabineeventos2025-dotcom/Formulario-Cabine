// ================================================================
// Templates de Contratos — Cabine Só Alegria
// Baseados nos contratos reais da empresa
// ================================================================

// ─── Marcadores obrigatórios ────────────────────────────────────

export const MARCADORES_OBRIGATORIOS_PF = [
  'NOME_CONTRATANTE',
  'CPF',
  'NOME_EVENTO',
  'DATA_EVENTO',
  'QUANTIDADE_HORAS',
  'HORARIO_INICIO_FOTOS',
  'ENDERECO_EVENTO',
  'VALOR_TOTAL',
  'VALOR_TOTAL_EXTENSO',
];

export const MARCADORES_OBRIGATORIOS_PJ = [
  'RAZAO_SOCIAL',
  'CNPJ',
  'RESPONSAVEL_CONTRATO',
  'NOME_EVENTO',
  'DATA_EVENTO',
  'QUANTIDADE_HORAS',
  'HORARIO_INICIO_FOTOS',
  'ENDERECO_EVENTO',
  'VALOR_TOTAL',
  'VALOR_TOTAL_EXTENSO',
];

// ─── Mapeamento de pacotes para formato da foto ─────────────────

export function formatoFromPacote(nomePacote: string): string {
  const n = nomePacote.toLowerCase();
  if (n.includes('pacote 1') || n.includes('10x15') || n.includes('10 x 15')) return '10x15cm';
  if (n.includes('pacote 2') || n.includes('5x15') || n.includes('5 x 15')) return '5x15cm';
  if (n.includes('pacote 3') || n.includes('7,5x10') || n.includes('7.5x10') || n.includes('7x10')) return '7,5x10cm';
  return '';
}

// ─── Função auxiliar para "N horas" sempre com "horas" ────────

export function formatarHoras(qtd: string | number | undefined): string {
  if (!qtd) return '';
  const n = String(qtd).replace(/\s*horas?\s*/gi, '').trim();
  if (!n) return '';
  return `${n} HORAS`;
}

// ================================================================
// TEMPLATE PF — CABINE FOTOGRÁFICA (modelo: contrato Luana)
// ================================================================

export const TEMPLATE_CABINE_FOTOGRARICA = `
<div class="contrato-titulo">CONTRATO DE LOCAÇÃO DE BEM MÓVEL E OUTRAS AVENÇAS</div>

<p>Contrato de Locação de Bem Móvel e Outras Avenças que entre si celebram, de um lado, <strong>{{NOME_EMPRESARIAL_LOCADOR}}</strong>, Nome Fantasia <strong>{{NOME_FANTASIA_LOCADOR}}</strong>, inscrito no CNPJ <strong>{{CNPJ_LOCADOR}}</strong>, localizada a <strong>{{ENDERECO_LOCADOR}}</strong>, doravante designada <strong>"LOCADOR"</strong>, e, de outro lado <strong>{{NOME_CONTRATANTE}}</strong> Inscrito(a) no CPF: <strong>{{CPF}}</strong> residente a <strong>{{ENDERECO_CONTRATANTE}}</strong> DORAVANTE denominado(a) <strong>"LOCATÁRIO"</strong>. CONSIDERANDO que a relação entre as partes se dará com total independência técnico-operacional, sem obrigações de exclusividade e/ou de dependência econômica, e que as partes declaram não ser de seu interesse manter um vínculo de subordinação com a outra parte; CONSIDERANDO o processo de negociação ocorrido entre as partes, baseado nos princípios da ética e boa-fé na condução dos negócios bem como nas práticas de mercado, no qual foram discutidas as necessidades e definido o escopo desta prestação de serviços; CONSIDERANDO que todas as fotografias são retiradas por via da CABINE, objeto desta locação, sendo o LOCADOR o detentor dos direitos autorais, conforme dispõe a Lei 9.610/98.</p>

<p>RESOLVEM celebrar o presente <strong>CONTRATO DE LOCAÇÃO DE BEM MÓVEL E OUTRAS AVENÇAS</strong>, o qual será regido pelas cláusulas seguintes:</p>

<p><strong>CLÁUSULA 1ª - Do Objeto</strong> – O presente contrato tem por objeto a locação de uma <strong>CABINE FOTOGRÁFICA</strong> e seus equipamentos, de propriedade do LOCADOR pelo tempo de <strong>{{QUANTIDADE_HORAS}}</strong>, com início da sessão de FOTOS AS <strong>{{HORARIO_INICIO_FOTOS}}</strong>, no evento <strong>{{NOME_EVENTO}}</strong> a ser realizada no dia <strong>{{DATA_EVENTO}}</strong>, Localizado <strong>{{ENDERECO_EVENTO}}</strong></p>

<p>Parágrafo primeiro: A CABINE FOTOGRÁFICA é dotada dos seguintes equipamentos: 01 (uma) impressora fotográfica DNP RX1, 01 (um notebook), 01 (um) Monitor de 20 polegadas, 02 lâmpadas de LED (6 Watts cada), 01 (uma) Botoeira de comando, 01 (uma) WebCam Full HD 15MP e fiação elétrica.</p>

<p>Parágrafo segundo: O LOCATÁRIO também fará jus a um número ilimitado de fotos a serem tiradas durante o evento, bem como a cópia delas, acesso ao Google Drive com todas as fotos, apetrechos e fantasias em caráter de empréstimo durante as sessões de fotos, uma borda personalizada nas fotos.</p>

{{CLAUSULA_OPCIONAIS}}

<p><strong>CLÁUSULA 2ª - Do Valor</strong> – O LOCATÁRIO pagará ao LOCADOR, a título de aluguel pelas <strong>{{QUANTIDADE_HORAS}}</strong> de locação da CABINE FOTOGRÁFICA, mais os serviços listados acima, o valor de <strong>{{VALOR_TOTAL}}</strong> (<strong>{{VALOR_TOTAL_EXTENSO}}</strong>) no LAYOUT <strong>{{PACOTE}}</strong>.</p>

<p>Parágrafo primeiro – Forma de pagamento: O pagamento será via PIX chave CNPJ: <strong>{{CNPJ_LOCADOR}}</strong> no valor total de <strong>{{VALOR_TOTAL}}</strong> no ato da assinatura do contrato.</p>

<p>Parágrafo segundo: O não pagamento do valor constante no caput na data nele mencionada acarretará a aplicação de multa contratual de 2% e juros de mora 1% ao mês, calculados pró rata die, em consonância com o artigo 406 do código civil brasileiro.</p>

<p>Parágrafo terceiro: Será cobrado o valor de <strong>{{VALOR_HORA_ADICIONAL}}</strong> (<strong>{{VALOR_HORA_ADICIONAL_EXTENSO}}</strong>) por cada hora adicional da CABINE FOTOGRÁFICA solicitada no evento acima descrito.</p>

<p><strong>CLÁUSULA 3ª – Da Vigência</strong> – O presente contrato vigerá após a assinatura do mesmo até o término do evento.</p>

<p><strong>CLÁUSULA 4ª – Da Extinção Contratual</strong> – Na hipótese de resilição do contrato por uma das partes será considerada devida pela parte que promover tal ato, a multa contratual de 25% do valor do contrato, caso este seja até 7 dias antes da data do evento e 50% caso a resilição seja no prazo menor que 7 dias da data do evento, além de devolução de qualquer valor já quitado por parte do LOCATÁRIO, caso a resilição não tenha sido realizada por ele.</p>

<p><strong>CLAÚSULA 5ª - Do uso</strong> - O LOCATÁRIO, detentor da posse direta do equipamento, se compromete a utilizá-lo somente para o fim estabelecido na cláusula 1ª, mantendo-o em perfeitas condições e zelando pela integridade física do (s) mesmo (s).</p>

<p>Parágrafo primeiro: O LOCATÁRIO <strong>{{AUTORIZA}}</strong> desde a assinatura deste, a publicação e disponibilização online das fotos retiradas dentro da cabine em redes sociais (facebook, instagram e site (www.cabinesoalegria.com.br)).</p>

<p><strong>CLAÚSULA 6ª - Obrigações comuns a ambas as partes</strong> - Constituem obrigações comuns às Partes, sem prejuízo das demais inerentes à locação:</p>

<p>a) Atender as obrigações pactuadas neste contrato;</p>
<p>b) Cumprir a legislação vigente, bem como preservar a outra parte de qualquer demanda ou reivindicação de sua exclusiva responsabilidade;</p>
<p>c) Respeitar o direito de propriedade intelectual e personalíssima de terceiros na consecução deste contrato, mantendo a outra parte a salvo de reclamações, bem como resguardada de quaisquer responsabilidades pelo uso indevido de marcas e patentes, segredos industriais, inventos, logomarcas, logotipos, desenhos, métodos, direitos autorais, direitos de imagem e conexos e outros direitos de propriedade intelectual previstos na legislação em vigor;</p>
<p>d) Somente fazer uso de qualquer direito de propriedade intelectual da outra parte, incluindo, mas não se limitando a marcas e patentes, mediante autorização prévia e escrita desta, atendendo de forma restrita à finalidade específica a que se destina;</p>

<p><strong>CLAÚSULA 7ª - Das Obrigações do Locador</strong> - Sem prejuízo de outras expressamente previstas neste instrumento, constituem-se obrigações do LOCADOR:</p>

<p>a) O LOCADOR se compromete a disponibilizar a CABINE FOTOGRÁFICA e os equipamentos ao LOCATÁRIO no prazo de <strong>{{QUANTIDADE_HORAS}}</strong>, no evento acima supracitado;</p>
<p>b) garantir e responsabilizar-se perante o LOCATÁRIO pelo adequado funcionamento do bem locado;</p>
<p>c) efetuar a montagem e desmontagem da CABINE FOTOGRÁFICA e demais equipamentos no evento acima descrito;</p>
<p>d) disponibilizar um funcionário para auxílio do LOCATÁRIO e seus convidados na utilização da CABINE FOTOGRÁFICA;</p>
<p>e) Prestar o serviço com pessoal devidamente capacitado e habilitado para a consecução deste contrato, de acordo com a melhor técnica;</p>
<p>f) responsabilizar-se perante o LOCATÁRIO por toda e quaisquer orientações e/ou recomendações relacionadas às providências e/ou especificações técnicas e que sejam necessárias à instalação dos equipamentos e seu manuseio;</p>
<p>g) acesso ao Google Drive para o LOCATÁRIO com todas as fotos tiradas;</p>
<p>h) entregar todas as fotos tiradas durante o evento para o LOCATÁRIO ou para seus convidados;</p>
<p>i) Não ceder ou transferir, no todo ou em parte, os serviços objeto deste contrato, sem prévia autorização por escrito por parte do LOCATÁRIO.</p>
<p>j) Entregar uma foto por adulto (maior que 12 anos de idade) a cada final de sessão de fotos.</p>
<p>K) Menores de 12 anos só poderão tirar foto acompanhados de um responsável, respeitando o item (j).</p>

<p><strong>CLAÚSULA 8ª - Das Obrigações do Locatário</strong> - Sem prejuízo de outras expressamente previstas neste instrumento, constituem-se obrigações do LOCATÁRIO:</p>

<p>a) disponibilizar um espaço coberto de (3m x 2m), 6 metros quadrados, próximo a um ponto de energia elétrica no salão em que será realizado o evento;</p>
<p>b) disponibilizar energia elétrica para o funcionamento da CABINE FOTOGRÁRICA e demais equipamentos;</p>
<p>c) pagar o aluguel pontualmente quando do vencimento, bem como responder por todas as despesas assumidas neste instrumento e por aquelas que derem causa;</p>
<p>d) responsabilizar e reparar ao LOCADOR por todos os danos causados na CABINE FOTOGRÁFICA bem como de qualquer equipamento dela constante, os quais estão devidamente descritos na Cláusula Primeira, pelo mau uso ou vandalismo do LOCATÁRIO, bem como de seus convidados ou terceiros;</p>
<p>e) além da reparação pelos danos materiais causados pela má utilização ou hostilidade da CABINE FOTOGRÁFICA pelo mau uso ou vandalismo do LOCATÁRIO, convidados ou terceiros, fica desde já pactuado que também haverá a reparação civil pelos lucros cessantes do LOCADOR.</p>

<p><strong>CLÁUSULA 9ª – Não vinculação</strong> – O presente Contrato não estabelecerá, de forma alguma, qualquer relação de subordinação entre o LOCADOR e o LOCATÁRIO, nem tampouco implicará em qualquer vínculo trabalhista entre as partes.</p>

<p>Parágrafo primeiro: O presente contrato é de natureza estritamente civil, não se estabelecendo qualquer vínculo empregatício ou responsabilidade do LOCATÁRIO em relação ao LOCADOR e o pessoal que este venha a empregar na execução dos serviços ora contratados, correndo por conta exclusiva do LOCADOR todas as despesas e encargos trabalhistas, sociais e previdenciários.</p>

<p><strong>CLÁUSULA 10ª - Força Maior</strong> - Nenhuma das partes será responsável por atraso ou falha na execução de todas ou qualquer parte do presente Contrato, caso seu desempenho venha a ser dificultado devido a um evento de Força Maior. Força Maior, tal como é utilizada no presente Contrato, entende-se qualquer forma e as circunstâncias além do controle das PARTES, tal como estabelecido no artigo 393 do código civil brasileiro, o que impede o desempenho total ou parcial das obrigações decorrentes do presente Contrato pela parte ou partes afetadas.</p>

<p>Parágrafo único: Se houver um evento de Força Maior o tempo estipulado para o cumprimento das obrigações das partes afetadas deve ser prorrogado ou suspenso por um período igual ao da duração desse evento ou circunstância, sem qualquer responsabilidade, desde que comunicado em tempo hábil.</p>

<p><strong>CLÁUSULA 11ª - Das disposições Gerais</strong> – As situações não previstas contratualmente serão objeto de discussão entre as partes, de forma a viabilizar pelo senso comum, soluções que atendam aos interesses de ambas as partes. Caso elas não cheguem a um consenso, eventuais controvérsias serão resolvidas nos termos da legislação civil aplicável.</p>

<p><strong>CLÁUSULA 12ª – Do Foro</strong> – Para dirimir e decidir sobre dúvidas, de qualquer natureza, as partes elegem o Foro da <strong>{{FORO}}</strong>, em detrimento a qualquer outro, por mais privilegiado que seja.</p>

<br>
<p style="text-align:center"><strong>{{CIDADE_ASSINATURA}}, {{DATA_CONTRATO}}.</strong></p>
<br><br>

<div style="display:flex; justify-content:space-between; margin-top:40px; gap:40px;">
  <div style="flex:1; text-align:center;">
    <div style="border-top:1px solid #000; padding-top:6px;">
      <div><strong>{{NOME_EMPRESARIAL_LOCADOR}}</strong></div>
      <div>{{NOME_FANTASIA_LOCADOR}} – CNPJ: {{CNPJ_LOCADOR}}</div>
    </div>
  </div>
  <div style="flex:1; text-align:center;">
    <div style="border-top:1px solid #000; padding-top:6px;">
      <div><strong>{{NOME_CONTRATANTE}}</strong></div>
      <div>CPF: {{CPF}}</div>
    </div>
  </div>
</div>
`;

// ================================================================
// TEMPLATE PJ — CABINE FOTOGRÁFICA
// ================================================================

export const TEMPLATE_CABINE_PJ = `
<div class="contrato-titulo">CONTRATO DE LOCAÇÃO DE BEM MÓVEL E OUTRAS AVENÇAS</div>

<p>Contrato de Locação de Bem Móvel e Outras Avenças que entre si celebram, de um lado, <strong>{{NOME_EMPRESARIAL_LOCADOR}}</strong>, Nome Fantasia <strong>{{NOME_FANTASIA_LOCADOR}}</strong>, inscrito no CNPJ <strong>{{CNPJ_LOCADOR}}</strong>, localizada a <strong>{{ENDERECO_LOCADOR}}</strong>, doravante designada <strong>"LOCADOR"</strong>, e, de outro lado a empresa <strong>{{RAZAO_SOCIAL}}</strong>, inscrita no CNPJ: <strong>{{CNPJ}}</strong>, com sede em <strong>{{ENDERECO_EMPRESA}}</strong>, neste ato representada por seu representante legal <strong>{{RESPONSAVEL_CONTRATO}}</strong>, DORAVANTE denominada <strong>"LOCATÁRIO"</strong>. CONSIDERANDO que a relação entre as partes se dará com total independência técnico-operacional, sem obrigações de exclusividade e/ou de dependência econômica, e que as partes declaram não ser de seu interesse manter um vínculo de subordinação com a outra parte; CONSIDERANDO o processo de negociação ocorrido entre as partes, baseado nos princípios da ética e boa-fé na condução dos negócios bem como nas práticas de mercado, no qual foram discutidas as necessidades e definido o escopo desta prestação de serviços; CONSIDERANDO que todas as fotografias são retiradas por via da CABINE, objeto desta locação, sendo o LOCADOR o detentor dos direitos autorais, conforme dispõe a Lei 9.610/98.</p>

<p>RESOLVEM celebrar o presente <strong>CONTRATO DE LOCAÇÃO DE BEM MÓVEL E OUTRAS AVENÇAS</strong>, o qual será regido pelas cláusulas seguintes:</p>

<p><strong>CLÁUSULA 1ª - Do Objeto</strong> – O presente contrato tem por objeto a locação de uma <strong>CABINE FOTOGRÁFICA</strong> e seus equipamentos, de propriedade do LOCADOR pelo tempo de <strong>{{QUANTIDADE_HORAS}}</strong>, com início da sessão de FOTOS AS <strong>{{HORARIO_INICIO_FOTOS}}</strong>, no evento <strong>{{NOME_EVENTO}}</strong> a ser realizado no dia <strong>{{DATA_EVENTO}}</strong>, Localizado <strong>{{ENDERECO_EVENTO}}</strong></p>

<p>Parágrafo primeiro: A CABINE FOTOGRÁFICA é dotada dos seguintes equipamentos: 01 (uma) impressora fotográfica DNP RX1, 01 (um notebook), 01 (um) Monitor de 20 polegadas, 02 lâmpadas de LED (6 Watts cada), 01 (uma) Botoeira de comando, 01 (uma) WebCam Full HD 15MP e fiação elétrica.</p>

<p>Parágrafo segundo: O LOCATÁRIO também fará jus a um número ilimitado de fotos a serem tiradas durante o evento, bem como a cópia delas, acesso ao Google Drive com todas as fotos, apetrechos e fantasias em caráter de empréstimo durante as sessões de fotos, uma borda personalizada nas fotos.</p>

{{CLAUSULA_OPCIONAIS}}

<p><strong>CLÁUSULA 2ª - Do Valor</strong> – O LOCATÁRIO pagará ao LOCADOR, a título de aluguel pelas <strong>{{QUANTIDADE_HORAS}}</strong> de locação da CABINE FOTOGRÁFICA, mais os serviços listados acima, o valor de <strong>{{VALOR_TOTAL}}</strong> (<strong>{{VALOR_TOTAL_EXTENSO}}</strong>) no LAYOUT <strong>{{PACOTE}}</strong>.</p>

<p>Parágrafo primeiro – Forma de pagamento: <strong>{{FORMA_PAGAMENTO}}</strong> chave CNPJ: <strong>{{CNPJ_LOCADOR}}</strong> no valor total de <strong>{{VALOR_TOTAL}}</strong> no ato da assinatura do contrato.</p>

<p>Parágrafo segundo: O não pagamento do valor constante no caput na data nele mencionada acarretará a aplicação de multa contratual de 2% e juros de mora 1% ao mês, calculados pró rata die, em consonância com o artigo 406 do código civil brasileiro.</p>

<p>Parágrafo terceiro: Será cobrado o valor de <strong>{{VALOR_HORA_ADICIONAL}}</strong> (<strong>{{VALOR_HORA_ADICIONAL_EXTENSO}}</strong>) por cada hora adicional da CABINE FOTOGRÁFICA solicitada no evento acima descrito.</p>

<p><strong>CLÁUSULA 3ª – Da Vigência</strong> – O presente contrato vigerá após a assinatura do mesmo até o término do evento.</p>

<p><strong>CLÁUSULA 4ª – Da Extinção Contratual</strong> – Na hipótese de resilição do contrato por uma das partes será considerada devida pela parte que promover tal ato, a multa contratual de 25% do valor do contrato, caso este seja até 7 dias antes da data do evento e 50% caso a resilição seja no prazo menor que 7 dias da data do evento, além de devolução de qualquer valor já quitado por parte do LOCATÁRIO, caso a resilição não tenha sido realizada por ele.</p>

<p><strong>CLAÚSULA 5ª - Do uso</strong> - O LOCATÁRIO, detentor da posse direta do equipamento, se compromete a utilizá-lo somente para o fim estabelecido na cláusula 1ª, mantendo-o em perfeitas condições e zelando pela integridade física do (s) mesmo (s).</p>

<p>Parágrafo primeiro: O LOCATÁRIO <strong>{{AUTORIZA}}</strong> desde a assinatura deste, a publicação e disponibilização online das fotos retiradas dentro da cabine em redes sociais (facebook, instagram e site (www.cabinesoalegria.com.br)).</p>

<p><strong>CLAÚSULA 6ª - Obrigações comuns a ambas as partes</strong> - Constituem obrigações comuns às Partes, sem prejuízo das demais inerentes à locação:</p>

<p>a) Atender as obrigações pactuadas neste contrato;</p>
<p>b) Cumprir a legislação vigente, bem como preservar a outra parte de qualquer demanda ou reivindicação de sua exclusiva responsabilidade;</p>
<p>c) Respeitar o direito de propriedade intelectual e personalíssima de terceiros na consecução deste contrato;</p>
<p>d) Somente fazer uso de qualquer direito de propriedade intelectual da outra parte mediante autorização prévia e escrita desta;</p>

<p><strong>CLAÚSULA 7ª - Das Obrigações do Locador</strong> - Sem prejuízo de outras expressamente previstas neste instrumento, constituem-se obrigações do LOCADOR:</p>

<p>a) O LOCADOR se compromete a disponibilizar a CABINE FOTOGRÁFICA e os equipamentos ao LOCATÁRIO no prazo de <strong>{{QUANTIDADE_HORAS}}</strong>, no evento acima supracitado;</p>
<p>b) garantir e responsabilizar-se perante o LOCATÁRIO pelo adequado funcionamento do bem locado;</p>
<p>c) efetuar a montagem e desmontagem da CABINE FOTOGRÁFICA e demais equipamentos no evento acima descrito;</p>
<p>d) disponibilizar um funcionário para auxílio do LOCATÁRIO e seus convidados na utilização da CABINE FOTOGRÁFICA;</p>
<p>e) Prestar o serviço com pessoal devidamente capacitado e habilitado para a consecução deste contrato;</p>
<p>f) acesso ao Google Drive para o LOCATÁRIO com todas as fotos tiradas;</p>
<p>g) Não ceder ou transferir, no todo ou em parte, os serviços objeto deste contrato, sem prévia autorização por escrito por parte do LOCATÁRIO.</p>

<p><strong>CLAÚSULA 8ª - Das Obrigações do Locatário</strong> - Sem prejuízo de outras expressamente previstas neste instrumento, constituem-se obrigações do LOCATÁRIO:</p>

<p>a) disponibilizar um espaço coberto de (3m x 2m), 6 metros quadrados, próximo a um ponto de energia elétrica no salão em que será realizado o evento;</p>
<p>b) disponibilizar energia elétrica para o funcionamento da CABINE FOTOGRÁRICA e demais equipamentos;</p>
<p>c) pagar o aluguel pontualmente quando do vencimento;</p>
<p>d) responsabilizar e reparar ao LOCADOR por todos os danos causados na CABINE FOTOGRÁFICA pelo mau uso ou vandalismo do LOCATÁRIO, bem como de seus convidados ou terceiros;</p>

<p><strong>CLÁUSULA 9ª – Não vinculação</strong> – O presente Contrato não estabelecerá qualquer relação de subordinação entre o LOCADOR e o LOCATÁRIO, nem tampouco implicará em qualquer vínculo trabalhista entre as partes.</p>

<p><strong>CLÁUSULA 10ª - Força Maior</strong> - Nenhuma das partes será responsável por atraso ou falha na execução de todas ou qualquer parte do presente Contrato, caso seu desempenho venha a ser dificultado devido a um evento de Força Maior.</p>

<p><strong>CLÁUSULA 11ª - Das disposições Gerais</strong> – As situações não previstas contratualmente serão objeto de discussão entre as partes.</p>

<p><strong>CLÁUSULA 12ª – Do Foro</strong> – Para dirimir e decidir sobre dúvidas, de qualquer natureza, as partes elegem o Foro da <strong>{{FORO}}</strong>, em detrimento a qualquer outro, por mais privilegiado que seja.</p>

<br>
<p style="text-align:center"><strong>{{CIDADE_ASSINATURA}}, {{DATA_CONTRATO}}.</strong></p>
<br><br>

<div style="display:flex; justify-content:space-between; margin-top:40px; gap:40px;">
  <div style="flex:1; text-align:center;">
    <div style="border-top:1px solid #000; padding-top:6px;">
      <div><strong>{{NOME_EMPRESARIAL_LOCADOR}}</strong></div>
      <div>{{NOME_FANTASIA_LOCADOR}} – CNPJ: {{CNPJ_LOCADOR}}</div>
    </div>
  </div>
  <div style="flex:1; text-align:center;">
    <div style="border-top:1px solid #000; padding-top:6px;">
      <div><strong>{{RAZAO_SOCIAL}}</strong></div>
      <div>CNPJ: {{CNPJ}} | Rep.: {{RESPONSAVEL_CONTRATO}}</div>
    </div>
  </div>
</div>
`;

// ================================================================
// TEMPLATE — TOTEM PERSONALIZADO / PAPARAZZI (PF)
// Mesma estrutura, muda "CABINE FOTOGRÁFICA" para "TOTEM"
// ================================================================

export const TEMPLATE_TOTEM_PF = TEMPLATE_CABINE_FOTOGRARICA
  .replace(/CABINE FOTOGRÁFICA/g, 'TOTEM PERSONALIZADO')
  .replace(/CABINE FOTORÁFICA/g, 'TOTEM PERSONALIZADO')
  .replace(/CABINE FOTOGRÁRICA/g, 'TOTEM PERSONALIZADO')
  .replace(/da CABINE/g, 'do TOTEM')
  .replace(/a CABINE/g, 'o TOTEM')
  .replace(/uma CABINE/g, 'um TOTEM');

export const TEMPLATE_TOTEM_PJ = TEMPLATE_CABINE_PJ
  .replace(/CABINE FOTOGRÁFICA/g, 'TOTEM PERSONALIZADO')
  .replace(/CABINE FOTORÁFICA/g, 'TOTEM PERSONALIZADO')
  .replace(/CABINE FOTOGRÁRICA/g, 'TOTEM PERSONALIZADO')
  .replace(/da CABINE/g, 'do TOTEM')
  .replace(/a CABINE/g, 'o TOTEM')
  .replace(/uma CABINE/g, 'um TOTEM');

export const TEMPLATE_TOTEM_RETRO_PF = TEMPLATE_CABINE_FOTOGRARICA
  .replace(/CABINE FOTOGRÁFICA/g, 'TOTEM RETRÔ')
  .replace(/CABINE FOTORÁFICA/g, 'TOTEM RETRÔ')
  .replace(/CABINE FOTOGRÁRICA/g, 'TOTEM RETRÔ')
  .replace(/da CABINE/g, 'do TOTEM')
  .replace(/a CABINE/g, 'o TOTEM')
  .replace(/uma CABINE/g, 'um TOTEM RETRÔ');

export const TEMPLATE_PAPARAZZI_PF = TEMPLATE_CABINE_FOTOGRARICA
  .replace(/CABINE FOTOGRÁFICA/g, 'CABINE PAPARAZZI')
  .replace(/CABINE FOTORÁFICA/g, 'CABINE PAPARAZZI')
  .replace(/CABINE FOTOGRÁRICA/g, 'CABINE PAPARAZZI')
  .replace(/da CABINE/g, 'da CABINE PAPARAZZI')
  .replace(/a CABINE,/g, 'a CABINE PAPARAZZI,');

export const TEMPLATE_PAPARAZZI_PJ = TEMPLATE_CABINE_PJ
  .replace(/CABINE FOTOGRÁFICA/g, 'CABINE PAPARAZZI')
  .replace(/CABINE FOTORÁFICA/g, 'CABINE PAPARAZZI')
  .replace(/CABINE FOTOGRÁRICA/g, 'CABINE PAPARAZZI')
  .replace(/da CABINE/g, 'da CABINE PAPARAZZI');

// ─── Mapa de templates por equipamento e tipo de pessoa ────────

export type TipoEquipamento = 'cabine' | 'totem' | 'totem_retro' | 'paparazzi';

export function detectarTipoEquipamento(nomeEquipamento: string): TipoEquipamento {
  const n = (nomeEquipamento || '').toLowerCase();
  if (n.includes('retr')) return 'totem_retro';
  if (n.includes('totem')) return 'totem';
  if (n.includes('paparazzi')) return 'paparazzi';
  return 'cabine';
}

export function getTemplatePadrao(tipo: TipoEquipamento, tipoPessoa: 'PF' | 'PJ'): string {
  if (tipoPessoa === 'PJ') {
    if (tipo === 'totem' || tipo === 'totem_retro') return TEMPLATE_TOTEM_PJ;
    if (tipo === 'paparazzi') return TEMPLATE_PAPARAZZI_PJ;
    return TEMPLATE_CABINE_PJ;
  }
  // PF
  if (tipo === 'totem') return TEMPLATE_TOTEM_PF;
  if (tipo === 'totem_retro') return TEMPLATE_TOTEM_RETRO_PF;
  if (tipo === 'paparazzi') return TEMPLATE_PAPARAZZI_PF;
  return TEMPLATE_CABINE_FOTOGRARICA;
}

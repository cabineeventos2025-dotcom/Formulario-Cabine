// ================================================================
// Template HTML do Contrato de Cabine Fotográfica
// Baseado no contrato: Luana Maria Lopes Alves, 10/07/2026
// ================================================================

export const TEMPLATE_CABINE_FOTOGRARICA = `
<div class="contrato-page">
  <div class="contrato-titulo">CONTRATO DE LOCAÇÃO DE BEM MÓVEL E OUTRAS AVENÇAS</div>

  <div class="contrato-corpo">
    <p>
      Contrato de Locação de Bem Móvel e Outras Avenças que entre si celebram, de um lado,
      <strong>{{NOME_EMPRESARIAL_LOCADOR}}</strong>, Nome Fantasia <strong>{{NOME_FANTASIA_LOCADOR}}</strong>,
      inscrito no CNPJ <strong>{{CNPJ_LOCADOR}}</strong>, localizada a <strong>{{ENDERECO_LOCADOR}}</strong>,
      doravante designada <strong>"LOCADOR"</strong>, e, de outro lado
      <strong>{{NOME_CONTRATANTE}}</strong>
      inscrito(a) no CPF: <strong>{{CPF}}</strong>
      residente a <strong>{{ENDERECO_CONTRATANTE}}</strong>
      DORAVANTE denominado(a) <strong>"LOCATÁRIO"</strong>.
    </p>

    <p>
      CONSIDERANDO que a relação entre as partes se dará com total independência técnico-operacional,
      sem obrigações de exclusividade e/ou de dependência econômica, e que as partes declaram não ser
      de seu interesse manter um vínculo de subordinação com a outra parte;
    </p>

    <p>
      CONSIDERANDO o processo de negociação ocorrido entre as partes, baseado nos princípios da ética
      e boa-fé na condução dos negócios bem como nas práticas de mercado, no qual foram discutidas as
      necessidades e definido o escopo desta prestação de serviços;
    </p>

    <p>
      CONSIDERANDO que todas as fotografias são retiradas por via da CABINE, objeto desta locação,
      sendo o LOCADOR o detentor dos direitos autorais, conforme dispõe a Lei 9.610/98.
    </p>

    <p>
      RESOLVEM celebrar o presente <strong>CONTRATO DE LOCAÇÃO DE BEM MÓVEL E OUTRAS AVENÇAS</strong>,
      o qual será regido pelas cláusulas seguintes:
    </p>

    <p>
      <strong>CLÁUSULA 1ª - Do Objeto</strong> – O presente contrato tem por objeto a locação de uma
      <strong>CABINE FOTOGRÁFICA</strong> e seus equipamentos, de propriedade do LOCADOR pelo tempo de
      <strong>{{QUANTIDADE_HORAS}}</strong>, com início da sessão de FOTOS ÀS <strong>{{HORARIO_INICIO_FOTOS}}</strong>,
      no evento <strong>{{NOME_EVENTO}}</strong> a ser realizado no dia <strong>{{DATA_EVENTO}}</strong>,
      Localizado <strong>{{ENDERECO_EVENTO}}</strong>
    </p>

    <p>
      Parágrafo primeiro: A CABINE FOTOGRÁFICA é dotada dos seguintes equipamentos: 01 (uma) impressora
      fotográfica DNP RX1, 01 (um) notebook, 01 (um) Monitor de 20 polegadas, 02 lâmpadas de LED (6 Watts cada),
      01 (uma) Botoeira de comando, 01 (uma) WebCam Full HD 15MP e fiação elétrica.
    </p>

    <p>
      Parágrafo segundo: O LOCATÁRIO também fará jus a um número ilimitado de fotos a serem tiradas
      durante o evento, bem como a cópia delas, acesso ao Google Drive com todas as fotos, apetrechos e
      fantasias em caráter de empréstimo durante as sessões de fotos, uma borda personalizada nas fotos.
    </p>

    <p>
      <strong>CLÁUSULA 2ª - Do Valor</strong> – O LOCATÁRIO pagará ao LOCADOR, a título de aluguel
      pelas <strong>{{QUANTIDADE_HORAS}}</strong> de locação da CABINE FOTOGRÁFICA, mais os serviços
      listados acima, o valor de <strong>{{VALOR_TOTAL}} ({{VALOR_TOTAL_EXTENSO}})</strong>
      no <strong>{{FORMATO_FOTO}}</strong>.
    </p>

    <p>
      Parágrafo primeiro – Forma de pagamento: O pagamento será via <strong>{{FORMA_PAGAMENTO}}</strong>
      chave <strong>{{TIPO_CHAVE_PIX}}: {{CHAVE_PIX}}</strong> no valor total de
      <strong>{{VALOR_TOTAL}}</strong> no ato da assinatura do contrato.
    </p>

    <p>
      Parágrafo segundo: O não pagamento do valor constante no caput na data nele mencionada acarretará
      a aplicação de multa contratual de 2% e juros de mora 1% ao mês, calculados pró rata die,
      em consonância com o artigo 406 do código civil brasileiro.
    </p>

    <p>
      Parágrafo terceiro: Será cobrado o valor de <strong>{{VALOR_HORA_ADICIONAL}} ({{VALOR_HORA_ADICIONAL_EXTENSO}})</strong>
      por cada hora adicional da CABINE FOTOGRÁFICA solicitada no evento acima descrito.
    </p>

    {{CLAUSULA_OPCIONAIS}}

    <p>
      <strong>CLÁUSULA 3ª – Da Vigência</strong> – O presente contrato vigerá após a assinatura do mesmo
      até o término do evento.
    </p>

    <p>
      <strong>CLÁUSULA 4ª – Da Extinção Contratual</strong> – Na hipótese de resilição do contrato por
      uma das partes será considerada devida pela parte que promover tal ato, a multa contratual de 25%
      do valor do contrato, caso este seja até 7 dias antes da data do evento e 50% caso a resilição seja
      no prazo menor que 7 dias da data do evento, além de devolução de qualquer valor já quitado por
      parte do LOCATÁRIO, caso a resilição não tenha sido realizada por ele.
    </p>

    <p>
      <strong>CLÁUSULA 5ª - Do Uso</strong> - O LOCATÁRIO, detentor da posse direta do equipamento,
      se compromete a utilizá-lo somente para o fim estabelecido na cláusula 1ª, mantendo-o em perfeitas
      condições e zelando pela integridade física do(s) mesmo(s).
    </p>

    <p>
      Parágrafo primeiro: O LOCATÁRIO &nbsp;&nbsp;&nbsp; {{AUTORIZACAO_PUBLICACAO}} &nbsp;&nbsp;&nbsp;
      desde a assinatura deste, a publicação e disponibilização online das fotos retiradas dentro da cabine
      em redes sociais (facebook, instagram e site ({{WEBSITE}})).
    </p>

    <p>
      <strong>CLÁUSULA 6ª - Obrigações comuns a ambas as partes</strong> - Constituem obrigações comuns
      às Partes, sem prejuízo das demais inerentes à locação:
    </p>

    <p class="alinea">a) Atender as obrigações pactuadas neste contrato;</p>
    <p class="alinea">b) Cumprir a legislação vigente, bem como preservar a outra parte de qualquer
      demanda ou reivindicação de sua exclusiva responsabilidade;</p>
    <p class="alinea">c) Respeitar o direito de propriedade intelectual e personalíssima de terceiros
      na consecução deste contrato, mantendo a outra parte a salvo de reclamações, bem como resguardada
      de quaisquer responsabilidades pelo uso indevido de marcas e patentes, segredos industriais, inventos,
      logomarcas, logotipos, desenhos, métodos, direitos autorais, direitos de imagem e conexos e outros
      direitos de propriedade intelectual previstos na legislação em vigor;</p>
    <p class="alinea">d) Somente fazer uso de qualquer direito de propriedade intelectual da outra parte,
      incluindo, mas não se limitando a marcas e patentes, mediante autorização prévia e escrita desta,
      atendendo de forma restrita à finalidade específica a que se destina;</p>

    <p>
      <strong>CLÁUSULA 7ª - Das Obrigações do Locador</strong> - Sem prejuízo de outras expressamente
      previstas neste instrumento, constituem-se obrigações do LOCADOR:
    </p>

    <p class="alinea">a) O LOCADOR se compromete a disponibilizar a CABINE FOTOGRÁFICA e os equipamentos
      ao LOCATÁRIO no prazo de <strong>{{QUANTIDADE_HORAS}}</strong>, no evento acima supracitado;</p>
    <p class="alinea">b) garantir e responsabilizar-se perante o LOCATÁRIO pelo adequado funcionamento
      do bem locado;</p>
    <p class="alinea">c) efetuar a montagem e desmontagem da CABINE FOTOGRÁFICA e demais equipamentos
      no evento acima descrito;</p>
    <p class="alinea">d) disponibilizar um funcionário para auxílio do LOCATÁRIO e seus convidados
      na utilização da CABINE FOTOGRÁFICA;</p>
    <p class="alinea">e) Prestar o serviço com pessoal devidamente capacitado e habilitado para a
      consecução deste contrato, de acordo com a melhor técnica;</p>
    <p class="alinea">f) responsabilizar-se perante o LOCATÁRIO por toda e quaisquer orientações e/ou
      recomendações relacionadas às providências e/ou especificações técnicas e que sejam necessárias
      à instalação dos equipamentos e seu manuseio;</p>
    <p class="alinea">g) acesso ao Google Drive para o LOCATÁRIO com todas as fotos tiradas;</p>
    <p class="alinea">h) entregar todas as fotos tiradas durante o evento para o LOCATÁRIO ou para
      seus convidados;</p>
    <p class="alinea">i) Não ceder ou transferir, no todo ou em parte, os serviços objeto deste contrato,
      sem prévia autorização por escrito por parte do LOCATÁRIO.</p>
    <p class="alinea">j) Entregar uma foto por adulto (maior que 12 anos de idade) a cada final de
      sessão de fotos.</p>
    <p class="alinea">k) Menores de 12 anos só poderão tirar foto acompanhados de um responsável,
      respeitando o item (j).</p>

    <p>
      <strong>CLÁUSULA 8ª - Das Obrigações do Locatário</strong> - Sem prejuízo de outras expressamente
      previstas neste instrumento, constituem-se obrigações do LOCATÁRIO:
    </p>

    <p class="alinea">a) disponibilizar um espaço coberto de (3m x 2m), 6 metros quadrados, próximo
      a um ponto de energia elétrica no salão em que será realizado o evento;</p>
    <p class="alinea">b) disponibilizar energia elétrica para o funcionamento da CABINE FOTOGRÁFICA
      e demais equipamentos;</p>
    <p class="alinea">c) pagar o aluguel pontualmente quando do vencimento, bem como responder por
      todas as despesas assumidas neste instrumento e por aquelas que derem causa;</p>
    <p class="alinea">d) responsabilizar e reparar ao LOCADOR por todos os danos causados na CABINE
      FOTOGRÁFICA bem como de qualquer equipamento dela constante, os quais estão devidamente descritos
      na Cláusula Primeira, pelo mau uso ou vandalismo do LOCATÁRIO, bem como de seus convidados
      ou terceiros;</p>
    <p class="alinea">e) além da reparação pelos danos materiais causados pela má utilização ou
      hostilidade da CABINE FOTOGRÁFICA pelo mau uso ou vandalismo do LOCATÁRIO, convidados ou terceiros,
      fica desde já pactuado que também haverá a reparação civil pelos lucros cessantes do LOCADOR.</p>

    <p>
      <strong>CLÁUSULA 9ª – Não vinculação</strong> – O presente Contrato não estabelecerá, de forma
      alguma, qualquer relação de subordinação entre o LOCADOR e o LOCATÁRIO, nem tampouco implicará
      em qualquer vínculo trabalhista entre as partes.
    </p>

    <p>
      Parágrafo primeiro: O presente contrato é de natureza estritamente civil, não se estabelecendo
      qualquer vínculo empregatício ou responsabilidade do LOCATÁRIO em relação ao LOCADOR e o pessoal
      que este venha a empregar na execução dos serviços ora contratados, correndo por conta exclusiva
      do LOCADOR todas as despesas e encargos trabalhistas, sociais e previdenciários.
    </p>

    <p>
      <strong>CLÁUSULA 10ª - Força Maior</strong> - Nenhuma das partes será responsável por atraso ou
      falha na execução de todas ou qualquer parte do presente Contrato, caso seu desempenho venha a ser
      dificultado devido a um evento de Força Maior. Força Maior, tal como é utilizada no presente
      Contrato, entende-se qualquer forma e as circunstâncias além do controle das PARTES, tal como
      estabelecido no artigo 393 do código civil brasileiro, o que impede o desempenho total ou parcial
      das obrigações decorrentes do presente Contrato pela parte ou partes afetadas.
    </p>

    <p>
      Parágrafo único: Se houver um evento de Força Maior o tempo estipulado para o cumprimento das
      obrigações das partes afetadas deve ser prorrogado ou suspenso por um período igual ao da duração
      desse evento ou circunstância, sem qualquer responsabilidade, desde que comunicado em tempo hábil.
      A parte não deve ser responsabilizada perante a outra pelos prejuízos causados pela ocorrência de
      um evento de Força Maior. Em caso de Força Maior, as PARTES devem se comunicar imediatamente para
      encontrar uma solução equitativa e devem envidar todos os esforços para minimizar as consequências
      do evento de Força Maior.
    </p>

    <p>
      <strong>CLÁUSULA 11ª - Das Disposições Gerais</strong> – As situações não previstas contratualmente
      serão objeto de discussão entre as partes, de forma a viabilizar pelo senso comum, soluções que
      atendam aos interesses de ambas as partes. Caso elas não cheguem a um consenso, eventuais
      controvérsias serão resolvidas nos termos da legislação civil aplicável.
    </p>

    <p>
      <strong>CLÁUSULA 12ª – Do Foro</strong> – Para dirimir e decidir sobre dúvidas, de qualquer
      natureza, as partes elegem o Foro da <strong>{{FORO}}</strong>, em detrimento a qualquer outro,
      por mais privilegiado que seja.
    </p>

    <div class="contrato-local-data">
      {{CIDADE_ASSINATURA}}, {{DATA_CONTRATO}}.
    </div>

    <div class="contrato-assinaturas">
      <div class="assinatura-bloco">
        <div class="assinatura-linha"></div>
        <div class="assinatura-nome">{{NOME_EMPRESARIAL_LOCADOR}}</div>
        <div class="assinatura-detalhe">{{NOME_FANTASIA_LOCADOR}} – CNPJ: {{CNPJ_LOCADOR}}</div>
      </div>
      <div class="assinatura-bloco">
        <div class="assinatura-linha"></div>
        <div class="assinatura-nome">{{NOME_CONTRATANTE}}</div>
        <div class="assinatura-detalhe">CPF: {{CPF}}</div>
      </div>
    </div>
  </div>
</div>
`;

export const TEMPLATE_CABINE_PJ = `
<div class="contrato-page">
  <div class="contrato-titulo">CONTRATO DE LOCAÇÃO DE BEM MÓVEL E OUTRAS AVENÇAS</div>

  <div class="contrato-corpo">
    <p>
      Contrato de Locação de Bem Móvel e Outras Avenças que entre si celebram, de um lado,
      <strong>{{NOME_EMPRESARIAL_LOCADOR}}</strong>, Nome Fantasia <strong>{{NOME_FANTASIA_LOCADOR}}</strong>,
      inscrito no CNPJ <strong>{{CNPJ_LOCADOR}}</strong>, localizada a <strong>{{ENDERECO_LOCADOR}}</strong>,
      doravante designada <strong>"LOCADOR"</strong>, e, de outro lado
      <strong>{{RAZAO_SOCIAL}}</strong>, Nome Fantasia <strong>{{NOME_FANTASIA}}</strong>,
      inscrita no CNPJ: <strong>{{CNPJ}}</strong>,
      representada neste ato por <strong>{{RESPONSAVEL_CONTRATO}}</strong>,
      localizada a <strong>{{ENDERECO_CONTRATANTE}}</strong>,
      DORAVANTE denominado(a) <strong>"LOCATÁRIO"</strong>.
    </p>

    <p>
      CONSIDERANDO que a relação entre as partes se dará com total independência técnico-operacional,
      sem obrigações de exclusividade e/ou de dependência econômica, e que as partes declaram não ser
      de seu interesse manter um vínculo de subordinação com a outra parte;
    </p>

    <p>
      CONSIDERANDO o processo de negociação ocorrido entre as partes, baseado nos princípios da ética
      e boa-fé na condução dos negócios bem como nas práticas de mercado, no qual foram discutidas as
      necessidades e definido o escopo desta prestação de serviços;
    </p>

    <p>
      CONSIDERANDO que todas as fotografias são retiradas por via da CABINE, objeto desta locação,
      sendo o LOCADOR o detentor dos direitos autorais, conforme dispõe a Lei 9.610/98.
    </p>

    <p>
      RESOLVEM celebrar o presente <strong>CONTRATO DE LOCAÇÃO DE BEM MÓVEL E OUTRAS AVENÇAS</strong>,
      o qual será regido pelas cláusulas seguintes:
    </p>

    <p>
      <strong>CLÁUSULA 1ª - Do Objeto</strong> – O presente contrato tem por objeto a locação de uma
      <strong>CABINE FOTOGRÁFICA</strong> e seus equipamentos, de propriedade do LOCADOR pelo tempo de
      <strong>{{QUANTIDADE_HORAS}}</strong>, com início da sessão de FOTOS ÀS <strong>{{HORARIO_INICIO_FOTOS}}</strong>,
      no evento <strong>{{NOME_EVENTO}}</strong> a ser realizado no dia <strong>{{DATA_EVENTO}}</strong>,
      Localizado <strong>{{ENDERECO_EVENTO}}</strong>
    </p>

    <p>
      Parágrafo primeiro: A CABINE FOTOGRÁFICA é dotada dos seguintes equipamentos: 01 (uma) impressora
      fotográfica DNP RX1, 01 (um) notebook, 01 (um) Monitor de 20 polegadas, 02 lâmpadas de LED (6 Watts cada),
      01 (uma) Botoeira de comando, 01 (uma) WebCam Full HD 15MP e fiação elétrica.
    </p>

    <p>
      Parágrafo segundo: O LOCATÁRIO também fará jus a um número ilimitado de fotos a serem tiradas
      durante o evento, bem como a cópia delas, acesso ao Google Drive com todas as fotos, apetrechos e
      fantasias em caráter de empréstimo durante as sessões de fotos, uma borda personalizada nas fotos.
    </p>

    <p>
      <strong>CLÁUSULA 2ª - Do Valor</strong> – O LOCATÁRIO pagará ao LOCADOR, a título de aluguel
      pelas <strong>{{QUANTIDADE_HORAS}}</strong> de locação da CABINE FOTOGRÁFICA, mais os serviços
      listados acima, o valor de <strong>{{VALOR_TOTAL}} ({{VALOR_TOTAL_EXTENSO}})</strong>
      no <strong>{{FORMATO_FOTO}}</strong>.
    </p>

    <p>
      Parágrafo primeiro – Forma de pagamento: O pagamento será via <strong>{{FORMA_PAGAMENTO}}</strong>
      chave <strong>{{TIPO_CHAVE_PIX}}: {{CHAVE_PIX}}</strong> no valor total de
      <strong>{{VALOR_TOTAL}}</strong> no ato da assinatura do contrato.
    </p>

    <p>
      Parágrafo segundo: O não pagamento do valor constante no caput na data nele mencionada acarretará
      a aplicação de multa contratual de 2% e juros de mora 1% ao mês, calculados pró rata die,
      em consonância com o artigo 406 do código civil brasileiro.
    </p>

    <p>
      Parágrafo terceiro: Será cobrado o valor de <strong>{{VALOR_HORA_ADICIONAL}} ({{VALOR_HORA_ADICIONAL_EXTENSO}})</strong>
      por cada hora adicional da CABINE FOTOGRÁFICA solicitada no evento acima descrito.
    </p>

    {{CLAUSULA_OPCIONAIS}}

    <p>
      <strong>CLÁUSULA 3ª – Da Vigência</strong> – O presente contrato vigerá após a assinatura do mesmo
      até o término do evento.
    </p>

    <p>
      <strong>CLÁUSULA 4ª – Da Extinção Contratual</strong> – Na hipótese de resilição do contrato por
      uma das partes será considerada devida pela parte que promover tal ato, a multa contratual de 25%
      do valor do contrato, caso este seja até 7 dias antes da data do evento e 50% caso a resilição seja
      no prazo menor que 7 dias da data do evento, além de devolução de qualquer valor já quitado por
      parte do LOCATÁRIO, caso a resilição não tenha sido realizada por ele.
    </p>

    <p>
      <strong>CLÁUSULA 5ª - Do Uso</strong> - O LOCATÁRIO, detentor da posse direta do equipamento,
      se compromete a utilizá-lo somente para o fim estabelecido na cláusula 1ª, mantendo-o em perfeitas
      condições e zelando pela integridade física do(s) mesmo(s).
    </p>

    <p>
      Parágrafo primeiro: O LOCATÁRIO &nbsp;&nbsp;&nbsp; {{AUTORIZACAO_PUBLICACAO}} &nbsp;&nbsp;&nbsp;
      desde a assinatura deste, a publicação e disponibilização online das fotos retiradas dentro da cabine
      em redes sociais (facebook, instagram e site ({{WEBSITE}})).
    </p>

    <p>
      <strong>CLÁUSULA 6ª - Obrigações comuns a ambas as partes</strong> - Constituem obrigações comuns
      às Partes, sem prejuízo das demais inerentes à locação:
    </p>

    <p class="alinea">a) Atender as obrigações pactuadas neste contrato;</p>
    <p class="alinea">b) Cumprir a legislação vigente, bem como preservar a outra parte de qualquer
      demanda ou reivindicação de sua exclusiva responsabilidade;</p>
    <p class="alinea">c) Respeitar o direito de propriedade intelectual e personalíssima de terceiros
      na consecução deste contrato;</p>
    <p class="alinea">d) Somente fazer uso de qualquer direito de propriedade intelectual da outra parte
      mediante autorização prévia e escrita desta;</p>

    <p>
      <strong>CLÁUSULA 7ª - Das Obrigações do Locador</strong> - Sem prejuízo de outras expressamente
      previstas neste instrumento, constituem-se obrigações do LOCADOR:
    </p>

    <p class="alinea">a) O LOCADOR se compromete a disponibilizar a CABINE FOTOGRÁFICA e os equipamentos ao LOCATÁRIO no prazo de <strong>{{QUANTIDADE_HORAS}}</strong>, no evento acima supracitado;</p>
    <p class="alinea">b) garantir e responsabilizar-se perante o LOCATÁRIO pelo adequado funcionamento do bem locado;</p>
    <p class="alinea">c) efetuar a montagem e desmontagem da CABINE FOTOGRÁFICA e demais equipamentos no evento acima descrito;</p>
    <p class="alinea">d) disponibilizar um funcionário para auxílio do LOCATÁRIO e seus convidados na utilização da CABINE FOTOGRÁFICA;</p>
    <p class="alinea">e) Prestar o serviço com pessoal devidamente capacitado e habilitado;</p>
    <p class="alinea">f) responsabilizar-se perante o LOCATÁRIO por toda e quaisquer orientações técnicas necessárias à instalação dos equipamentos e seu manuseio;</p>
    <p class="alinea">g) acesso ao Google Drive para o LOCATÁRIO com todas as fotos tiradas;</p>
    <p class="alinea">h) entregar todas as fotos tiradas durante o evento para o LOCATÁRIO ou para seus convidados;</p>
    <p class="alinea">i) Não ceder ou transferir os serviços sem prévia autorização por escrito do LOCATÁRIO.</p>
    <p class="alinea">j) Entregar uma foto por adulto (maior que 12 anos de idade) a cada final de sessão de fotos.</p>
    <p class="alinea">k) Menores de 12 anos só poderão tirar foto acompanhados de um responsável, respeitando o item (j).</p>

    <p>
      <strong>CLÁUSULA 8ª - Das Obrigações do Locatário</strong>:
    </p>
    <p class="alinea">a) disponibilizar um espaço coberto de (3m x 2m), próximo a um ponto de energia elétrica;</p>
    <p class="alinea">b) disponibilizar energia elétrica para o funcionamento da CABINE FOTOGRÁFICA;</p>
    <p class="alinea">c) pagar o aluguel pontualmente;</p>
    <p class="alinea">d) responsabilizar e reparar ao LOCADOR por todos os danos causados na CABINE FOTOGRÁFICA pelo mau uso ou vandalismo do LOCATÁRIO, bem como de seus convidados ou terceiros;</p>
    <p class="alinea">e) além da reparação pelos danos materiais, haverá a reparação civil pelos lucros cessantes do LOCADOR.</p>

    <p>
      <strong>CLÁUSULA 9ª – Não vinculação</strong> – O presente Contrato não estabelecerá qualquer
      relação de subordinação entre as partes, nem tampouco implicará em qualquer vínculo trabalhista.
    </p>

    <p>
      <strong>CLÁUSULA 10ª - Força Maior</strong> - Nenhuma das partes será responsável por atraso ou
      falha na execução de qualquer parte do presente Contrato causado por evento de Força Maior,
      conforme artigo 393 do Código Civil Brasileiro.
    </p>

    <p>
      <strong>CLÁUSULA 11ª - Das Disposições Gerais</strong> – As situações não previstas serão
      objeto de discussão entre as partes. Caso não cheguem a consenso, as controvérsias serão
      resolvidas nos termos da legislação civil aplicável.
    </p>

    <p>
      <strong>CLÁUSULA 12ª – Do Foro</strong> – As partes elegem o Foro da <strong>{{FORO}}</strong>.
    </p>

    <div class="contrato-local-data">
      {{CIDADE_ASSINATURA}}, {{DATA_CONTRATO}}.
    </div>

    <div class="contrato-assinaturas">
      <div class="assinatura-bloco">
        <div class="assinatura-linha"></div>
        <div class="assinatura-nome">{{NOME_EMPRESARIAL_LOCADOR}}</div>
        <div class="assinatura-detalhe">{{NOME_FANTASIA_LOCADOR}} – CNPJ: {{CNPJ_LOCADOR}}</div>
      </div>
      <div class="assinatura-bloco">
        <div class="assinatura-linha"></div>
        <div class="assinatura-nome">{{RAZAO_SOCIAL}}</div>
        <div class="assinatura-detalhe">CNPJ: {{CNPJ}} – Rep.: {{RESPONSAVEL_CONTRATO}}</div>
      </div>
    </div>
  </div>
</div>
`;

/** Marcadores obrigatórios comuns */
export const MARCADORES_OBRIGATORIOS_PF = [
  'NOME_CONTRATANTE', 'CPF', 'ENDERECO_CONTRATANTE',
  'NOME_EVENTO', 'DATA_EVENTO', 'HORARIO_INICIO_FOTOS', 'ENDERECO_EVENTO',
  'QUANTIDADE_HORAS', 'VALOR_TOTAL', 'VALOR_TOTAL_EXTENSO',
  'FORMA_PAGAMENTO', 'CHAVE_PIX',
  'VALOR_HORA_ADICIONAL', 'VALOR_HORA_ADICIONAL_EXTENSO',
  'AUTORIZACAO_PUBLICACAO',
  'CIDADE_ASSINATURA', 'DATA_CONTRATO',
];

export const MARCADORES_OBRIGATORIOS_PJ = [
  'RAZAO_SOCIAL', 'CNPJ', 'RESPONSAVEL_CONTRATO', 'ENDERECO_CONTRATANTE',
  'NOME_EVENTO', 'DATA_EVENTO', 'HORARIO_INICIO_FOTOS', 'ENDERECO_EVENTO',
  'QUANTIDADE_HORAS', 'VALOR_TOTAL', 'VALOR_TOTAL_EXTENSO',
  'FORMA_PAGAMENTO', 'CHAVE_PIX',
  'VALOR_HORA_ADICIONAL', 'VALOR_HORA_ADICIONAL_EXTENSO',
  'AUTORIZACAO_PUBLICACAO',
  'CIDADE_ASSINATURA', 'DATA_CONTRATO',
];

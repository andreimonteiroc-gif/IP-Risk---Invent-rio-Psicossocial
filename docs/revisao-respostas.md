# Revisão das respostas

Esta etapa permite conferir as 31 respostas e corrigir qualquer uma delas. Não há confirmação final, envio, backend ou pontuação psicométrica.

## 1. Arquivos

Criados:

- `src/state/QuestionnaireContext.js`: Provider e hook do estado compartilhado.
- `src/data/questionnaireReview.js`: agrupamentos, validação de alternativas e contagens.
- `src/components/ReviewBlock.js`: cartão expansível com perguntas e respostas.
- `src/screens/ReviewScreen.js`: tela de revisão e indicação de pendências.
- `src/app/review.js`: rota `/review` do Expo Router.
- `tests/helpers.cjs`: execução dos componentes com substitutos do runtime para os testes.
- `tests/review.test.cjs`: testes da revisão e da integração com o questionário.
- `src/hooks/useFlowNavigation.js`: trava imediata de navegação e reaproveitamento de rotas existentes.
- `tests/navigation.test.cjs`: regressões de navegação com o redutor do Expo Router instalado.
- `tsconfig.json`: checagem estrita dos arquivos JavaScript de `src` com JSDoc.
- `docs/revisao-respostas.md`: esta explicação e roteiro de validação.

Modificados:

- `src/app/_layout.js`: envolve as rotas no Provider.
- `src/screens/QuestionnaireScreen.js`: usa respostas compartilhadas, abre a revisão na Q31 e oferece o modo de correção.
- `src/screens/QuestionnaireGuidanceScreen.js`: distingue retomar o questionário de iniciar uma nova participação, que apaga explicitamente as respostas.
- `tests/questionnaire.test.cjs`: reaproveita o helper e verifica a abertura da revisão real.
- `package.json` e `package-lock.json`: scripts de teste/checagem e declaração explícita de TypeScript e tipos do React como dependências de desenvolvimento, nas versões já instaladas.

`ScreenButton`, `ScreenLayout` e `QuestionCard` foram reutilizados sem novas alterações nesta implementação. Já havia arquivos modificados e não rastreados no diretório antes do trabalho; essas alterações foram preservadas. `src/data/questions.js` permaneceu intacto.

## 2. Armazenamento e compartilhamento

O objeto `answers` associa cada ID à alternativa escolhida, por exemplo:

```js
{ Q1: 'Sempre', Q23: 'Boa', Q31: 'Não' }
```

`useState` guarda o objeto no `QuestionnaireProvider`. O Provider está acima do navegador em `_layout.js`, por isso continua montado quando as telas mudam. `useQuestionnaire()` usa `useContext` para permitir que questionário e revisão leiam o mesmo objeto.

O índice `currentIndex` também fica no Provider. Consultar as orientações e remontar a tela de questionário preserva a posição anterior. Corrigir uma questão usa o parâmetro `questionId`, sem alterar esse índice do percurso normal.

`selectAnswer(id, answer)` procura a pergunta e aceita somente alternativas oficiais. A atualização `setAnswers(previous => ({ ...previous, [id]: answer }))` cria um novo objeto, copia as respostas anteriores e substitui apenas a questão escolhida. O React atualiza as telas que consomem esse contexto.

Somente a memória é utilizada: sair de uma tela não apaga as respostas, mas encerrar/recarregar o aplicativo apaga. **Retomar questionário** preserva as respostas e a posição. **Iniciar nova participação (apagar respostas)** ou **Fechar** nas orientações, questionário ou revisão limpa respostas e posição. Não há gravação em disco nem respostas na URL.

## 3. Navegação para corrigir

1. Na Q31 respondida, **Revisar respostas** abre `/review`: reutiliza a rota com `dismissTo` se ela já estiver na pilha, ou usa `push` quando não existir.
2. Tocar no cabeçalho de um bloco mostra suas perguntas. Tocar em uma pergunta chama `router.push` para `/questionnaire`, com `questionId` e `fromReview: 'true'`.
3. `useLocalSearchParams` lê os parâmetros. A mesma `QuestionnaireScreen` encontra a pergunta com `findIndex` e apresenta sua resposta atual.
4. A seleção atualiza o contexto imediatamente. **Concluir correção** e **Voltar à revisão** usam `router.dismissTo('/review')`, mantendo qualquer alternativa já selecionada. Não existe cancelamento da alteração.
5. Se a revisão estiver na pilha, o retorno reaproveita essa instância e seus cartões abertos. Se não estiver, `dismissTo` substitui a correção pela revisão. O destino não depende de qual tela estava imediatamente antes.

A tela original do questionário continua na Q31 abaixo da revisão no fluxo normal. **Voltar ao questionário** usa `dismissTo` com `fromReview: 'false'`: reutiliza a rota, quando presente, e remove parâmetros de correção. Se não houver questionário na pilha, substitui a revisão pela tela normal, na posição guardada no Provider (Q1 em uma sessão vazia). Parâmetros de questão desconhecidos na correção usam Q1 como fallback.

Na Q1, **Voltar** aponta diretamente às orientações. O gesto nativo de voltar pode desmontar o questionário em qualquer questão, mas o progresso permanece no Context. As orientações mostram **Retomar questionário** quando há respostas e oferecem separadamente o reinício explícito.

`useFlowNavigation` usa uma `ref` como trava: a primeira ação marca imediatamente o passo como ocupado, e qualquer segunda ação da mesma tela é ignorada. Uma renderização causada apenas por respostas não libera a trava. `useFocusEffect` com `useCallback` a libera quando a tela recebe foco novamente ou muda a questão do percurso. A perda de foco bloqueia callbacks antigos. Não há temporizador nem dependência nova.

## 4. Hooks, componentes e estruturas

- `createContext`, `useContext` e `useState`: respostas e índice compartilhados; mapa local de blocos abertos.
- `useRef`, `useCallback` e `useFocusEffect`: proteção contra comandos duplicados antes da renderização e durante uma transição. `useNavigation().getState()` verifica a presença de rotas antes de abrir uma tela.
- `useLocalSearchParams`: identifica a pergunta a corrigir, sem transportar respostas.
- `useScreenMetrics`: reaproveita escala e dimensões do layout existente.
- `ScreenLayout`: reaproveita `ScrollView`, áreas seguras, espaçamento inferior e fundo.
- `ScreenButton` e `QuestionCard`: mantêm os componentes já utilizados pelo questionário.
- `ReviewBlock`: usa `Pressable`, `Text`, `View` e `StyleSheet`; expõe estado expandido e textos de acessibilidade. Os cartões não dependem somente da cor para indicar pendência.
- `Set`: obtém os nomes únicos das dimensões, na ordem do cadastro.
- `map`: cria blocos e linhas; `filter`: agrupa questões e conta respostas; `find`/`findIndex`: localizam perguntas; `includes`: valida alternativas.
- `countAnswers`, `isAnswered` e `isQuestionnaireComplete`: funções puras que consideram somente respostas válidas para questões oficiais. Não calculam escores.

Organização conferida nas páginas 27–31 do PDF fornecido, **Apêndice A**:

| Bloco | Questões | Total |
| --- | --- | --- |
| Exigências do Trabalho (Demandas) | Q1–Q4 | 4 |
| Organização e Conteúdo do Trabalho | Q5–Q8 | 4 |
| Relações Sociais e Liderança | Q9–Q16 | 8 |
| Interface Trabalho-Família e Valores Organizacionais | Q17–Q20 | 4 |
| Segurança Ocupacional (Percepção de Instabilidade) | Q21–Q22 | 2 |
| Saúde, Bem-estar e Outcomes (Nas últimas 4 semanas) | Q23–Q27 | 5 |
| Exposição no ambiente de trabalho nos últimos 12 meses | Q28–Q31 | 4 |

Uma conferência adicional encontrou no texto extraído do Apêndice A todas as perguntas, dimensões e alternativas cadastradas, normalizando apenas espaços da diagramação. As capturas do Figma orientaram cores, cartões e expansão; seus agrupamentos não substituíram os do apêndice.

## 5. Motivo da solução

São apenas 31 respostas e duas telas consumidoras. Context e estado do React resolvem o compartilhamento sem acrescentar bibliotecas de estado ou armazenamento. Reutilizar a tela de perguntas evita duas implementações de seleção de alternativas. Derivar os blocos do cadastro mantém uma única fonte para o conteúdo oficial.

TypeScript e `@types/react` foram declarados apenas como ferramentas de desenvolvimento. A aplicação continua em JavaScript; JSDoc descreve tipos e `checkJs` verifica seu uso.

## 6. Execução e testes no iPhone

Na pasta `app-mobile`, execute no PowerShell:

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd start
```

Use o iPhone e o computador na mesma rede, abra o QR code do Expo no iPhone e utilize uma versão do Expo Go compatível com o SDK 57 do projeto. Se esse SDK não estiver disponível no Expo Go instalado, será necessário um development build compatível. Não foi criada uma build assinada nesta tarefa.

Roteiro manual:

1. Percorra as telas iniciais e responda Q1–Q31. Antes de responder uma questão, confira que **Avançar/Revisar respostas** permanece desabilitado.
2. Na Q31, toque em **Revisar respostas**. Confira sete blocos e **31 de 31** respondidas.
3. Abra todos os blocos, role até o final e confira perguntas e alternativas. Teste os textos longos das Q28–Q31.
4. Corrija uma pergunta intermediária e uma binária. Confira a alternativa marcada e volte à revisão. Verifique que só essas respostas mudaram e que o bloco continua aberto.
5. Retorne à Q31 e abra a revisão novamente. Teste também o gesto nativo de voltar, com as respostas preservadas.
6. Para verificar a tela incompleta em uma sessão vazia de desenvolvimento, abra a rota `/review` por deep link usando o endereço do servidor Expo acrescido de `/--/review`. Em um development build com o scheme configurado, a rota é `inventario-psicossocial://review`. Isso depende do ambiente de desenvolvimento e não adiciona um atalho ao fluxo do participante. Confira **0 de 31**, avisos de pendência e o botão de confirmação desabilitado. Preencha uma questão pelo cartão e retorne para conferir a contagem.
7. Confira notch/Dynamic Island, indicador inferior, fontes ampliadas, VoiceOver, áreas de toque, rolagem com todos os cartões abertos e acesso aos botões inferiores em um iPhone de tela pequena.
8. Toque em **Fechar**, reinicie o fluxo e confirme que as respostas anteriores foram limpas.
9. Toque rapidamente duas vezes em **Concluir correção**, **Voltar à revisão**, numa questão da revisão e em **Revisar respostas**. Confira que há somente uma transição e que concluir não ultrapassa a revisão. Repita a correção depois de retornar, para verificar que a trava foi liberada.
10. Com respostas preenchidas, consulte as orientações pelo gesto de voltar ou pelo botão da Q1. Toque em **Retomar questionário** e confira respostas e posição. Separadamente, escolha **Iniciar nova participação (apagar respostas)** e confirme Q1 sem respostas.
11. Abra revisão e correção por deep link, com sessão vazia e com histórico diferente. Confira os destinos dos botões de retorno e que **Voltar ao questionário** sai do modo de correção. Para a correção de Q12, use `/questionnaire?questionId=Q12&fromReview=true`, adaptando o prefixo do ambiente Expo.

Os testes automatizados executam o Provider, as telas, os componentes e callbacks do projeto com substitutos de hooks, primitivas nativas e roteador. Os testes de regressão também aplicam as ações ao redutor `StackRouter` da versão instalada do Expo Router e verificam as rotas, chaves de instância e parâmetros resultantes. Foco e perda de foco são simulados; o renderer, layout e gestos nativos do iPhone não são executados. Os testes anteriores do questionário foram mantidos e atualizados.

## 7. Auditoria e limitações

- **23 testes passaram**: cadastro, sete blocos, revisão, correção, contagens, preservação do estado, bloqueio da confirmação e nove regressões de navegação, retomada e reinício.
- **ESLint completo**, incluindo `tests/`, executado por `npm.cmd run lint` (`eslint . --no-cache`). O BOM e a linha em branco excedente de `tests/questionnaire.test.cjs` foram removidos.
- **Checagem de tipos passou**, com `checkJs` e `strict` nos arquivos de `src`.
- **Bundle JavaScript para iOS passou** com `npx.cmd expo export --platform ios --no-bytecode`. Essa opção foi usada apenas na verificação; não altera a configuração do app.
- A exportação padrão com bytecode falhou porque o ambiente negou permissão de execução de `hermesc.exe`. Portanto, a geração de bytecode Hermes não foi validada.
- A primeira instalação temporária do leitor de PDF falhou por certificado TLS. A nova tentativa com o repositório de certificados do sistema funcionou, sem desabilitar a verificação TLS. O leitor ficou fora das dependências da aplicação.
- O lançador `npm.ps1` foi bloqueado pela política do PowerShell; os comandos foram executados com `npm.cmd`/`npx.cmd`, sem modificar a política do sistema.
- O Expo realizou a declaração das ferramentas de tipos em modo offline e avisou que não consultou a compatibilidade online. Foram mantidas as versões já instaladas, e a checagem estrita passou.
- O iPhone não foi operado nesta tarefa. Aparência, safe areas, gestos, VoiceOver, fontes ampliadas e toques nativos precisam do roteiro manual acima. O bundle JavaScript não substitui essa validação.
- Não há persistência após reiniciar o aplicativo, confirmação final, envio, API, banco de dados ou cálculo psicométrico. O botão **Continuar para confirmação** permanece desabilitado inclusive com 31 respostas, com explicação visível. A futura confirmação deverá também validar `isQuestionnaireComplete` na própria rota e antes de qualquer envio.
- Nenhum commit ou push foi realizado.

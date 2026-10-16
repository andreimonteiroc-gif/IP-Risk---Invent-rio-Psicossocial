// Fonte: levantamento de requisitos fornecido, Apêndice A, páginas 27–31.
// Somente transcrição e metadados; nenhuma pontuação é calculada nesta etapa.
/** @typedef {{ id: string, text: string, dimension: string, alternatives: readonly string[], polarity: 'direta' | 'inversa' | null }} Question */

const frequency = ['Sempre', 'Frequentemente', 'Às vezes', 'Raramente', 'Nunca'];
const intensity = ['Sempre/Totalmente', 'Frequentemente/Parcialmente', 'Às vezes/Pouco', 'Raramente/Quase nada', 'Nunca/Nada'];
const health = ['Excelente', 'Muito boa', 'Boa', 'Regular', 'Ruim'];
const binary = ['Sim', 'Não'];

const demands = 'Exigências do Trabalho (Demandas)';
const organization = 'Organização e Conteúdo do Trabalho';
const relations = 'Relações Sociais e Liderança';
const family = 'Interface Trabalho-Família e Valores Organizacionais';
const security = 'Segurança Ocupacional (Percepção de Instabilidade)';
const wellbeing = 'Saúde, Bem-estar e Outcomes (Nas últimas 4 semanas)';
const exposure = 'Exposição no ambiente de trabalho nos últimos 12 meses';

/** @type {readonly Question[]} */
export const questions = [
  { id: 'Q1', text: 'Você precisa trabalhar de forma muito acelerada ou rápida?', dimension: demands, alternatives: frequency, polarity: 'direta' },
  { id: 'Q2', text: 'O seu trabalho acumula por ser distribuído de forma desigual?', dimension: demands, alternatives: frequency, polarity: 'direta' },
  { id: 'Q3', text: 'O seu trabalho exige que você tome decisões difíceis?', dimension: demands, alternatives: frequency, polarity: 'direta' },
  { id: 'Q4', text: 'O seu trabalho coloca você em situações emocionalmente desgastantes?', dimension: demands, alternatives: frequency, polarity: 'direta' },
  { id: 'Q5', text: 'Você tem influência direta sobre as decisões que afetam o seu trabalho?', dimension: organization, alternatives: frequency, polarity: 'inversa' },
  { id: 'Q6', text: 'Você tem a oportunidade de aprender e se desenvolver profissionalmente?', dimension: organization, alternatives: frequency, polarity: 'inversa' },
  { id: 'Q7', text: 'O trabalho que você desenvolve tem um significado importante para você?', dimension: organization, alternatives: frequency, polarity: 'inversa' },
  { id: 'Q8', text: 'Você se sente motivado(a) e comprometido(a) com a sua instituição?', dimension: organization, alternatives: frequency, polarity: 'inversa' },
  { id: 'Q9', text: 'Você é informado(a) com antecedência adequada sobre mudanças no trabalho?', dimension: relations, alternatives: frequency, polarity: 'inversa' },
  { id: 'Q10', text: 'O seu superior ou os diretores reconhecem e valorizam o seu trabalho?', dimension: relations, alternatives: frequency, polarity: 'inversa' },
  { id: 'Q11', text: 'Há total clareza sobre quais são as suas reais tarefas e atribuições?', dimension: relations, alternatives: frequency, polarity: 'inversa' },
  { id: 'Q12', text: 'Você recebe solicitações contraditórias ou conflitantes de pessoas diferentes?', dimension: relations, alternatives: frequency, polarity: 'direta' },
  { id: 'Q13', text: 'O seu superior imediato planeja, organiza e lidera bem as atividades?', dimension: relations, alternatives: frequency, polarity: 'inversa' },
  { id: 'Q14', text: 'Há um bom clima de cooperação e companheirismo entre os colegas?', dimension: relations, alternatives: frequency, polarity: 'inversa' },
  { id: 'Q15', text: 'O seu chefe direto apoia e ouve suas preocupações profissionais?', dimension: relations, alternatives: frequency, polarity: 'inversa' },
  { id: 'Q16', text: 'Você sente orgulho de fazer parte da sua equipe/comunidade de trabalho?', dimension: relations, alternatives: frequency, polarity: 'inversa' },
  { id: 'Q17', text: 'O trabalho consome tanto tempo/energia que atrapalha sua vida pessoal?', dimension: family, alternatives: intensity, polarity: 'direta' },
  { id: 'Q18', text: 'Há uma relação de confiança real entre os gestores e os colaboradores?', dimension: family, alternatives: intensity, polarity: 'inversa' },
  { id: 'Q19', text: 'As informações compartilhadas pela instituição são transparentes e confiáveis?', dimension: family, alternatives: intensity, polarity: 'inversa' },
  { id: 'Q20', text: 'Os conflitos interpessoais no local de trabalho são resolvidos com justiça?', dimension: family, alternatives: intensity, polarity: 'inversa' },
  { id: 'Q21', text: 'Você sente medo de perder o seu atual emprego?', dimension: security, alternatives: intensity, polarity: 'direta' },
  { id: 'Q22', text: 'Tem receio de sofrer alterações indesejáveis em suas funções ou local de trabalho?', dimension: security, alternatives: intensity, polarity: 'direta' },
  { id: 'Q23', text: 'Geralmente, como você classifica sua própria saúde de maneira ampla?', dimension: wellbeing, alternatives: health, polarity: 'inversa' },
  { id: 'Q24', text: 'Com que frequência você tem se sentido física ou mentalmente esgotado(a)?', dimension: wellbeing, alternatives: intensity, polarity: 'direta' },
  { id: 'Q25', text: 'Com que frequência se sentiu tenso(a), irritado(a) ou muito estressado(a)?', dimension: wellbeing, alternatives: intensity, polarity: 'direta' },
  { id: 'Q26', text: 'Teve dificuldades de concentração ou esquecimento fora do normal?', dimension: wellbeing, alternatives: intensity, polarity: 'direta' },
  { id: 'Q27', text: 'De forma geral, você está satisfeito(a) com suas condições de trabalho atuais?', dimension: wellbeing, alternatives: intensity, polarity: 'inversa' },
  // Questões binárias não possuem polaridade psicométrica: null é intencional.
  { id: 'Q28', text: 'No seu ambiente de trabalho atual, nos últimos 12 meses, você foi exposto a fofocas, calúnias, boatos ou comentários difamatórios intencionais?', dimension: exposure, alternatives: binary, polarity: null },
  { id: 'Q29', text: 'No seu ambiente de trabalho atual, nos últimos 12 meses, você foi exposto a assédio moral continuado (humilhações recorrentes ou exclusão)?', dimension: exposure, alternatives: binary, polarity: null },
  { id: 'Q30', text: 'No seu ambiente de trabalho atual, nos últimos 12 meses, você foi exposto a ameaças verbais de agressão ou comportamentos intimidatórios físicos?', dimension: exposure, alternatives: binary, polarity: null },
  { id: 'Q31', text: 'No seu ambiente de trabalho atual, nos últimos 12 meses, você foi exposto a investidas com conotação sexual indesejadas (assédio sexual)?', dimension: exposure, alternatives: binary, polarity: null },
];

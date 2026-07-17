import * as XLSX from 'xlsx';

export const TEMPLATE_HEADERS = [
  'Nome completo',
  'E-mail',
  'Telefone',
  'WhatsApp',
  'UF',
  'Cidade',
  'Períodos livres',
  'Dias livres',
  'Área de formação',
  'Possui licenciatura',
  'Observações',
] as const;

export function downloadTalentImportTemplate() {
  const wb = XLSX.utils.book_new();

  const example = [
    'Maria da Silva',
    'maria.silva@email.com',
    '67999990000',
    'Sim',
    'MS',
    'Campo Grande',
    'Manhã; Tarde',
    'Seg; Ter; Qua; Qui; Sex',
    'Pedagogia',
    'Sim',
    'Disponível para aulas de reforço',
  ];

  const wsData = [TEMPLATE_HEADERS as unknown as string[], example];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 32 }, { wch: 28 }, { wch: 14 }, { wch: 10 },
    { wch: 6 },  { wch: 22 }, { wch: 22 }, { wch: 26 },
    { wch: 22 }, { wch: 18 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Candidatos');

  const instructions = [
    ['Banco de Talentos Docente — Modelo de Importação'],
    [],
    ['Campos obrigatórios:'],
    ['  • Nome completo (mínimo 3 caracteres)'],
    ['  • Telefone (apenas dígitos, 10 a 13 caracteres)'],
    [],
    ['Campos opcionais:'],
    ['  • E-mail (formato válido se preenchido)'],
    ['  • WhatsApp: Sim / Não  (default: Não)'],
    ['  • UF: sigla (MS, SP, RJ...) ou nome do estado'],
    ['  • Cidade: precisa pertencer à UF informada'],
    ['  • Possui licenciatura: Sim / Não  (default: Não)'],
    [],
    ['Períodos livres (separe por ; ou ,):'],
    ['  Manhã, Tarde, Noite'],
    [],
    ['Dias livres (separe por ; ou ,):'],
    ['  Seg, Ter, Qua, Qui, Sex, Sab, Dom'],
    [],
    ['Observações:'],
    ['  • PDFs (currículo, escolaridade, pós) NÃO entram aqui.'],
    ['    Devem ser anexados depois pela edição individual de cada candidato.'],
    ['  • Telefones já cadastrados serão marcados como erro (sem sobrescrever).'],
    ['  • Linhas duplicadas dentro da própria planilha também viram erro.'],
  ];
  const wsi = XLSX.utils.aoa_to_sheet(instructions);
  wsi['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsi, 'Instruções');

  XLSX.writeFile(wb, 'modelo_banco_talentos.xlsx');
}

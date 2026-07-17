import { describe, it, expect } from 'vitest';
import { PROFESSOR_DOC_TABS } from '@/features/professores/components/documents/tabsConfig';

/**
 * Trava de regressão: a paginação dos Documentos do Professor é decisão
 * oficial do produto e não pode ser alterada sem aprovação explícita.
 */
describe('PROFESSOR_DOC_TABS (paginação oficial)', () => {
  it('possui exatamente 6 abas na ordem oficial', () => {
    expect(PROFESSOR_DOC_TABS.map(t => t.value)).toEqual([
      'personal',
      'documents',
      'address',
      'banking',
      'family',
      'attachments',
    ]);
  });

  it('mantém os rótulos PT-BR oficiais', () => {
    expect(PROFESSOR_DOC_TABS.map(t => t.label)).toEqual([
      'Dados pessoais',
      'Documentos',
      'Endereço',
      'Bancário',
      'Família',
      'Anexos',
    ]);
  });

  it('é imutável em runtime (Object.freeze)', () => {
    expect(Object.isFrozen(PROFESSOR_DOC_TABS)).toBe(true);
  });
});

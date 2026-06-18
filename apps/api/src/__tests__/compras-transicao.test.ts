describe('Compras — transições de status', () => {
  const transicoesValidas: Record<string, string[]> = {
    pendente: ['aprovada', 'cancelada'],
    aprovada: ['recebida', 'cancelada'],
    recebida: [],
    cancelada: [],
  };

  function podeTranzitar(de: string, para: string) {
    return (transicoesValidas[de] ?? []).includes(para);
  }

  it('permite pendente → aprovada', () => {
    expect(podeTranzitar('pendente', 'aprovada')).toBe(true);
  });

  it('permite pendente → cancelada', () => {
    expect(podeTranzitar('pendente', 'cancelada')).toBe(true);
  });

  it('permite aprovada → recebida', () => {
    expect(podeTranzitar('aprovada', 'recebida')).toBe(true);
  });

  it('permite aprovada → cancelada', () => {
    expect(podeTranzitar('aprovada', 'cancelada')).toBe(true);
  });

  it('bloqueia pendente → recebida (pulo de status)', () => {
    expect(podeTranzitar('pendente', 'recebida')).toBe(false);
  });

  it('bloqueia recebida → qualquer status (estado final)', () => {
    expect(podeTranzitar('recebida', 'cancelada')).toBe(false);
    expect(podeTranzitar('recebida', 'aprovada')).toBe(false);
  });

  it('bloqueia cancelada → qualquer status (estado final)', () => {
    expect(podeTranzitar('cancelada', 'aprovada')).toBe(false);
    expect(podeTranzitar('cancelada', 'recebida')).toBe(false);
  });

  it('retorna false para status desconhecido', () => {
    expect(podeTranzitar('desconhecido', 'aprovada')).toBe(false);
  });
});

// Camada de persistência — um único objeto raiz em localStorage.
const STORAGE_KEY = 'correria_state';

function estadoVazio() {
  return {
    corredor: null,
    objetivos: [],
    ciclos: [],
    semanas: [],
    dias: [],
    treinos: [],
    blocos: [],
  };
}

function carregarEstado() {
  const bruto = localStorage.getItem(STORAGE_KEY);
  if (!bruto) return estadoVazio();
  try {
    return JSON.parse(bruto);
  } catch (e) {
    return estadoVazio();
  }
}

function salvarEstado(estado) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

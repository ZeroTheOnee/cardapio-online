// Pix "copia e cola" (BR Code estático com valor). Funções puras, sem dependências.

function cpfValido(d: string) {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== Number(d[n])) return false;
  }
  return true;
}

// Converte a chave como a loja digitou para o formato que o Pix exige.
// Devolve null se não reconhecer (nesse caso a tela mostra só a chave).
export function normalizarChavePix(bruta: string): string | null {
  const t = bruta.trim();
  if (!t) return null;

  if (t.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t.toLowerCase() : null;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) {
    return t.toLowerCase(); // chave aleatória
  }

  const d = t.replace(/\D/g, "");
  if (t.startsWith("+")) {
    return d.length >= 12 && d.length <= 13 ? "+" + d : null;
  }
  if (d.length === 14) return d; // CNPJ
  if (d.length === 11) {
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(t)) return d; // CPF formatado
    if (t.includes("(")) return "+55" + d; // telefone com DDD entre parênteses
    return cpfValido(d) ? d : "+55" + d; // 11 dígitos soltos: CPF se o dígito conferir
  }
  if (d.length === 10) return "+55" + d; // telefone fixo com DDD
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return "+" + d;
  return null;
}

function tag(id: string, valor: string) {
  return id + String(valor.length).padStart(2, "0") + valor;
}

function crc16(texto: string) {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function limpar(texto: string, max: number, padrao: string) {
  const s = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
  return s || padrao;
}

export function gerarBrCode({
  chave,
  valor,
  nome,
  cidade = "BRASIL",
}: {
  chave: string;
  valor: number;
  nome: string;
  cidade?: string;
}): string | null {
  const k = normalizarChavePix(chave);
  if (!k || !(valor > 0)) return null;

  const conta = tag("00", "br.gov.bcb.pix") + tag("01", k);
  const corpo =
    tag("00", "01") +
    tag("01", "11") +
    tag("26", conta) +
    tag("52", "0000") +
    tag("53", "986") +
    tag("54", valor.toFixed(2)) +
    tag("58", "BR") +
    tag("59", limpar(nome, 25, "LOJA")) +
    tag("60", limpar(cidade, 15, "BRASIL")) +
    tag("62", tag("05", "***")) +
    "6304";
  return corpo + crc16(corpo);
}

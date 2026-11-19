// Horário de funcionamento da loja. A MESMA regra existe no banco (loja_aberta_em),
// que é quem vale de verdade na hora de criar o pedido; aqui serve para mostrar o
// status na tela.

export type Periodo = { abre: string; fecha: string }; // "HH:MM"
export type Horarios = Record<string, Periodo[]>; // chave "0" (domingo) a "6" (sábado)

export const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const FUSO_PADRAO = "America/Fortaleza";

const paraMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// dia da semana (0 = domingo) e minutos desde 00:00 no fuso da loja
export function agoraNoFuso(fuso: string, data: Date = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  const pega = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(pega("weekday"));
  return { dow, min: Number(pega("hour")) * 60 + Number(pega("minute")) };
}

export type StatusHorario = {
  aberto: boolean;
  fechaAs?: string; // quando aberto: "23:00"
  abreTexto?: string; // quando fechado: "hoje às 18:00", "amanhã às 18:00", "quinta às 18:00"
};

export function statusHorario(
  horarios: Horarios,
  fuso: string,
  data: Date = new Date()
): StatusHorario {
  let dow: number;
  let min: number;
  try {
    ({ dow, min } = agoraNoFuso(fuso, data));
  } catch {
    ({ dow, min } = agoraNoFuso(FUSO_PADRAO, data));
  }
  if (dow < 0) return { aberto: false };

  // períodos de hoje
  for (const p of horarios[String(dow)] ?? []) {
    const a = paraMin(p.abre);
    const f = paraMin(p.fecha);
    if ((a < f && min >= a && min < f) || (a >= f && min >= a)) {
      return { aberto: true, fechaAs: p.fecha };
    }
  }
  // períodos de ontem que viraram a madrugada
  for (const p of horarios[String((dow + 6) % 7)] ?? []) {
    const a = paraMin(p.abre);
    const f = paraMin(p.fecha);
    if (a >= f && min < f) return { aberto: true, fechaAs: p.fecha };
  }

  // fechado: procura a próxima abertura nos próximos 7 dias
  for (let adiante = 0; adiante <= 7; adiante++) {
    const d = (dow + adiante) % 7;
    const inicios = (horarios[String(d)] ?? [])
      .map((p) => ({ txt: p.abre, min: paraMin(p.abre) }))
      .filter((i) => adiante > 0 || i.min > min)
      .sort((x, y) => x.min - y.min);
    if (inicios.length > 0) {
      const quando = adiante === 0 ? "hoje" : adiante === 1 ? "amanhã" : DIAS[d].toLowerCase();
      return { aberto: false, abreTexto: `${quando} às ${inicios[0].txt}` };
    }
  }
  return { aberto: false };
}

// lista de períodos de um dia em texto: "18:00 às 23:00" ou "Fechado"
export function textoDoDia(periodos: Periodo[] | undefined) {
  if (!periodos || periodos.length === 0) return "Fechado";
  return [...periodos]
    .sort((a, b) => paraMin(a.abre) - paraMin(b.abre))
    .map((p) => `${p.abre} às ${p.fecha}`)
    .join(" e ");
}

// o que a loja ver em "aberto agora" na tela, juntando o botão manual e o horário
export function lojaAbertaAgora(
  aberta: boolean,
  usaHorario: boolean,
  horarios: Horarios,
  fuso: string,
  data: Date = new Date()
) {
  if (!aberta) return false;
  if (!usaHorario) return true;
  return statusHorario(horarios, fuso, data).aberto;
}

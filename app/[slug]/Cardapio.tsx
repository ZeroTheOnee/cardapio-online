"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import InstalarApp from "./InstalarApp";
import NovoEndereco from "./NovoEndereco";
import {
  DIAS,
  lojaAbertaAgora,
  statusHorario,
  textoDoDia,
  type Horarios,
} from "@/lib/horario";

type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  estoque: number;
  ativo: boolean;
  imagem_url: string | null;
  grupos_opcao?: GrupoOpcao[];
};

// Opções e adicionais do produto (ex.: Tamanho, Adicionais)
type OpcaoItem = {
  id: string;
  nome: string;
  preco_extra: number;
  ativo: boolean;
  ordem: number;
};
type GrupoOpcao = {
  id: string;
  nome: string;
  minimo: number;
  maximo: number;
  ordem: number;
  opcoes: OpcaoItem[];
};

// Uma linha do carrinho: o mesmo produto com opções diferentes vira linhas separadas.
type Linha = { chave: string; produto_id: string; opcoes: string[]; qtd: number };

const chaveLinha = (produtoId: string, opcoes: string[]) =>
  [produtoId, ...[...opcoes].sort()].join("|");

// só grupos com ao menos uma opção ativa, na ordem escolhida pelo dono
function gruposDe(p: Produto): GrupoOpcao[] {
  return (p.grupos_opcao ?? [])
    .map((g) => ({
      ...g,
      opcoes: [...(g.opcoes ?? [])]
        .filter((o) => o.ativo)
        .sort((a, b) => a.ordem - b.ordem),
    }))
    .filter((g) => g.opcoes.length > 0)
    .sort((a, b) => a.ordem - b.ordem);
}

type Categoria = { id: string; nome: string; produtos: Produto[] };

type Loja = {
  id: string;
  nome: string;
  telefone: string | null;
  taxa_entrega: number;
  aberta: boolean;
  usa_horario: boolean;
  horarios: Horarios;
  fuso: string;
  aceita_pix: boolean;
  cor_principal: string;
  logo_url: string | null;
  capa_url: string | null;
  descricao: string | null;
  instagram: string | null;
  endereco_texto: string | null;
};

type Localidade = { id: string; nome: string; taxa: number };

type Endereco = {
  id: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
};

// "-" é o que o pedido sem conta grava nos campos que não pergunta; não mostrar
function rotuloEndereco(e: Endereco) {
  const ok = (t: string) => t.trim() !== "" && t.trim() !== "-";
  const ruaNum = ok(e.numero) ? `${e.rua}, ${e.numero}` : e.rua;
  return [ruaNum, e.bairro, e.cidade].filter(ok).join(" - ");
}

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// escolhe texto branco ou escuro conforme a cor de fundo, para sempre ler bem
function corTexto(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return "#ffffff";
  const luminosidade = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminosidade > 0.6 ? "#111827" : "#ffffff";
}

export default function Cardapio({
  slug,
  loja,
  categorias,
  localidades,
  agoraServidor,
}: {
  slug: string;
  loja: Loja;
  categorias: Categoria[];
  localidades: Localidade[];
  agoraServidor: string;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [carrinho, setCarrinho] = useState<Linha[]>([]);
  // janela "escolha as opções" do produto
  const [escolhendo, setEscolhendo] = useState<Produto | null>(null);
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [erroOpcoes, setErroOpcoes] = useState("");
  const [logado, setLogado] = useState<boolean | null>(null);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [finalizando, setFinalizando] = useState(false);
  const [verCarrinho, setVerCarrinho] = useState(false);
  const [busca, setBusca] = useState("");
  // relógio do cardápio: começa com a hora do servidor (sem divergir na hidratação) e
  // confere a cada 30 s, para a loja "fechar" sozinha na tela quando o horário acabar
  const [agora, setAgora] = useState(() => new Date(agoraServidor));
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const aberto = lojaAbertaAgora(
    loja.aberta,
    loja.usa_horario,
    loja.horarios ?? {},
    loja.fuso,
    agora
  );
  const statusDoHorario = loja.usa_horario
    ? statusHorario(loja.horarios ?? {}, loja.fuso, agora)
    : null;
  const [tipo, setTipo] = useState<"entrega" | "retirada">("entrega");
  const [enderecoId, setEnderecoId] = useState("");
  const [localidadeId, setLocalidadeId] = useState("");
  const [forma, setForma] = useState("dinheiro");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  // pedido sem conta (visitante): o Supabase cria uma conta anônima só para este navegador
  const [anonimo, setAnonimo] = useState(false);
  const [aceitou, setAceitou] = useState(false);
  const [vis, setVis] = useState({
    nome: "",
    telefone: "",
    endereco: "",
  });
    // ---- Carrinho persistente (guardado neste navegador, por loja) ----
  const chaveCarrinho = `carrinho:${loja.id}`;
  const [carrinhoCarregado, setCarrinhoCarregado] = useState(false);

  // ao abrir o cardápio, recupera o carrinho guardado
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const salvo = window.localStorage.getItem(chaveCarrinho);
        if (salvo) {
          const dados = JSON.parse(salvo) as unknown;
          const prods = new Map(
            categorias.flatMap((c) => c.produtos).map((p) => [p.id, p])
          );
          const usado: Record<string, number> = {};
          const limpo: Linha[] = [];
          // aceita o formato novo (lista de linhas) e o antigo ({ produtoId: qtd })
          const candidatas: { produto_id: string; opcoes: string[]; qtd: number }[] =
            Array.isArray(dados)
              ? dados.map((d) => ({
                  produto_id: String(d?.produto_id),
                  opcoes: Array.isArray(d?.opcoes) ? d.opcoes.map(String) : [],
                  qtd: Number(d?.qtd),
                }))
              : dados && typeof dados === "object"
              ? Object.entries(dados as Record<string, unknown>).map(([id, q]) => ({
                  produto_id: id,
                  opcoes: [],
                  qtd: Number(q),
                }))
              : [];
          for (const c of candidatas) {
            const p = prods.get(c.produto_id);
            // descarta item que saiu do cardápio ou ficou sem estoque
            if (!p || !p.ativo || p.estoque <= 0) continue;
            if (!Number.isInteger(c.qtd) || c.qtd <= 0) continue;
            // descarta se alguma opção escolhida não existe mais ou foi pausada
            const validas = new Set(gruposDe(p).flatMap((g) => g.opcoes.map((o) => o.id)));
            if (!c.opcoes.every((id) => validas.has(id))) continue;
            // produto com opção obrigatória precisa ter as escolhas completas
            const completo = gruposDe(p).every(
              (g) =>
                c.opcoes.filter((id) => g.opcoes.some((o) => o.id === id)).length >=
                Math.min(g.minimo, g.opcoes.length)
            );
            if (!completo) continue;
            const resta = p.estoque - (usado[p.id] ?? 0);
            const qtd = Math.min(c.qtd, resta);
            if (qtd <= 0) continue;
            usado[p.id] = (usado[p.id] ?? 0) + qtd;
            limpo.push({
              chave: chaveLinha(p.id, c.opcoes),
              produto_id: p.id,
              opcoes: c.opcoes,
              qtd,
            });
          }
          setCarrinho(limpo);
        }
      } catch {
        /* sem armazenamento disponível: o carrinho só não é lembrado */
      }
      setCarrinhoCarregado(true);
    }, 0);
    return () => clearTimeout(t);
    // roda só ao abrir a página
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveCarrinho]);

  // "Pedir de novo" (vindo de /meus-pedidos): monta o carrinho com os itens do pedido
  // antigo, conferindo o que ainda existe, tem estoque e tem as mesmas opções
  const [avisoRepetir, setAvisoRepetir] = useState("");
  useEffect(() => {
    if (!carrinhoCarregado) return;
    const t = setTimeout(() => {
      try {
        const bruto = window.localStorage.getItem(`repetir:${loja.id}`);
        if (!bruto) return;
        window.localStorage.removeItem(`repetir:${loja.id}`);
        const lista = JSON.parse(bruto) as {
          produto_id: string;
          qtd: number;
          opcoes: { grupo: string; nome: string }[];
        }[];
        if (!Array.isArray(lista)) return;
        const prods = new Map(
          categorias.flatMap((c) => c.produtos).map((p) => [p.id, p])
        );
        const faltou: string[] = [];
        const novo = [...carrinho];
        const usadoDe = (id: string) =>
          novo.filter((l) => l.produto_id === id).reduce((soma, l) => soma + l.qtd, 0);
        for (const it of lista) {
          const p = prods.get(String(it.produto_id));
          if (!p || !p.ativo || p.estoque <= 0) {
            faltou.push(p?.nome ?? "um item");
            continue;
          }
          const grupos = gruposDe(p);
          const ids: string[] = [];
          let ok = true;
          for (const o of Array.isArray(it.opcoes) ? it.opcoes : []) {
            const op = grupos
              .find((g) => g.nome === o.grupo)
              ?.opcoes.find((x) => x.nome === o.nome);
            if (op) ids.push(op.id);
            else ok = false;
          }
          const completo = grupos.every(
            (g) =>
              ids.filter((id) => g.opcoes.some((o) => o.id === id)).length >=
              Math.min(g.minimo, g.opcoes.length)
          );
          if (!ok || !completo) {
            faltou.push(p.nome);
            continue;
          }
          const qtd = Math.min(Number(it.qtd) || 0, p.estoque - usadoDe(p.id));
          if (qtd <= 0) {
            faltou.push(p.nome);
            continue;
          }
          const chave = chaveLinha(p.id, ids);
          const ex = novo.findIndex((l) => l.chave === chave);
          if (ex >= 0) novo[ex] = { ...novo[ex], qtd: novo[ex].qtd + qtd };
          else novo.push({ chave, produto_id: p.id, opcoes: ids, qtd });
        }
        setCarrinho(novo);
        setAvisoRepetir(
          faltou.length > 0
            ? `Alguns itens não estão disponíveis como antes: ${[...new Set(faltou)].join(", ")}. Confira o carrinho.`
            : "Itens do pedido anterior adicionados. Confira o carrinho."
        );
        if (novo.length > 0) setVerCarrinho(true);
      } catch {
        /* ignora */
      }
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrinhoCarregado]);

  // a cada mudança, guarda o carrinho
  useEffect(() => {
    if (!carrinhoCarregado) return;
    try {
      if (carrinho.length > 0) {
        window.localStorage.setItem(chaveCarrinho, JSON.stringify(carrinho));
      } else {
        window.localStorage.removeItem(chaveCarrinho);
      }
    } catch {
      /* sem armazenamento disponível */
    }
  }, [carrinho, carrinhoCarregado, chaveCarrinho]);


  const tema = {
    "--cor": loja.cor_principal,
    "--cor-texto": corTexto(loja.cor_principal),
  } as React.CSSProperties;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setLogado(false);
        return;
      }
      setLogado(true);
      setAnonimo(!!data.user.is_anonymous);
      const { data: ends } = await supabase
        .from("enderecos")
        .select("id, rua, numero, bairro, cidade")
        .eq("cliente_id", data.user.id);
      setEnderecos(ends ?? []);
      if (ends && ends.length > 0) setEnderecoId(ends[0].id);
    });
  }, [supabase]);

  // Pré-seleciona a localidade pelo bairro (ou cidade) do endereço escolhido.
  // O cliente pode trocar a localidade na hora do pedido.
  useEffect(() => {
    if (localidades.length === 0) return;
    const e = enderecos.find((x) => x.id === enderecoId);
    if (!e) return;
    const norm = (t: string) =>
      t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const achada =
      localidades.find((l) => norm(l.nome) === norm(e.bairro)) ??
      localidades.find((l) => norm(l.nome) === norm(e.cidade));
    if (achada) setLocalidadeId(achada.id);
  }, [enderecoId, enderecos, localidades]);

  const foneLoja = loja.telefone?.replace(/\D/g, "") ?? "";
  const zapLoja = foneLoja
    ? `https://wa.me/${foneLoja.length <= 11 ? "55" + foneLoja : foneLoja}?text=${encodeURIComponent(
        `Olá, ${loja.nome}! Vim pelo cardápio online.`
      )}`
    : null;

  const todos = categorias.flatMap((c) => c.produtos);

  // ---- Busca e atalhos de categoria ----
  const semAcento = (t: string) =>
    t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const ativos = todos.filter((p) => p.ativo);
  const mostrarBusca = ativos.length >= 12; // loja pequena não precisa de busca
  const termo = semAcento(busca);
  const combina = (p: Produto) =>
    !termo || semAcento(`${p.nome} ${p.descricao ?? ""}`).includes(termo);
  const categoriasComProdutos = categorias.filter((c) =>
    c.produtos.some((p) => p.ativo)
  );
  const semResultado =
    termo !== "" &&
    !categorias.some((c) => c.produtos.some((p) => p.ativo && combina(p)));

  function irParaCategoria(id: string) {
    document
      .getElementById(`cat-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const mapaProdutos = new Map(todos.map((p) => [p.id, p]));
  const qtdDoProduto = (id: string) =>
    carrinho.filter((l) => l.produto_id === id).reduce((n, l) => n + l.qtd, 0);

  // soma ou tira unidades de uma linha (respeitando o estoque do produto)
  function mudarLinha(
    produto: Produto,
    opcoes: string[],
    delta: number
  ) {
    const chave = chaveLinha(produto.id, opcoes);
    setCarrinho((atual) => {
      const noProduto = atual
        .filter((l) => l.produto_id === produto.id)
        .reduce((n, l) => n + l.qtd, 0);
      if (delta > 0 && noProduto + delta > produto.estoque) return atual;
      const existe = atual.find((l) => l.chave === chave);
      if (!existe) {
        return delta > 0
          ? [...atual, { chave, produto_id: produto.id, opcoes, qtd: delta }]
          : atual;
      }
      const qtd = existe.qtd + delta;
      return qtd <= 0
        ? atual.filter((l) => l.chave !== chave)
        : atual.map((l) => (l.chave === chave ? { ...l, qtd } : l));
    });
  }

  // "+" no produto: sem opções entra direto; com opções abre a janela de escolha
  function aoAdicionar(produto: Produto) {
    if (gruposDe(produto).length === 0) {
      mudarLinha(produto, [], 1);
      return;
    }
    setSel({});
    setErroOpcoes("");
    setEscolhendo(produto);
  }

  function alternarOpcao(g: GrupoOpcao, id: string) {
    setErroOpcoes("");
    setSel((s) => {
      const atual = s[g.id] ?? [];
      if (atual.includes(id)) return { ...s, [g.id]: atual.filter((x) => x !== id) };
      if (g.maximo === 1) return { ...s, [g.id]: [id] };
      if (atual.length >= g.maximo) return s;
      return { ...s, [g.id]: [...atual, id] };
    });
  }

  const extraEscolhido = escolhendo
    ? gruposDe(escolhendo)
        .flatMap((g) => g.opcoes.filter((o) => (sel[g.id] ?? []).includes(o.id)))
        .reduce((n, o) => n + o.preco_extra, 0)
    : 0;

  function confirmarOpcoes() {
    if (!escolhendo) return;
    const grupos = gruposDe(escolhendo);
    for (const g of grupos) {
      const preciso = Math.min(g.minimo, g.opcoes.length);
      if ((sel[g.id] ?? []).length < preciso) {
        setErroOpcoes(
          preciso === 1
            ? `Escolha uma opção em "${g.nome}".`
            : `Escolha pelo menos ${preciso} opções em "${g.nome}".`
        );
        return;
      }
    }
    if (qtdDoProduto(escolhendo.id) >= escolhendo.estoque) {
      setErroOpcoes("Não há mais estoque deste produto.");
      return;
    }
    const ids = grupos.flatMap((g) => sel[g.id] ?? []);
    mudarLinha(escolhendo, ids, 1);
    setEscolhendo(null);
  }

  // linhas prontas para exibir (nome, opções escolhidas e preço com extras)
  const itens = carrinho.flatMap((l) => {
    const p = mapaProdutos.get(l.produto_id);
    if (!p) return [];
    const escolhidas = gruposDe(p)
      .flatMap((g) => g.opcoes)
      .filter((o) => l.opcoes.includes(o.id));
    const unit = p.preco + escolhidas.reduce((n, o) => n + o.preco_extra, 0);
    return [
      {
        chave: l.chave,
        produto: p,
        nome: p.nome,
        opcoesTexto: escolhidas.map((o) => o.nome).join(", "),
        opcoes: l.opcoes,
        unit,
        quantidade: l.qtd,
      },
    ];
  });

  const subtotal = itens.reduce((soma, i) => soma + i.unit * i.quantidade, 0);
  const totalItens = itens.reduce((soma, i) => soma + i.quantidade, 0);
  // Se a loja cadastrou localidades, a taxa vem da localidade escolhida;
  // senão vale a taxa única da loja. (O servidor recalcula de qualquer forma.)
  const temLocalidades = localidades.length > 0;
  const localidade = localidades.find((l) => l.id === localidadeId);
  const taxaBase = temLocalidades
    ? localidade?.taxa ?? 0
    : loja.taxa_entrega;
  const taxa = tipo === "entrega" && itens.length > 0 ? taxaBase : 0;
  const menorTaxa = temLocalidades
    ? Math.min(...localidades.map((l) => l.taxa))
    : loja.taxa_entrega;
  const total = subtotal + taxa;

  function removerItem(chave: string) {
    setCarrinho((atual) => atual.filter((l) => l.chave !== chave));
  }

  function limparCarrinho() {
    if (!confirm("Tirar todos os itens do carrinho?")) return;
    setCarrinho([]);
  }

  // carrinho vazio: fecha a lista e o checkout
  useEffect(() => {
    if (totalItens > 0) return;
    const t = setTimeout(() => {
      setVerCarrinho(false);
      setFinalizando(false);
    }, 0);
    return () => clearTimeout(t);
  }, [totalItens]);

  async function confirmar() {
    setErro("");
    const visitante = logado === false;
    if (visitante) {
      if (vis.nome.trim().length < 2) {
        setErro("Digite o seu nome.");
        return;
      }
      if (vis.telefone.replace(/\D/g, "").length < 10) {
        setErro("Digite o telefone com DDD, para a loja falar com você.");
        return;
      }
      if (tipo === "entrega" && vis.endereco.trim().length < 5) {
        setErro("Escreva o endereço de entrega (rua, número e ponto de referência).");
        return;
      }
      if (!aceitou) {
        setErro("Aceite os Termos de uso e a Política de privacidade para continuar.");
        return;
      }
    } else {
      if (tipo === "entrega" && !enderecoId) {
        setErro("Escolha um endereço de entrega.");
        return;
      }
    }
    if (tipo === "entrega" && temLocalidades && !localidadeId) {
      setErro("Escolha a localidade da entrega.");
      return;
    }
    setEnviando(true);

    let enderecoFinal = enderecoId;
    if (visitante) {
      const meta: Record<string, string> = {
        nome: vis.nome.trim(),
        telefone: vis.telefone.trim(),
      };
      if (tipo === "entrega") {
        // um campo só: o texto vai em "rua"; os demais ficam com "-" (a loja já
        // recebe a localidade escolhida e o painel esconde os "-")
        meta.rua = vis.endereco.trim();
        meta.numero = "-";
        meta.bairro = localidade?.nome ?? "-";
        meta.cidade = "-";
      }
      // o gatilho do banco cria clientes/enderecos a partir destes dados
      const { data: au, error: ea } = await supabase.auth.signInAnonymously({
        options: { data: meta },
      });
      if (ea || !au.user) {
        setErro(
          ea?.message?.toLowerCase().includes("anonymous")
            ? "Pedido sem conta indisponível no momento. Entre ou crie uma conta."
            : ea?.message ?? "Não foi possível continuar. Tente de novo."
        );
        setEnviando(false);
        return;
      }
      if (tipo === "entrega") {
        const { data: ends } = await supabase
          .from("enderecos")
          .select("id")
          .eq("cliente_id", au.user.id)
          .limit(1);
        enderecoFinal = ends?.[0]?.id ?? "";
        if (!enderecoFinal) {
          setErro("Não foi possível salvar o endereço. Tente de novo.");
          setEnviando(false);
          return;
        }
      }
      setLogado(true);
      setAnonimo(true);
    }

    const { data, error } = await supabase.rpc("criar_pedido", {
      p_loja_id: loja.id,
      p_tipo: tipo,
      p_endereco_id: tipo === "entrega" ? enderecoFinal : null,
      p_forma_pagamento: forma,
      p_observacao: obs || null,
      p_itens: itens.map((i) => ({
        produto_id: i.produto.id,
        quantidade: i.quantidade,
        opcoes: i.opcoes,
      })),
      p_localidade_id:
        tipo === "entrega" && temLocalidades ? localidadeId : null,
    });

    if (error) {
      setErro(error.message);
      setEnviando(false);
      return;
    }
        try {
      window.localStorage.removeItem(chaveCarrinho);
    } catch {
      /* ignora */
    }
    router.push(`/pedido/${data}`);
  }

  const botaoTema =
    "bg-[var(--cor)] text-[var(--cor-texto)] disabled:opacity-40";

  return (
    <div style={tema} className="min-h-screen bg-gray-50 text-gray-900">
      <main className="mx-auto max-w-2xl pb-44">
        {/* Capa */}
        <div className="h-40 w-full overflow-hidden bg-[var(--cor)]">
          {loja.capa_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={loja.capa_url}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Cabeçalho da loja */}
        <header className="px-6">
          <div className="-mt-10">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow">
              {loja.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={loja.logo_url}
                  alt={loja.nome}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--cor)] text-3xl font-bold text-[var(--cor-texto)]">
                  {loja.nome.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <h1 className="mt-2 break-words text-2xl font-bold leading-tight">
            {loja.nome}
          </h1>

          {loja.descricao && (
            <p className="mt-3 text-sm text-gray-600">{loja.descricao}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span
              className={`rounded-full px-3 py-1 font-medium ${
                aberto ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {aberto
                ? statusDoHorario?.fechaAs
                  ? `Aberto agora · fecha às ${statusDoHorario.fechaAs}`
                  : "Aberto agora"
                : loja.aberta && statusDoHorario?.abreTexto
                ? `Fechado · abre ${statusDoHorario.abreTexto}`
                : "Fechado no momento"}
            </span>
            <span className="rounded-full bg-gray-200 px-3 py-1">
              {temLocalidades
                ? `Entrega a partir de ${dinheiro(menorTaxa)}`
                : `Entrega ${dinheiro(loja.taxa_entrega)}`}
            </span>
            {loja.instagram && (
              <a
                href={`https://instagram.com/${loja.instagram}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-gray-200 px-3 py-1 underline"
              >
                @{loja.instagram}
              </a>
            )}
          </div>

          {loja.endereco_texto && (
            <p className="mt-2 text-sm text-gray-500">{loja.endereco_texto}</p>
          )}

          {avisoRepetir && (
            <p className="mt-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">
              {avisoRepetir}
            </p>
          )}

          {loja.usa_horario && (
            <details className="mt-2 text-sm text-gray-600">
              <summary className="cursor-pointer underline">Ver horários de funcionamento</summary>
              <ul className="mt-2 space-y-0.5">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <li key={d} className="flex justify-between gap-4">
                    <span>{DIAS[d]}</span>
                    <span>{textoDoDia(loja.horarios?.[String(d)])}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {zapLoja && (
              <a
                href={zapLoja}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
              >
                💬 Falar com a loja no WhatsApp
              </a>
            )}
            <InstalarApp />
          </div>

          {logado === false && (
            <a
              href={`/entrar?loja=${slug}`}
              className="mt-3 inline-block text-sm underline"
            >
              Entrar / Criar conta
            </a>
          )}
          {logado === true && (
            <div className="mt-3 flex items-center gap-4">
              <a href="/meus-pedidos" className="text-sm underline">
                Meus pedidos
              </a>
              <button
                onClick={async () => {
                  if (
                    anonimo &&
                    !confirm(
                      "Você pediu sem criar conta. Ao sair, não será possível ver os pedidos feitos neste aparelho. Sair mesmo?"
                    )
                  )
                    return;
                  await supabase.auth.signOut();
                  setLogado(false);
                  setAnonimo(false);
                  setFinalizando(false);
                  setEnderecos([]);
                  setEnderecoId("");
                  setLocalidadeId("");
                }}
                className="text-sm underline"
              >
                Sair da conta
              </button>
            </div>
          )}
        </header>

        {/* Busca */}
        {mostrarBusca && (
          <div className="mt-6 px-6">
            <div className="relative">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar no cardápio"
                inputMode="search"
                enterKeyHint="search"
                aria-label="Buscar no cardápio"
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-10 text-black shadow-sm"
              />
              {busca && (
                <button
                  onClick={() => setBusca("")}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-gray-500 hover:bg-gray-100"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Atalhos de categoria (ficam fixos no topo ao rolar) */}
        {!termo && categoriasComProdutos.length > 1 && (
          <nav
            aria-label="Categorias"
            className="sticky top-0 z-30 mt-4 border-b border-gray-200 bg-gray-50/95 backdrop-blur"
          >
            <ul className="flex gap-2 overflow-x-auto px-6 py-2.5">
              {categoriasComProdutos.map((c) => (
                <li key={c.id} className="shrink-0">
                  <button
                    onClick={() => irParaCategoria(c.id)}
                    className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-100"
                  >
                    {c.nome}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Produtos */}
        <div className="px-6">
          {semResultado && (
            <p className="mt-8 text-center text-gray-500">
              Nenhum produto encontrado para &quot;{busca.trim()}&quot;.
            </p>
          )}
          {categorias.map((cat) => {
            const produtos = cat.produtos.filter((p) => p.ativo && combina(p));
            if (produtos.length === 0) return null;

            return (
              <section key={cat.id} id={`cat-${cat.id}`} className="mt-8 scroll-mt-16">
                <h2 className="mb-3 border-l-4 border-[var(--cor)] pl-3 text-xl font-semibold">
                  {cat.nome}
                </h2>
                <ul className="space-y-3">
                  {produtos.map((p) => {
                    const qtd = qtdDoProduto(p.id);
                    const comOpcoes = gruposDe(p).length > 0;
                    const esgotado = p.estoque <= 0;

                    return (
                      <li
                        key={p.id}
                        className={`flex items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm ${
                          esgotado ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {p.imagem_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imagem_url}
                              alt={p.nome}
                              className="h-20 w-20 shrink-0 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium">{p.nome}</p>
                            {p.descricao && (
                              <p className="text-sm text-gray-500">
                                {p.descricao}
                              </p>
                            )}
                            <p className="mt-1 font-semibold">
                              {dinheiro(p.preco)}
                            </p>
                          </div>
                        </div>

                        {esgotado ? (
                          <span className="text-sm font-medium text-red-600">
                            Esgotado
                          </span>
                        ) : (
                          <div className="flex items-center gap-3">
                            {qtd > 0 && !comOpcoes && (
                              <>
                                <button
                                  onClick={() => mudarLinha(p, [], -1)}
                                  className="h-9 w-9 rounded-full border text-lg"
                                >
                                  −
                                </button>
                                <span className="w-4 text-center">{qtd}</span>
                              </>
                            )}
                            {qtd > 0 && comOpcoes && (
                              <span className="text-xs text-gray-500">{qtd} no carrinho</span>
                            )}
                            <button
                              onClick={() => aoAdicionar(p)}
                              disabled={qtd >= p.estoque}
                              aria-label={`Adicionar ${p.nome}`}
                              className={`${
                                comOpcoes ? "rounded-full px-4 text-sm font-semibold" : "w-9 rounded-full text-lg"
                              } h-9 ${botaoTema}`}
                            >
                              {comOpcoes ? "Escolher" : "+"}
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <footer className="mt-10 px-6 text-center text-xs text-gray-400">
          <a href="/termos" className="underline">
            Termos de uso
          </a>
          {" · "}
          <a href="/privacidade" className="underline">
            Política de privacidade
          </a>
        </footer>
      </main>

      {/* Barra do carrinho */}
      {totalItens > 0 && (
        <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-[0_-12px_40px_rgba(15,23,42,0.12)] backdrop-blur ${verCarrinho || finalizando ? "max-h-[88dvh] overflow-y-auto rounded-t-3xl" : "rounded-t-2xl"}`}>
          <div className="mx-auto max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            {(verCarrinho || finalizando) && <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />}
            {(verCarrinho || finalizando) && (
              <div className="mb-4 border-b border-gray-100 pb-4">
                <div className="mb-2 flex items-center justify-between">
                  <div><p className="font-semibold text-gray-900">Seu pedido</p><p className="text-xs text-gray-500">Revise os itens antes de continuar</p></div>
                  <button
                    onClick={limparCarrinho}
                    className="text-sm text-red-600 underline"
                  >
                    Limpar carrinho
                  </button>
                </div>
                <ul className="max-h-44 space-y-3 overflow-y-auto pr-1">
                  {itens.map((i) => (
                    <li key={i.chave} className="flex items-center gap-3 rounded-xl bg-gray-50 p-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{i.nome}</p>
                        {i.opcoesTexto && (
                          <p className="text-xs text-gray-600">{i.opcoesTexto}</p>
                        )}
                        <p className="mt-0.5 text-xs text-gray-500">
                          {dinheiro(i.unit)} cada <span className="px-1">·</span>
                          {dinheiro(i.unit * i.quantidade)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => mudarLinha(i.produto, i.opcoes, -1)}
                          aria-label={`Menos ${i.nome}`}
                          className="h-8 w-8 rounded-full border border-gray-200 bg-white text-lg leading-none hover:bg-gray-100"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm">
                          {i.quantidade}
                        </span>
                        <button
                          onClick={() => mudarLinha(i.produto, i.opcoes, 1)}
                          disabled={qtdDoProduto(i.produto.id) >= i.produto.estoque}
                          aria-label={`Mais ${i.nome}`}
                          className={`h-8 w-8 rounded-full text-lg leading-none ${botaoTema}`}
                        >
                          +
                        </button>
                        <button
                          onClick={() => removerItem(i.chave)}
                          aria-label={`Remover ${i.nome}`}
                          className="ml-1 grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {finalizando && logado !== null && (
              <div className="mb-4 space-y-3 border-b border-gray-100 pb-4">
                {logado === false && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Seus dados</p>
                    <input
                      value={vis.nome}
                      onChange={(e) => setVis({ ...vis, nome: e.target.value })}
                      placeholder="Seu nome"
                      autoComplete="name"
                      className="w-full rounded-lg border bg-white p-3 text-black"
                    />
                    <input
                      value={vis.telefone}
                      onChange={(e) => setVis({ ...vis, telefone: e.target.value })}
                      placeholder="Telefone / WhatsApp com DDD"
                      inputMode="tel"
                      autoComplete="tel"
                      className="w-full rounded-lg border bg-white p-3 text-black"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  {(["entrega", "retirada"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTipo(t)}
                      className={`flex-1 rounded-lg border py-2 ${
                        tipo === t
                          ? "bg-[var(--cor)] text-[var(--cor-texto)]"
                          : ""
                      }`}
                    >
                      {t === "entrega" ? "Entrega" : "Retirada"}
                    </button>
                  ))}
                </div>

                {tipo === "entrega" && logado === false && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Endereço de entrega</p>
                    <textarea
                      value={vis.endereco}
                      onChange={(e) => setVis({ ...vis, endereco: e.target.value })}
                      placeholder="Rua, número e ponto de referência"
                      rows={2}
                      className="w-full rounded-lg border bg-white p-3 text-black"
                    />
                  </div>
                )}

                {tipo === "entrega" && logado && (
                  <select
                    value={enderecoId}
                    onChange={(e) => setEnderecoId(e.target.value)}
                    className="w-full rounded-lg border bg-white p-3 text-black"
                  >
                    {enderecos.length === 0 && (
                      <option value="">Nenhum endereço cadastrado</option>
                    )}
                    {enderecos.map((e) => (
                      <option key={e.id} value={e.id}>
                        {rotuloEndereco(e)}
                      </option>
                    ))}
                  </select>
                )}

                {tipo === "entrega" && logado && (
                  <NovoEndereco
                    cidadePadrao={
                      enderecos.find((e) => e.cidade && e.cidade !== "-")?.cidade ?? ""
                    }
                    onCriado={(e) => {
                      setEnderecos((lista) => [...lista, e]);
                      setEnderecoId(e.id);
                    }}
                  />
                )}

                {tipo === "entrega" && temLocalidades && (
                  <select
                    value={localidadeId}
                    onChange={(e) => setLocalidadeId(e.target.value)}
                    className="w-full rounded-lg border bg-white p-3 text-black"
                  >
                    <option value="">Localidade da entrega...</option>
                    {localidades.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome} — {dinheiro(l.taxa)}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={forma}
                  onChange={(e) => setForma(e.target.value)}
                  className="w-full rounded-lg border bg-white p-3 text-black"
                >
                  <option value="dinheiro">Dinheiro na entrega/retirada</option>
                  <option value="cartao_entrega">Cartão na entrega/retirada</option>
                  {loja.aceita_pix && (
                    <option value="pix">Pix (pagar pelo app do banco)</option>
                  )}
                </select>

                <input
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Observação (ex.: sem cebola, troco para 50)"
                  className="w-full rounded-lg border bg-white p-3 text-black"
                />

                {logado === false && (
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={aceitou}
                      onChange={(e) => setAceitou(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      Li e aceito os{" "}
                      <a href="/termos" target="_blank" className="underline">
                        Termos de uso
                      </a>{" "}
                      e a{" "}
                      <a href="/privacidade" target="_blank" className="underline">
                        Política de privacidade
                      </a>
                      .
                    </span>
                  </label>
                )}

                {erro && <p className="text-sm text-red-600">{erro}</p>}
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-gray-600">
              {finalizando ? (
                <span>
                  {totalItens} {totalItens === 1 ? "item" : "itens"}
                </span>
              ) : (
                <button
                  onClick={() => setVerCarrinho((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-2 font-semibold text-gray-800 hover:bg-gray-200"
                >
                  🛒 {totalItens} {totalItens === 1 ? "item" : "itens"} ·{" "}
                  {verCarrinho ? "Esconder carrinho ▼" : "Ver carrinho ▲"}
                </button>
              )}
              <span className="font-medium text-gray-700">Subtotal {dinheiro(subtotal)}</span>
            </div>
            {(finalizando || verCarrinho) && tipo === "entrega" && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Entrega</span>
                <span>
                  {temLocalidades && !localidade ? "escolha a localidade" : dinheiro(taxa)}
                </span>
              </div>
            )}
            {(finalizando || verCarrinho) && <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-lg font-bold text-gray-900">
              <span>Total</span>
              <span>{dinheiro(total)}</span>
            </div>}

            {!aberto ? (
              <p className="mt-3 text-center text-sm text-red-600">
                A loja está fechada no momento
                {loja.aberta && statusDoHorario?.abreTexto
                  ? `. Abre ${statusDoHorario.abreTexto}.`
                  : "."}
              </p>
            ) : !finalizando ? (
              <button
                onClick={() => setFinalizando(true)}
                disabled={logado === null}
                className={`mt-3 w-full rounded-xl py-3.5 font-semibold shadow-sm ${botaoTema}`}
              >
                Finalizar pedido
              </button>
            ) : (
              <button
                onClick={confirmar}
                disabled={enviando}
                className={`mt-3 w-full rounded-xl py-3.5 font-semibold shadow-sm ${botaoTema}`}
              >
                {enviando ? "Enviando..." : "Confirmar pedido"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Janela de opções e adicionais */}
      {escolhendo && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setEscolhendo(null)}
        >
          <div
            role="dialog"
            aria-label={`Opções de ${escolhendo.nome}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-gray-900 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{escolhendo.nome}</p>
                {escolhendo.descricao && (
                  <p className="text-sm text-gray-500">{escolhendo.descricao}</p>
                )}
              </div>
              <button
                onClick={() => setEscolhendo(null)}
                aria-label="Fechar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {gruposDe(escolhendo).map((g) => {
              const escolhidas = sel[g.id] ?? [];
              const obrigatorio = Math.min(g.minimo, g.opcoes.length) > 0;
              return (
                <fieldset key={g.id} className="mt-5">
                  <legend className="flex w-full items-center justify-between">
                    <span className="font-semibold">{g.nome}</span>
                    <span className="text-xs text-gray-500">
                      {obrigatorio ? "Obrigatório · " : "Opcional · "}
                      {g.maximo === 1 ? "escolha 1" : `até ${g.maximo}`}
                    </span>
                  </legend>
                  <ul className="mt-2 space-y-2">
                    {g.opcoes.map((o) => {
                      const marcado = escolhidas.includes(o.id);
                      const cheio = !marcado && g.maximo > 1 && escolhidas.length >= g.maximo;
                      return (
                        <li key={o.id}>
                          <button
                            type="button"
                            onClick={() => alternarOpcao(g, o.id)}
                            disabled={cheio}
                            aria-pressed={marcado}
                            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left disabled:opacity-40 ${
                              marcado ? "border-[var(--cor)] bg-gray-50" : "border-gray-200"
                            }`}
                          >
                            <span
                              className={`grid h-5 w-5 shrink-0 place-items-center border text-xs ${
                                g.maximo === 1 ? "rounded-full" : "rounded"
                              } ${
                                marcado
                                  ? "border-[var(--cor)] bg-[var(--cor)] text-[var(--cor-texto)]"
                                  : "border-gray-400 bg-white text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            <span className="flex-1">{o.nome}</span>
                            {o.preco_extra > 0 && (
                              <span className="text-sm text-gray-600">
                                + {dinheiro(o.preco_extra)}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              );
            })}

            {erroOpcoes && <p className="mt-3 text-sm text-red-600">{erroOpcoes}</p>}

            <button
              onClick={confirmarOpcoes}
              className={`mt-5 w-full rounded-xl py-3.5 font-semibold shadow-sm ${botaoTema}`}
            >
              Adicionar · {dinheiro(escolhendo.preco + extraEscolhido)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

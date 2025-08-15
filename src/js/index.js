/**
 * Enum para níveis de log
 */
const NiveisLog = {
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
};

class Logger {
  /**
   * Registra uma mensagem de log
   * @param {string} nivel - Nível do log
   * @param {string} mensagem - Mensagem a ser logada
   * @param {*} dados - Dados adicionais para log
   */
  static registrar(nivel, mensagem, dados = null) {
    const timestamp = new Date().toISOString();
    const logCompleto = `[${timestamp}] ${nivel.toUpperCase()}: ${mensagem}`;

    switch (nivel) {
      case NiveisLog.INFO:
        console.log(logCompleto, dados);
        break;
      case NiveisLog.WARN:
        console.warn(logCompleto, dados);
        break;
      case NiveisLog.ERROR:
        console.error(logCompleto, dados);
        break;
    }
  }

  static info(mensagem, dados) {
    this.registrar(NiveisLog.INFO, mensagem, dados);
  }
  static warn(mensagem, dados) {
    this.registrar(NiveisLog.WARN, mensagem, dados);
  }
  static error(mensagem, dados) {
    this.registrar(NiveisLog.ERROR, mensagem, dados);
  }
}

class GerenciadorArmazenamento {
  static CHAVES = {
    TAREFAS: "tarefas",
    PROJETOS: "projetos",
    CONFIGURACOES: "configuracoes",
  };

  /**
   * Salva dados no localStorage
   * @param {string} chave - Chave para armazenamento
   * @param {*} dados - Dados para salvar
   */
  static salvar(chave, dados) {
    try {
      localStorage.setItem(chave, JSON.stringify(dados));
      Logger.info(`Dados salvos com sucesso: ${chave}`);
    } catch (erro) {
      Logger.error(`Erro ao salvar dados: ${chave}`, erro);
    }
  }

  /**
   * Carrega dados do localStorage
   * @param {string} chave - Chave para recuperar
   * @returns {*} Dados carregados ou null se não existir
   */
  static carregar(chave) {
    try {
      const dados = localStorage.getItem(chave);
      return dados ? JSON.parse(dados) : null;
    } catch (erro) {
      Logger.error(`Erro ao carregar dados: ${chave}`, erro);
      return null;
    }
  }
}

class Tarefa {
  constructor(
    id,
    titulo,
    descricao = "",
    dataVencimento = null,
    prioridade = "media",
    projetoId = null
  ) {
    this.id = id;
    this.titulo = titulo;
    this.descricao = descricao;
    this.dataVencimento = dataVencimento;
    this.prioridade = prioridade;
    this.projetoId = projetoId;
    this.concluida = false;
    this.dataCriacao = new Date().toISOString();
    this.dataAtualizacao = new Date().toISOString();
  }

  alternarStatus() {
    this.concluida = !this.concluida;
    this.dataAtualizacao = new Date().toISOString();
    Logger.info(
      `Status da tarefa alterado: ${this.titulo} - ${
        this.concluida ? "Concluída" : "Pendente"
      }`
    );
  }

  /**
   * Atualiza os dados da tarefa
   * @param {Object} dadosNovos - Novos dados da tarefa
   */
  atualizar(dadosNovos) {
    Object.assign(this, dadosNovos);
    this.dataAtualizacao = new Date().toISOString();
    Logger.info(`Tarefa atualizada: ${this.titulo}`);
  }
}

class Projeto {
  constructor(id, nome) {
    this.id = id;
    this.nome = nome;
    this.dataCriacao = new Date().toISOString();
  }

  /**
   * Atualiza o nome do projeto
   * @param {string} novoNome - Novo nome do projeto
   */
  atualizarNome(novoNome) {
    this.nome = novoNome;
    Logger.info(`Projeto renomeado para: ${novoNome}`);
  }
}

class GerenciadorTarefas {
  constructor() {
    this.tarefas = [];
    this.projetos = [];
    this.projetoSelecionado = null;
    this.filtros = {
      status: "todas",
      prioridade: "todas",
    };
    this.tarefaEditando = null;
    this.projetoEditando = null;

    this.inicializar();
  }

  inicializar() {
    Logger.info("Inicializando aplicação de tarefas");
    this.carregarDados();
    this.renderizarProjetos();
    this.renderizarTarefas();
    this.atualizarSelectProjetos();
  }

  carregarDados() {
    const tarefasSalvas = GerenciadorArmazenamento.carregar(
      GerenciadorArmazenamento.CHAVES.TAREFAS
    );
    const projetosSalvos = GerenciadorArmazenamento.carregar(
      GerenciadorArmazenamento.CHAVES.PROJETOS
    );

    if (tarefasSalvas) {
      this.tarefas = tarefasSalvas.map((dados) =>
        Object.assign(new Tarefa(), dados)
      );
      Logger.info(`${this.tarefas.length} tarefas carregadas`);
    }

    if (projetosSalvos) {
      this.projetos = projetosSalvos.map((dados) =>
        Object.assign(new Projeto(), dados)
      );
      Logger.info(`${this.projetos.length} projetos carregados`);
    }
  }

  salvarDados() {
    GerenciadorArmazenamento.salvar(
      GerenciadorArmazenamento.CHAVES.TAREFAS,
      this.tarefas
    );
    GerenciadorArmazenamento.salvar(
      GerenciadorArmazenamento.CHAVES.PROJETOS,
      this.projetos
    );
  }

  /**
   * Gera um ID único
   * @returns {string} ID único
   */
  gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Adiciona uma nova tarefa
   * @param {Object} dadosTarefa - Dados da tarefa
   */
  adicionarTarefa(dadosTarefa) {
    const novaTarefa = new Tarefa(
      this.gerarId(),
      dadosTarefa.titulo,
      dadosTarefa.descricao,
      dadosTarefa.dataVencimento,
      dadosTarefa.prioridade,
      dadosTarefa.projetoId
    );

    this.tarefas.push(novaTarefa);
    this.salvarDados();
    this.renderizarTarefas();

    Logger.info("Nova tarefa adicionada", novaTarefa);
  }

  /**
   * Edita uma tarefa existente
   * @param {string} id - ID da tarefa
   * @param {Object} dadosNovos - Novos dados da tarefa
   */
  editarTarefa(id, dadosNovos) {
    const tarefa = this.tarefas.find((t) => t.id === id);
    if (tarefa) {
      tarefa.atualizar(dadosNovos);
      this.salvarDados();
      this.renderizarTarefas();
    } else {
      Logger.warn(`Tarefa não encontrada para edição: ${id}`);
    }
  }

  /**
   * Remove uma tarefa
   * @param {string} id - ID da tarefa
   */
  removerTarefa(id) {
    const indice = this.tarefas.findIndex((t) => t.id === id);
    if (indice !== -1) {
      const tarefaRemovida = this.tarefas.splice(indice, 1)[0];
      this.salvarDados();
      this.renderizarTarefas();
      Logger.info("Tarefa removida", tarefaRemovida);
    } else {
      Logger.warn(`Tarefa não encontrada para remoção: ${id}`);
    }
  }

  /**
   * Alterna o status de uma tarefa
   * @param {string} id - ID da tarefa
   */
  alternarStatusTarefa(id) {
    const tarefa = this.tarefas.find((t) => t.id === id);
    if (tarefa) {
      tarefa.alternarStatus();
      this.salvarDados();
      this.renderizarTarefas();
    } else {
      Logger.warn(`Tarefa não encontrada para alternar status: ${id}`);
    }
  }

  /**
   * Adiciona um novo projeto
   * @param {string} nome - Nome do projeto
   */
  adicionarProjeto(nome) {
    const novoProjeto = new Projeto(this.gerarId(), nome);
    this.projetos.push(novoProjeto);
    this.salvarDados();
    this.renderizarProjetos();
    this.atualizarSelectProjetos();

    Logger.info("Novo projeto adicionado", novoProjeto);
  }

  /**
   * Edita um projeto existente
   * @param {string} id - ID do projeto
   * @param {string} novoNome - Novo nome do projeto
   */
  editarProjeto(id, novoNome) {
    const projeto = this.projetos.find((p) => p.id === id);
    if (projeto) {
      projeto.atualizarNome(novoNome);
      this.salvarDados();
      this.renderizarProjetos();
      this.atualizarSelectProjetos();
    } else {
      Logger.warn(`Projeto não encontrado para edição: ${id}`);
    }
  }

  /**
   * Remove um projeto e suas tarefas associadas
   * @param {string} id - ID do projeto
   */
  removerProjeto(id) {
    const indice = this.projetos.findIndex((p) => p.id === id);
    if (indice !== -1) {
      const projetoRemovido = this.projetos.splice(indice, 1)[0];

      this.tarefas = this.tarefas.filter((t) => t.projetoId !== id);

      if (this.projetoSelecionado === id) {
        this.projetoSelecionado = null;
      }

      this.salvarDados();
      this.renderizarProjetos();
      this.renderizarTarefas();
      this.atualizarSelectProjetos();

      Logger.info("Projeto removido", projetoRemovido);
    } else {
      Logger.warn(`Projeto não encontrado para remoção: ${id}`);
    }
  }

  /**
   * Seleciona um projeto para filtrar tarefas
   * @param {string} id - ID do projeto
   */
  selecionarProjeto(id) {
    this.projetoSelecionado = id;
    this.renderizarProjetos();
    this.renderizarTarefas();
    Logger.info(`Projeto selecionado: ${id}`);
  }

  /**
   * Aplica filtros às tarefas
   * @param {string} tipo - Tipo do filtro ('status' ou 'prioridade')
   * @param {string} valor - Valor do filtro
   */
  aplicarFiltro(tipo, valor) {
    this.filtros[tipo] = valor;
    this.renderizarTarefas();
    Logger.info(`Filtro aplicado: ${tipo} = ${valor}`);
  }

  /**
   * Obtém tarefas filtradas
   * @returns {Array} Array de tarefas filtradas
   */
  obterTarefasFiltradas() {
    let tarefasFiltradas = this.tarefas;

    if (this.projetoSelecionado) {
      tarefasFiltradas = tarefasFiltradas.filter(
        (t) => t.projetoId === this.projetoSelecionado
      );
    }

    if (this.filtros.status !== "todas") {
      if (this.filtros.status === "concluidas") {
        tarefasFiltradas = tarefasFiltradas.filter((t) => t.concluida);
      } else if (this.filtros.status === "pendentes") {
        tarefasFiltradas = tarefasFiltradas.filter((t) => !t.concluida);
      }
    }

    if (this.filtros.prioridade !== "todas") {
      tarefasFiltradas = tarefasFiltradas.filter(
        (t) => t.prioridade === this.filtros.prioridade
      );
    }

    return tarefasFiltradas;
  }

  renderizarProjetos() {
    const listaProjetos = document.getElementById("lista-projetos");

    if (this.projetos.length === 0) {
      listaProjetos.innerHTML =
        '<p style="color: var(--muted-foreground); text-align: center; padding: 20px;">Nenhum projeto criado ainda</p>';
      return;
    }

    const html = this.projetos
      .map(
        (projeto) => `
                    <div class="projeto-item ${
                      this.projetoSelecionado === projeto.id ? "ativo" : ""
                    }" 
                         onclick="gerenciador.selecionarProjeto('${
                           projeto.id
                         }')">
                        <span>📁</span>
                        <span class="projeto-nome">${this.escaparHtml(
                          projeto.nome
                        )}</span>
                        <div class="projeto-acoes">
                            <button class="btn-pequeno" onclick="event.stopPropagation(); iniciarEdicaoProjeto('${
                              projeto.id
                            }')" title="Editar">
                                ✏️
                            </button>
                            <button class="btn-pequeno" onclick="event.stopPropagation(); confirmarRemocaoProjeto('${
                              projeto.id
                            }')" title="Excluir">
                                🗑️
                            </button>
                        </div>
                    </div>
                `
      )
      .join("");

    listaProjetos.innerHTML = html;
  }

  renderizarTarefas() {
    const listaTarefas = document.getElementById("lista-tarefas");
    const tarefasFiltradas = this.obterTarefasFiltradas();

    if (tarefasFiltradas.length === 0) {
      let mensagem = "Nenhuma tarefa encontrada";
      if (this.projetoSelecionado) {
        const projeto = this.projetos.find(
          (p) => p.id === this.projetoSelecionado
        );
        mensagem = `Nenhuma tarefa encontrada no projeto "${
          projeto ? projeto.nome : "Desconhecido"
        }"`;
      }
      listaTarefas.innerHTML = `<div class="mensagem-vazia">${mensagem}</div>`;
      return;
    }

    tarefasFiltradas.sort((a, b) => {
      if (a.concluida !== b.concluida) {
        return a.concluida ? 1 : -1;
      }

      const prioridades = { alta: 3, media: 2, baixa: 1 };
      return prioridades[b.prioridade] - prioridades[a.prioridade];
    });

    const html = tarefasFiltradas
      .map((tarefa) => {
        const projeto = this.projetos.find((p) => p.id === tarefa.projetoId);
        const dataFormatada = tarefa.dataVencimento
          ? new Date(tarefa.dataVencimento).toLocaleDateString("pt-BR")
          : "Sem prazo";

        return `
                        <div class="tarefa-item ${tarefa.prioridade} ${
          tarefa.concluida ? "concluida" : ""
        }">
                            <div class="tarefa-header">
                                <input type="checkbox" class="tarefa-checkbox" 
                                       ${tarefa.concluida ? "checked" : ""} 
                                       onchange="gerenciador.alternarStatusTarefa('${
                                         tarefa.id
                                       }')">
                                <div class="tarefa-titulo">${this.escaparHtml(
                                  tarefa.titulo
                                )}</div>
                                <div class="tarefa-acoes">
                                    <button class="btn-acao" onclick="iniciarEdicaoTarefa('${
                                      tarefa.id
                                    }')" title="Editar">
                                        ✏️ Editar
                                    </button>
                                    <button class="btn-acao" onclick="confirmarRemocaoTarefa('${
                                      tarefa.id
                                    }')" title="Excluir">
                                        🗑️ Excluir
                                    </button>
                                </div>
                            </div>
                            ${
                              tarefa.descricao
                                ? `<div class="tarefa-descricao">${this.escaparHtml(
                                    tarefa.descricao
                                  )}</div>`
                                : ""
                            }
                            <div class="tarefa-meta">
                                <span>📅 ${dataFormatada}</span>
                                <span class="prioridade-badge ${
                                  tarefa.prioridade
                                }">
                                    ${this.obterIconePrioridade(
                                      tarefa.prioridade
                                    )} ${this.capitalizarPrimeira(
          tarefa.prioridade
        )}
                                </span>
                                ${
                                  projeto
                                    ? `<span>📁 ${this.escaparHtml(
                                        projeto.nome
                                      )}</span>`
                                    : ""
                                }
                            </div>
                        </div>
                    `;
      })
      .join("");

    listaTarefas.innerHTML = html;
  }

  atualizarSelectProjetos() {
    const selectProjeto = document.getElementById("projeto-tarefa");
    const opcoesProjetos = this.projetos
      .map(
        (projeto) =>
          `<option value="${projeto.id}">${this.escaparHtml(
            projeto.nome
          )}</option>`
      )
      .join("");

    selectProjeto.innerHTML = `
                    <option value="">Sem projeto</option>
                    ${opcoesProjetos}
                `;
  }

  /**
   * Obtém ícone da prioridade
   * @param {string} prioridade - Prioridade da tarefa
   * @returns {string} Ícone correspondente
   */
  obterIconePrioridade(prioridade) {
    const icones = {
      alta: "🔴",
      media: "🟡",
      baixa: "🟢",
    };
    return icones[prioridade] || "⚪";
  }

  /**
   * Capitaliza a primeira letra de uma string
   * @param {string} str - String para capitalizar
   * @returns {string} String capitalizada
   */
  capitalizarPrimeira(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Escapa HTML para prevenir XSS
   * @param {string} texto - Texto para escapar
   * @returns {string} Texto escapado
   */
  escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }
}

let gerenciador;

document.addEventListener("DOMContentLoaded", function () {
  gerenciador = new GerenciadorTarefas();
  Logger.info("Aplicação inicializada com sucesso");
});

/**
 * Abre o modal de projeto
 * @param {string} id - ID do projeto para edição (opcional)
 */
function abrirModalProjeto(id = null) {
  const modal = document.getElementById("modal-projeto");
  const titulo = document.getElementById("titulo-modal-projeto");
  const inputNome = document.getElementById("nome-projeto");

  if (id) {
    const projeto = gerenciador.projetos.find((p) => p.id === id);
    if (projeto) {
      titulo.textContent = "Editar Projeto";
      inputNome.value = projeto.nome;
      gerenciador.projetoEditando = id;
    }
  } else {
    titulo.textContent = "Novo Projeto";
    inputNome.value = "";
    gerenciador.projetoEditando = null;
  }

  modal.style.display = "block";
  inputNome.focus();
}

/**
 * Abre o modal de tarefa
 * @param {string} id - ID da tarefa para edição (opcional)
 */
function abrirModalTarefa(id = null) {
  const modal = document.getElementById("modal-tarefa");
  const titulo = document.getElementById("titulo-modal-tarefa");
  const form = document.getElementById("form-tarefa");

  form.reset();
  document.getElementById("prioridade-tarefa").value = "media";

  if (id) {
    const tarefa = gerenciador.tarefas.find((t) => t.id === id);
    if (tarefa) {
      titulo.textContent = "Editar Tarefa";
      document.getElementById("titulo-tarefa").value = tarefa.titulo;
      document.getElementById("descricao-tarefa").value = tarefa.descricao;
      document.getElementById("data-vencimento").value =
        tarefa.dataVencimento || "";
      document.getElementById("prioridade-tarefa").value = tarefa.prioridade;
      document.getElementById("projeto-tarefa").value = tarefa.projetoId || "";
      gerenciador.tarefaEditando = id;
    }
  } else {
    titulo.textContent = "Nova Tarefa";

    if (gerenciador.projetoSelecionado) {
      document.getElementById("projeto-tarefa").value =
        gerenciador.projetoSelecionado;
    }
    gerenciador.tarefaEditando = null;
  }

  modal.style.display = "block";
  document.getElementById("titulo-tarefa").focus();
}

/**
 * Fecha um modal
 * @param {string} modalId - ID do modal
 */
function fecharModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

/**
 * Salva um projeto (novo ou editado)
 * @param {Event} event - Evento do formulário
 */
function salvarProjeto(event) {
  event.preventDefault();

  const nome = document.getElementById("nome-projeto").value.trim();
  if (!nome) {
    alert("Nome do projeto é obrigatório");
    return;
  }

  if (gerenciador.projetoEditando) {
    gerenciador.editarProjeto(gerenciador.projetoEditando, nome);
  } else {
    gerenciador.adicionarProjeto(nome);
  }

  fecharModal("modal-projeto");
}

/**
 * Salva uma tarefa (nova ou editada)
 * @param {Event} event - Evento do formulário
 */
function salvarTarefa(event) {
  event.preventDefault();

  const dadosTarefa = {
    titulo: document.getElementById("titulo-tarefa").value.trim(),
    descricao: document.getElementById("descricao-tarefa").value.trim(),
    dataVencimento: document.getElementById("data-vencimento").value || null,
    prioridade: document.getElementById("prioridade-tarefa").value,
    projetoId: document.getElementById("projeto-tarefa").value || null,
  };

  if (!dadosTarefa.titulo) {
    alert("Título da tarefa é obrigatório");
    return;
  }

  if (gerenciador.tarefaEditando) {
    gerenciador.editarTarefa(gerenciador.tarefaEditando, dadosTarefa);
  } else {
    gerenciador.adicionarTarefa(dadosTarefa);
  }

  fecharModal("modal-tarefa");
}

/**
 * Aplica um filtro
 * @param {HTMLElement} botao - Botão clicado
 */
function aplicarFiltro(botao) {
  const tipo = botao.dataset.filtro;
  const valor = botao.dataset.valor;

  const grupo = botao.parentElement;
  grupo
    .querySelectorAll(".filtro-btn")
    .forEach((btn) => btn.classList.remove("ativo"));

  botao.classList.add("ativo");

  gerenciador.aplicarFiltro(tipo, valor);
}

/**
 * Inicia a edição de um projeto
 * @param {string} id - ID do projeto
 */
function iniciarEdicaoProjeto(id) {
  abrirModalProjeto(id);
}

/**
 * Inicia a edição de uma tarefa
 * @param {string} id - ID da tarefa
 */
function iniciarEdicaoTarefa(id) {
  abrirModalTarefa(id);
}

/**
 * Confirma e remove um projeto
 * @param {string} id - ID do projeto
 */
function confirmarRemocaoProjeto(id) {
  const projeto = gerenciador.projetos.find((p) => p.id === id);
  if (!projeto) return;

  const tarefasAssociadas = gerenciador.tarefas.filter(
    (t) => t.projetoId === id
  ).length;
  let mensagem = `Tem certeza que deseja excluir o projeto "${projeto.nome}"?`;

  if (tarefasAssociadas > 0) {
    mensagem += `\n\nEste projeto possui ${tarefasAssociadas} tarefa(s) associada(s) que também serão excluídas.`;
  }

  if (confirm(mensagem)) {
    gerenciador.removerProjeto(id);
  }
}

/**
 * Confirma e remove uma tarefa
 * @param {string} id - ID da tarefa
 */
function confirmarRemocaoTarefa(id) {
  const tarefa = gerenciador.tarefas.find((t) => t.id === id);
  if (!tarefa) return;

  if (confirm(`Tem certeza que deseja excluir a tarefa "${tarefa.titulo}"?`)) {
    gerenciador.removerTarefa(id);
  }
}

window.onclick = function (event) {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
};

document.addEventListener("keydown", function (event) {
  if (event.ctrlKey && event.key === "n") {
    event.preventDefault();
    abrirModalTarefa();
  }

  if (event.ctrlKey && event.shiftKey && event.key === "N") {
    event.preventDefault();
    abrirModalProjeto();
  }

  if (event.key === "Escape") {
    const modalsAbertos = document.querySelectorAll('.modal[style*="block"]');
    modalsAbertos.forEach((modal) => (modal.style.display = "none"));
  }
});

window.abrirModalProjeto = abrirModalProjeto;
window.abrirModalTarefa = abrirModalTarefa;
window.fecharModal = fecharModal;
window.salvarProjeto = salvarProjeto;
window.salvarTarefa = salvarTarefa;
window.aplicarFiltro = aplicarFiltro;
window.iniciarEdicaoProjeto = iniciarEdicaoProjeto;
window.iniciarEdicaoTarefa = iniciarEdicaoTarefa;
window.confirmarRemocaoProjeto = confirmarRemocaoProjeto;
window.confirmarRemocaoTarefa = confirmarRemocaoTarefa;

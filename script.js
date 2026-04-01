// Variável global que armazena os itens selecionados pelo usuário
let carrinho = [];


// 1. CARREGAR PRODUTOS NA TELA PRINCIPAL
async function carregarProdutos() {
    try {
        // Faz a requisição GET para a API buscar todos os produtos
        const resposta = await fetch('http://localhost:8080/api/products');
        const produtos = await resposta.json();
        const lista = document.getElementById('lista-produtos');
        
        // Verifica se o elemento existe na página atual (evita erros em páginas sem a lista)
        if (!lista) return; 
        lista.innerHTML = '';

        // Itera sobre cada produto retornado pela API para criar o HTML dinamicamente
        produtos.forEach(p => {
            // Lógica para verificar disponibilidade de estoque
            const estoqueTexto = p.stock > 0 ? `Estoque: ${p.stock}` : "ESGOTADO";
            const botaoDesabilitado = p.stock <= 0 ? "disabled" : "";

            // Insere o card do produto no container HTML
            lista.innerHTML += `
                <div class="card">
                    <img src="${p.image_url || 'https://via.placeholder.com/150'}" alt="${p.name}" style="width:100%; border-radius:8px; height:200px; object-fit:cover;">
                    <h3>${p.name}</h3>
                    <p style="color: #666; font-size: 0.9em;">${p.description || 'Sem descrição'}</p>
                    <p><strong>R$ ${p.price.toFixed(2)}</strong></p>
                    <p style="font-size: 0.8em; color: ${p.stock > 0 ? 'green' : 'red'}">${estoqueTexto}</p>
                    <button class="btn" onclick="adicionarAoCarrinho(${p.id}, '${p.name}', ${p.price})" ${botaoDesabilitado}>
                        ${p.stock > 0 ? 'Comprar' : 'Indisponível'}
                    </button>
                </div>`;
        });
    } catch (error) {
        console.error("Erro ao carregar produtos:", error);
    }
}


// 2. GERENCIAMENTO DO CARRINHO

// Adiciona um item ao array local e atualiza o contador visual
function adicionarAoCarrinho(id, nome, preco) {
    carrinho.push({ id, nome, preco });
    document.getElementById('cart').innerText = `🛒 Itens: ${carrinho.length}`;
    alert(`${nome} adicionado ao carrinho!`);
}

// Envia os dados da compra para o servidor e atualiza o estoque no banco
async function processarPagamento() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");

    // Loop para notificar o backend sobre a venda de cada item individualmente
    for (const item of carrinho) {
        await fetch(`http://localhost:8080/api/buy/${item.id}`, { method: 'POST' });
    }

    // Finaliza o pedido e limpa o estado do frontend
    const resposta = await fetch('http://localhost:8080/api/checkout', { method: 'POST' });
    const dados = await resposta.json();
    
    alert(dados.msg); 
    carrinho = [];
    document.getElementById('cart').innerText = `🛒 Itens: 0`;
    fecharModal();
    carregarProdutos(); // Recarrega a vitrine para refletir a baixa no estoque
}


// 3. ADMINISTRAÇÃO (CRUD)


// Cria um novo produto enviando os dados do formulário via POST
async function cadastrarProduto() {
    const produto = {
        name: document.getElementById('nome-prod').value,
        price: parseFloat(document.getElementById('preco-prod').value),
        description: document.getElementById('desc-prod').value,
        image_url: document.getElementById('img-prod').value,
        stock: parseInt(document.getElementById('estoque-prod').value)
    };

    if (!produto.name || !produto.price) return alert("Nome e Preço são obrigatórios!");

    const resposta = await fetch('http://localhost:8080/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(produto)
    });

    if (resposta.ok) {
        alert("Produto cadastrado com sucesso!");
        window.location.reload(); 
    }
}

// Preenche o formulário de edição com os dados do produto selecionado
function prepararEdicao(id, nome, preco, desc, img, estoque) {
    document.getElementById('id-prod').value = id;
    document.getElementById('nome-prod').value = nome;
    document.getElementById('preco-prod').value = preco;
    document.getElementById('desc-prod').value = desc;
    document.getElementById('img-prod').value = img;
    document.getElementById('estoque-prod').value = estoque;

    // Altera a interface para o "Modo de Edição"
    document.getElementById('titulo-painel').innerText = "Editando Produto #" + id;
    document.getElementById('btn-salvar').innerText = "Confirmar Alteração";
    document.getElementById('btn-salvar').onclick = confirmarEdicao;
    document.getElementById('btn-cancelar').style.display = "inline-block";
    window.scrollTo(0, 0); 
}

// Envia os dados atualizados do produto via PUT
async function confirmarEdicao() {
    const id = document.getElementById('id-prod').value;
    const produto = {
        name: document.getElementById('nome-prod').value,
        price: parseFloat(document.getElementById('preco-prod').value),
        description: document.getElementById('desc-prod').value,
        image_url: document.getElementById('img-prod').value,
        stock: parseInt(document.getElementById('estoque-prod').value)
    };

    const resposta = await fetch(`http://localhost:8080/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(produto)
    });

    if (resposta.ok) {
        alert("Produto atualizado!");
        window.location.reload();
    }
}

// Remove um produto do banco de dados
async function deletarProduto(id) {
    if (!confirm("Deseja mesmo remover?")) return;
    await fetch(`http://localhost:8080/api/products/${id}`, { method: 'DELETE' });
    location.reload();
}


// 4. INTERFACE E UTILITÁRIOS


// Exibe o modal de resumo da compra e calcula o valor total
function abrirModal() {
    const modal = document.getElementById('modal-checkout');
    const listaItens = document.getElementById('itens-carrinho');
    const totalSpan = document.getElementById('valor-total');
    listaItens.innerHTML = '';
    let total = 0;

    carrinho.forEach(item => {
        listaItens.innerHTML += `<div class="item-checkout"><span>${item.nome}</span><span>R$ ${item.preco.toFixed(2)}</span></div>`;
        total += item.preco;
    });

    totalSpan.innerText = total.toFixed(2);
    modal.style.display = "block";
}

// Funções para controle da barra lateral (Sidebar)
function toggleSidebar() {
    document.getElementById("sidebar").style.width = "250px";
}

function fecharSidebar() {
    document.getElementById("sidebar").style.width = "0";
}

function fecharModal() {
    document.getElementById('modal-checkout').style.display = "none";
}

// Sistema simples de autenticação para área administrativa
function irParaLogin() {
    const user = prompt("Usuário ADM:");
    const pass = prompt("Senha:");
    if (user === "admin" && pass === "adm123") {
        window.location.href = "admin.html";
    } else {
        alert("Acesso negado!");
    }
}

// Reseta o formulário administrativo
function limparFormulario() {
    window.location.reload();
}

// Filtro de busca em tempo real na vitrine de produtos
function filtrarProdutos() {
    const termo = document.getElementById('busca').value.toLowerCase();
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        const nomeProduto = card.querySelector('h3').innerText.toLowerCase();
        // Exibe apenas os cards que dão "match" com o texto digitado
        card.style.display = nomeProduto.includes(termo) ? "block" : "none";
    });
}

// Inicializa a aplicação carregando os produtos
carregarProdutos();
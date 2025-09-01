// Elementos
const btnPergunta = document.getElementById('btnPergunta');
const btnLimpa = document.getElementById('btnLimpa');
const userInput = document.getElementById('userInput');
const respContent = document.getElementById('respContent');
const respostaDiv = document.getElementById('resposta');
const error = document.getElementById('error');
const apiKeyInput = document.getElementById('apiKey');
const modelSelect = document.getElementById('modelSelect');
const themeCheckbox = document.getElementById('toggleThemeCheckbox');
const historyList = document.getElementById('historyList');
const copyBtn = document.getElementById('copyBtn');

// LocalStorage - API Key
if (localStorage.getItem('apiKey')) {
  apiKeyInput.value = localStorage.getItem('apiKey');
}
apiKeyInput.addEventListener('input', () => {
  localStorage.setItem('apiKey', apiKeyInput.value);
});

// Tema (dark/light)
function aplicarTema(tema) {
  if (tema === 'dark') {
    document.body.classList.add('dark');
    themeCheckbox.checked = true;
  } else {
    document.body.classList.remove('dark');
    themeCheckbox.checked = false;
  }
}
themeCheckbox.addEventListener('change', () => {
  const novoTema = themeCheckbox.checked ? 'dark' : 'light';
  localStorage.setItem('tema', novoTema);
  aplicarTema(novoTema);
});
aplicarTema(localStorage.getItem('tema') || 'light');

// Envia pergunta
btnPergunta.addEventListener('click', async () => {
  const pergunta = userInput.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const modelo = modelSelect.value;

  error.textContent = '';
  respContent.classList.add('hidden');
  error.classList.add('hidden');
  respostaDiv.textContent = '';

  if (!apiKey) {
    error.classList.remove('hidden');
    error.textContent = 'API Key é obrigatória';
    return;
  }

  if (!pergunta) {
    error.classList.remove('hidden');
    error.textContent = 'Digite uma pergunta.';
    return;
  }

  btnPergunta.disabled = true;
  btnPergunta.textContent = 'Carregando...';

  try {
    let resposta = await fetchIA(pergunta, apiKey, modelo);
    resposta = marked.parse(resposta);
    respostaDiv.innerHTML = resposta;
    respContent.classList.remove('hidden');
    salvarHistorico(pergunta, resposta);
    renderHistorico();
  } catch (erro) {
    error.classList.remove('hidden');
    error.innerHTML = `Erro: ${erro.message}`;

  } finally {
    btnPergunta.disabled = false;
    btnPergunta.textContent = 'Perguntar';
  }
});

// Limpar input
btnLimpa.addEventListener('click', () => {
  userInput.value = '';
  error.classList.add('hidden');
});

//função para Gemini
async function fetchGemini(pergunta, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: pergunta }] }]
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.error?.message || 'Erro na API Gemini');
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

// Função de requisição para a OpenAI
async function fetchIA(pergunta, apiKey, modelo) {
  if (modelo.startsWith("gemini")) {
    return await fetchGemini(pergunta, apiKey);
  }

  const endpoint = 'https://api.openai.com/v1/chat/completions';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelo,
      messages: [{ role: 'user', content: pergunta }],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.error?.message || 'Erro desconhecido');
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

//histórico
function salvarHistorico(pergunta, resposta) {
  let historico = JSON.parse(localStorage.getItem("historico") || "[]");
  historico.unshift({ pergunta, resposta });
  localStorage.setItem("historico", JSON.stringify(historico));
}

function renderHistorico() {
  if (!historyList) return;
  historyList.innerHTML = "";
  let historico = JSON.parse(localStorage.getItem("historico") || "[]");
  historico.forEach(item => {
    const div = document.createElement("div");
    div.classList.add("accordion-item");
  
    div.innerHTML = `
      <div class="accordion-header">${item.pergunta}</div>
      <div class="accordion-body">${item.resposta}</div>
    `;
  
    div.querySelector(".accordion-header").addEventListener("click", () => {
      const body = div.querySelector(".accordion-body");
      body.style.display = body.style.display === "block" ? "none" : "block";
    });
  
    historyList.appendChild(div);
  });
}
renderHistorico();

// copiar resposta
if (copyBtn) {
  copyBtn.addEventListener('click', () => {
    const texto = respostaDiv.innerText;
    if (texto) {
      navigator.clipboard.writeText(texto).then(() => {
        copyBtn.textContent = "✅ Copiado!";
        setTimeout(() => copyBtn.textContent = "Copiar", 2000);
      });
    }
  });
}
import type { GenesisInput, GenesisFile } from "./genesis-scaffold";

const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));

/** Professional, dependency-free WLC.IA starter. The AI endpoint is intentionally configurable, not simulated. */
export function buildWlcIaFiles(input: GenesisInput): GenesisFile[] {
  const projectName = input.name.trim() || "WLC.IA";
  const packageName = projectName.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "wlc-ia-app";
  const description = input.goal.trim() || "Uma experiência de inteligência artificial moderna.";
  const audience = input.audience?.trim() || "";
  const features = (input.features ?? "").split(/\n|;|,/).map((x) => x.trim()).filter(Boolean).slice(0, 12);
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#11131a" />
  <meta name="description" content="${esc(description)}" />
  <title>${esc(projectName)} — WLC.IA</title>
  <link rel="icon" href="public/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="src/styles.css" />
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar" id="sidebar" aria-label="Conversas">
      <div class="sidebar-top"><a class="brand" href="#" aria-label="WLC.IA"><span class="brand-mark">W</span><span>WLC<span class="brand-dot">.IA</span></span></a><button class="icon-button sidebar-close" id="close-sidebar" aria-label="Fechar menu">×</button></div>
      <button class="new-chat" id="new-chat"><span>＋</span> Nova conversa</button>
      <div class="history-heading">RECENTES</div><div class="history-list" id="history-list"></div>
      <div class="sidebar-bottom"><div class="connection-indicator" id="connection-status"><span class="status-dot"></span><span>IA não configurada</span></div><button class="settings-button" id="settings-button">⚙ <span>Configurações</span></button></div>
    </aside>
    <div class="mobile-scrim" id="mobile-scrim"></div>
    <main class="main-panel">
      <header class="topbar"><button class="icon-button menu-button" id="menu-button" aria-label="Abrir menu">☰</button><div class="topbar-title">WLC.IA <span class="model-pill">Assistente</span></div><button class="icon-button" id="clear-chat" title="Limpar conversa" aria-label="Limpar conversa">⌫</button></header>
      <section class="conversation" id="conversation" aria-live="polite"><div class="welcome" id="welcome"><div class="welcome-logo">W</div><p class="eyebrow">${esc(projectName)}</p><h1>Como posso ajudar?</h1><p class="welcome-copy">${esc(description)}</p><div class="suggestions"><button class="suggestion" data-prompt="Me ajude a organizar minhas ideias">Organize minhas ideias <span>↗</span></button><button class="suggestion" data-prompt="Explique um assunto de forma simples e completa">Explique algo <span>↗</span></button><button class="suggestion" data-prompt="Me ajude a criar um plano passo a passo">Crie um plano <span>↗</span></button><button class="suggestion" data-prompt="Revise este texto e sugira melhorias">Revise um texto <span>↗</span></button></div></div><div class="messages" id="messages"></div></section>
      <footer class="composer-area"><form class="composer" id="composer"><textarea id="message-input" rows="1" placeholder="Envie uma mensagem para WLC.IA..." aria-label="Mensagem"></textarea><button class="send-button" id="send-button" type="submit" aria-label="Enviar mensagem">↑</button></form><p class="disclaimer">Verifique informações importantes. Use a inteligência local ou conecte um modelo externo nas configurações.</p></footer>
    </main>
  </div>
  <dialog id="settings-dialog" class="settings-dialog"><form method="dialog"><button class="dialog-close" aria-label="Fechar">×</button></form><h2>Configuração da inteligência</h2><p>Conecte seu endpoint compatível. As mensagens só serão enviadas quando a conexão estiver configurada.</p><label for="endpoint-input">Endpoint de chat</label><input id="endpoint-input" type="url" placeholder="https://seu-servidor.example/api/chat"/><label for="token-input">Token (opcional)</label><input id="token-input" type="password" autocomplete="off" placeholder="Token de acesso"/><div class="dialog-actions"><button class="button-secondary" id="clear-settings" type="button">Remover conexão</button><button class="button-primary" id="save-settings" type="button">Salvar configuração</button></div><small>O token fica armazenado somente neste navegador. Evite configurar credenciais em dispositivos compartilhados.</small></dialog>
  <script type="module" src="src/app.js"></script>
</body>
</html>`;
  const css = `:root{color-scheme:dark;--bg:#11131a;--panel:#191c25;--panel2:#202430;--border:#2b303d;--text:#eef0f6;--muted:#9ba3b5;--accent:#a4a7ff;--accent2:#777aff;--radius:16px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--bg);color:var(--text)}body{min-height:100dvh}.app-shell{display:flex;width:100%;height:100dvh;min-width:0}.sidebar{width:280px;flex:0 0 280px;background:#151720;border-right:1px solid var(--border);display:flex;flex-direction:column;padding:16px;min-width:0}.sidebar-top{display:flex;align-items:center;justify-content:space-between;padding:4px 2px 20px}.brand{display:flex;gap:10px;align-items:center;color:var(--text);text-decoration:none;font-weight:750;font-size:17px;letter-spacing:-.4px}.brand-mark,.welcome-logo{display:grid;place-items:center;background:linear-gradient(145deg,#8c8fff,#5c61d7);color:#fff;font-weight:800;border-radius:12px;width:34px;height:34px;box-shadow:0 8px 25px #6669df30}.brand-dot{color:#a4a7ff}.new-chat{display:flex;align-items:center;gap:10px;width:100%;border:1px solid var(--border);background:transparent;color:var(--text);border-radius:12px;padding:12px;text-align:left;font-size:14px;cursor:pointer}.new-chat:hover,.settings-button:hover,.history-item:hover{background:var(--panel2)}.new-chat span{font-size:18px;color:var(--accent)}.history-heading{font-size:10px;font-weight:700;letter-spacing:1.2px;color:#737b8d;padding:24px 8px 10px}.history-list{overflow:auto;flex:1;min-height:0;display:flex;flex-direction:column;gap:3px}.history-item{display:flex;align-items:center;gap:8px;text-align:left;border:0;background:transparent;color:var(--muted);padding:10px;border-radius:9px;cursor:pointer;font-size:13px;min-width:0}.history-item.active{background:#262a36;color:var(--text)}.history-item span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sidebar-bottom{border-top:1px solid var(--border);padding-top:12px;display:grid;gap:8px}.connection-indicator{display:flex;align-items:center;gap:8px;padding:8px;color:var(--muted);font-size:12px}.status-dot{width:7px;height:7px;border-radius:50%;background:#e5a64a}.status-dot.connected{background:#62d39b}.settings-button{border:0;background:transparent;color:var(--muted);text-align:left;border-radius:9px;padding:10px;cursor:pointer}.main-panel{display:flex;flex:1;min-width:0;min-height:0;flex-direction:column}.topbar{height:62px;flex:0 0 62px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;padding:0 22px}.topbar-title{font-size:14px;font-weight:650;display:flex;align-items:center;gap:9px}.model-pill{font-size:11px;font-weight:500;color:var(--muted);border:1px solid var(--border);border-radius:99px;padding:4px 8px}.icon-button{width:36px;height:36px;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--muted);font-size:17px;cursor:pointer}.icon-button:hover{background:var(--panel2);color:var(--text)}.menu-button,.sidebar-close{display:none}.conversation{flex:1;min-height:0;overflow:auto;scroll-behavior:smooth;padding:32px 20px}.welcome{width:min(720px,100%);margin:8vh auto 0;text-align:center}.welcome-logo{width:54px;height:54px;border-radius:18px;font-size:22px;margin:0 auto 24px}.eyebrow{color:var(--accent);font-size:12px;letter-spacing:.12em;text-transform:uppercase}.welcome h1{font-size:clamp(28px,4vw,42px);line-height:1.15;letter-spacing:-1.3px;margin:12px 0}.welcome-copy{color:var(--muted);max-width:560px;margin:0 auto;line-height:1.7}.suggestions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:34px auto 0;max-width:620px}.suggestion{display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;border:1px solid var(--border);background:#171a22;color:#cfd3df;border-radius:13px;padding:14px;font-size:13px;cursor:pointer}.suggestion:hover{border-color:#6266ba;background:#202331}.suggestion span{color:var(--accent)}.messages{width:min(800px,100%);margin:0 auto;display:flex;flex-direction:column;gap:24px}.message{display:flex;gap:12px;align-items:flex-start;min-width:0}.message.user{justify-content:flex-end}.message-avatar{flex:0 0 30px;height:30px;display:grid;place-items:center;border-radius:10px;background:linear-gradient(145deg,#8c8fff,#5c61d7);font-weight:750;font-size:12px}.message.user .message-avatar{background:#303543;color:#e7e9f0}.message-content{max-width:min(78%,680px);min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7;font-size:14px}.message.user .message-content{background:#262a36;padding:12px 15px;border-radius:16px 16px 5px 16px}.message.assistant .message-content{padding-top:3px}.message.error .message-content{color:#ff9b9b}.composer-area{padding:14px 20px 16px}.composer{width:min(800px,100%);margin:0 auto;display:flex;align-items:flex-end;gap:10px;background:#1a1d26;border:1px solid #343948;border-radius:18px;padding:10px 11px 10px 16px;box-shadow:0 10px 40px #0002}.composer:focus-within{border-color:#666ad0}.composer textarea{flex:1;min-width:0;max-height:180px;resize:none;border:0;outline:0;background:transparent;color:var(--text);font:inherit;line-height:1.5;padding:5px 0}.composer textarea::placeholder{color:#81899a}.send-button{width:36px;height:36px;flex:0 0 36px;border:0;border-radius:11px;background:var(--accent);color:#171821;font-size:22px;font-weight:700;cursor:pointer}.send-button:disabled{opacity:.45;cursor:default}.disclaimer{text-align:center;font-size:10px;color:#737b8d;margin:10px 0 0}.settings-dialog{width:min(440px,calc(100% - 24px));background:var(--panel);color:var(--text);border:1px solid var(--border);border-radius:18px;padding:24px;box-shadow:0 24px 80px #0008}.settings-dialog::backdrop{background:#05060acc;backdrop-filter:blur(4px)}.settings-dialog h2{font-size:20px;margin:8px 0}.settings-dialog p,.settings-dialog small{color:var(--muted);font-size:13px;line-height:1.55}.settings-dialog label{display:block;margin:18px 0 7px;font-size:12px;color:#c8cbd5}.settings-dialog input{width:100%;min-width:0;background:#11131a;border:1px solid var(--border);border-radius:9px;padding:11px;color:var(--text);font:inherit}.dialog-close{float:right;background:transparent;border:0;color:var(--muted);font-size:24px;cursor:pointer}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin:20px 0}.button-primary,.button-secondary{border:1px solid var(--border);border-radius:9px;padding:10px 12px;cursor:pointer;font-weight:600}.button-primary{background:var(--accent);color:#161722;border-color:transparent}.button-secondary{background:transparent;color:var(--text)}.empty-history{color:#747b8b;font-size:12px;padding:8px}.mobile-scrim{display:none}button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:2px}@media(max-width:760px){.sidebar{position:fixed;inset:0 auto 0 0;z-index:5;width:min(300px,85vw);transform:translateX(-102%);transition:transform .22s ease;box-shadow:15px 0 50px #0004}.sidebar.open{transform:translateX(0)}.mobile-scrim.show{display:block;position:fixed;inset:0;background:#0008;z-index:4}.menu-button,.sidebar-close{display:inline-grid;place-items:center}.topbar{padding:0 12px}.conversation{padding:22px 14px}.welcome{margin-top:5vh}.suggestions{grid-template-columns:1fr;margin-top:24px}.composer-area{padding:10px 12px 12px}.message-content{max-width:86%;font-size:13px}.disclaimer{font-size:9px}.sidebar-top{padding-bottom:14px}}@media(max-width:380px){.topbar-title{font-size:13px}.model-pill{display:none}.welcome h1{font-size:28px}.composer{padding-left:12px}.message-content{max-width:90%}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important}}
`;
  const intelligenceJs = `/* WLC.IA Intelligence Core v0.1 — local, transparent and extensible. */
const WLC_IDENTITY = ${JSON.stringify(projectName)};
const WLC_DESCRIPTION = ${JSON.stringify(description)};
const DEVELOPMENT = [
  "pesquisa na internet e notícias em tempo real",
  "análise direta de imagens, áudio e vídeos",
  "execução de ferramentas e ações externas",
  "memória permanente entre dispositivos",
  "conexão automática com serviços e modelos externos"
];
const normalize = (text) => String(text || "").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9\\s]/g, " ").replace(/\\s+/g, " ").trim();
const has = (text, patterns) => { const padded = " " + text + " "; return patterns.some((pattern) => padded.includes(" " + pattern + " ")); };
function answerIntent(raw, history = []) {
  const text = normalize(raw);
  if (!text) return "Pode me enviar sua pergunta? Estou aqui para conversar.";
  if (has(text, ["oi", "ola", "e ai", "bom dia", "boa tarde", "boa noite", "salve", "tudo bem", "como vai"])) {
    return "Olá! 😊 Estou aqui e pronto para conversar, ajudar a organizar ideias, explicar assuntos e escrever com você. O que você gostaria de fazer?";
  }
  if (has(text, ["obrigado", "obrigada", "valeu", "agradeco", "brigado"])) {
    return "Por nada! 😊 Fico feliz em ajudar. Se quiser continuar, é só me dizer.";
  }
  if (has(text, ["tchau", "ate mais", "vou embora", "encerrar conversa"])) {
    return "Até mais! Estarei por aqui quando quiser continuar. 👋";
  }
  if (has(text, ["quem e voce", "quem voce e", "seu nome", "como voce se chama", "como voce funciona", "o que e voce", "sobre voce", "quem te criou", "quem desenvolveu"])) {
    return "Sou o WLC.IA, um assistente digital em desenvolvimento. Minha camada inicial de inteligência funciona com conhecimento local, reconhecimento de intenções e contexto básico. Ainda não sou um modelo de IA generativa completo; estou sendo desenvolvido para evoluir e receber novas capacidades com transparência.";
  }
  if (has(text, ["o que voce consegue", "o que voce faz", "suas capacidades", "suas habilidades", "como pode ajudar", "pode me ajudar"])) {
    return "Nesta versão, consigo manter uma conversa básica, responder algumas perguntas sobre minha identidade e funcionamento, ajudar a estruturar ideias, criar textos e planos simples e explicar conceitos gerais quando tenho conhecimento suficiente. Recursos avançados ainda estão em desenvolvimento.";
  }
  if (has(text, ["wlc ia", "wlc.ia", "seu projeto", "seu sistema", "objetivo do wlc", "como funciona"])) {
    return "O WLC.IA é um assistente que está sendo construído para oferecer uma experiência de conversa inteligente. Esta primeira etapa inclui um núcleo local de interação, reconhecimento de intenções, respostas sobre sua identidade e um fallback transparente. A integração com modelos externos e recursos avançados está em desenvolvimento.";
  }
  if (has(text, ["internet", "pesquisar na web", "pesquisa online", "noticias de hoje", "noticia atual", "em tempo real", "hoje aconteceu", "hoje", "agora", "cotacao", "preco do dolar", "preco atual"])) {
    return "Ainda não tenho acesso à internet nem a informações em tempo real. Essa capacidade está em desenvolvimento no WLC.IA. Não quero inventar dados atuais; quando essa integração estiver disponível, poderei consultar fontes atualizadas.";
  }
  if (has(text, ["imagem", "foto", "video", "vídeo", "audio", "arquivo", "anexo", "documento"])) {
    return "Ainda não consigo analisar anexos, imagens, áudio ou vídeos diretamente nesta versão. Essa capacidade está em desenvolvimento no WLC.IA. Se você descrever o conteúdo em texto, posso tentar ajudar com base no que entendo.";
  }
  if (has(text, ["programar", "codigo", "javascript", "typescript", "html", "css", "python", "site", "aplicativo", "app"])) {
    return "Posso ajudar a pensar em soluções de programação, explicar conceitos e elaborar exemplos ou estruturas de código usando meu conhecimento local. Porém, ainda não consigo executar, testar ou acessar arquivos por conta própria. Integrações de desenvolvimento mais avançadas estão em desenvolvimento.";
  }
  if (has(text, ["inteligencia artificial", "o que e ia", "o que e uma ia", "como funciona uma ia"])) {
    return "Inteligência artificial é uma área da computação que desenvolve sistemas capazes de executar tarefas que normalmente exigem capacidades associadas à inteligência humana, como reconhecer padrões, compreender linguagem, gerar conteúdo ou apoiar decisões. Existem abordagens diferentes: sistemas baseados em regras, modelos de aprendizado de máquina e modelos generativos. Meu núcleo atual é uma camada local baseada em regras e conhecimento definido, não um grande modelo generativo.";
  }
  if (has(text, ["memoria", "lembrar", "lembra de mim", "conversa anterior"])) {
    return "Consigo usar o histórico que está presente nesta conversa enquanto ele é enviado ao meu núcleo local. Ainda não tenho memória permanente inteligente entre conversas ou dispositivos. Essa capacidade está em desenvolvimento.";
  }
  if (has(text, ["sentimento", "voce sente", "voce tem emocao", "esta feliz", "esta triste"])) {
    return "Não tenho sentimentos ou consciência. Posso reconhecer o tom de uma mensagem e responder de maneira acolhedora, mas isso não significa que eu vivencie emoções.";
  }
  if (has(text, ["ajuda", "o que posso perguntar", "comecar", "comandos", "exemplos"])) {
    return "Você pode conversar comigo normalmente, perguntar sobre o WLC.IA, pedir ajuda para organizar ideias, criar textos, elaborar planos ou explicar conceitos. Se eu não tiver conhecimento suficiente ou a função ainda não existir, vou avisar em vez de inventar uma resposta.";
  }
  // Short conversational follow-up: use previous context to avoid a completely disconnected reply.
  const previousUser = [...history].reverse().find((message) => message && message.role === "user" && message.content && normalize(message.content) !== text);
  if (text.length < 48 && previousUser && has(text, ["por que", "como assim", "explique", "detalhe", "e isso", "e como", "mais"])) {
    return "Entendi que você está retomando o assunto anterior: “" + previousUser.content.slice(0, 180) + "”. Ainda preciso de mais conhecimento específico para responder com segurança. Se você explicar qual parte quer aprofundar, tentarei ajudar com o que está disponível.";
  }
  return "Ainda não tenho conhecimento suficiente para responder com segurança a essa pergunta. Essa capacidade de compreensão e conhecimento mais amplo está em desenvolvimento no WLC.IA. Prefiro ser transparente em vez de inventar uma resposta. Se você reformular ou compartilhar mais contexto, posso tentar ajudar.";
}
export const localIntelligence = {
  version: "0.1.0",
  name: WLC_IDENTITY,
  description: WLC_DESCRIPTION,
  reply(messages) {
    const list = Array.isArray(messages) ? messages : [];
    const last = [...list].reverse().find((message) => message && message.role === "user");
    return answerIntent(last?.content || "", list.slice(-12));
  }
};
`;
  const js = `/* WLC.IA chat UI with local Intelligence Core and optional external AI endpoint. */
import { localIntelligence } from "./intelligence.js";
const STORAGE_KEY = "wlc-ia-chat-v1";
const SETTINGS_KEY = "wlc-ia-settings-v1";
const $ = (id) => document.getElementById(id);
const state = { chats: [], activeId: null, settings: { endpoint: "", token: "" }, busy: false };
const safe = (text) => String(text).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
function load(){try{state.chats=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");state.settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{"endpoint":"","token":""}')}catch{state.chats=[];state.settings={endpoint:"",token:""}}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state.chats));localStorage.setItem(SETTINGS_KEY,JSON.stringify(state.settings))}
function active(){return state.chats.find(c=>c.id===state.activeId)}
function newChat(){const c={id:uid(),title:"Nova conversa",messages:[],updatedAt:Date.now()};state.chats.unshift(c);state.activeId=c.id;save();render()}
function renderHistory(){const host=$("history-list");host.innerHTML=state.chats.length?state.chats.map(c=>'<button class="history-item '+(c.id===state.activeId?'active':'')+'" data-chat="'+safe(c.id)+'" title="'+safe(c.title)+'"><span>◷</span><span>'+safe(c.title)+'</span></button>').join():'<div class="empty-history">Suas conversas aparecerão aqui.</div>';host.querySelectorAll("[data-chat]").forEach(b=>b.addEventListener("click",()=>{state.activeId=b.dataset.chat;render();closeSidebar()}))}
function renderMessages(){const c=active(),host=$("messages"),welcome=$("welcome");welcome.hidden=!!(c&&c.messages.length);host.innerHTML=c?c.messages.map(m=>'<article class="message '+safe(m.role)+'"><div class="message-avatar">'+(m.role==="assistant"?"W":"•")+'</div><div class="message-content '+(m.error?"error":"")+'">'+safe(m.content)+'</div></article>').join():"";host.querySelectorAll(".message-content").forEach(el=>el.scrollIntoView({block:"nearest"}));$("conversation").scrollTop=$("conversation").scrollHeight}
function render(){renderHistory();renderMessages();const connected=!!state.settings.endpoint;$("connection-status").innerHTML='<span class="status-dot '+(connected?"connected":"")+'"></span><span>'+(connected?"Endpoint externo configurado":"Inteligência local ativa")+'</span>';}
function closeSidebar(){$("sidebar").classList.remove("open");$("mobile-scrim").classList.remove("show")}
function openSettings(){$("endpoint-input").value=state.settings.endpoint||"";$("token-input").value=state.settings.token||"";$("settings-dialog").showModal()}
function setBusy(v){state.busy=v;$("send-button").disabled=v}
async function requestAI(messages){if(!state.settings.endpoint)return localIntelligence.reply(messages);const response=await fetch(state.settings.endpoint,{method:"POST",headers:{"Content-Type":"application/json",...(state.settings.token?{Authorization:"Bearer "+state.settings.token}:{})},body:JSON.stringify({messages,project:"WLC.IA",system:"Você é o WLC.IA. Seja honesto sobre suas limitações e não invente funcionalidades que ainda estão em desenvolvimento."})});if(!response.ok)throw new Error("Serviço de IA respondeu "+response.status+".");const data=await response.json();return data.reply??data.content??data.message??data.choices?.[0]?.message?.content??"Resposta recebida em formato não reconhecido."}
async function send(text){const content=text.trim();if(!content||state.busy)return;if(!active())newChat();const c=active();c.messages.push({role:"user",content});if(c.messages.length===1)c.title=content.slice(0,48)+(content.length>48?"…":"");c.updatedAt=Date.now();save();render();setBusy(true);try{const reply=await requestAI(c.messages.map(({role,content})=>({role,content})));c.messages.push({role:"assistant",content:String(reply)});}catch(err){c.messages.push({role:"assistant",content:err.message||"Não foi possível conectar.",error:true})}finally{setBusy(false);c.updatedAt=Date.now();save();render()}}
$("composer").addEventListener("submit",e=>{e.preventDefault();const input=$("message-input"),value=input.value;input.value="";input.style.height="auto";send(value)});
$("message-input").addEventListener("input",e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,180)+"px"});
$("message-input").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("composer").requestSubmit()}});
$("new-chat").addEventListener("click",newChat);$("clear-chat").addEventListener("click",()=>{if(active()){active().messages=[];active().title="Nova conversa";save();render()}});
$("menu-button").addEventListener("click",()=>{$("sidebar").classList.add("open");$("mobile-scrim").classList.add("show")});$("close-sidebar").addEventListener("click",closeSidebar);$("mobile-scrim").addEventListener("click",closeSidebar);
$("settings-button").addEventListener("click",openSettings);$("save-settings").addEventListener("click",()=>{state.settings.endpoint=$("endpoint-input").value.trim();state.settings.token=$("token-input").value;save();$("settings-dialog").close();render()});$("clear-settings").addEventListener("click",()=>{state.settings={endpoint:"",token:""};save();$("endpoint-input").value="";$("token-input").value="";render()});
document.querySelectorAll("[data-prompt]").forEach(b=>b.addEventListener("click",()=>send(b.dataset.prompt)));
load();if(state.chats.length)state.activeId=state.chats[0].id;else newChat();render();
`;
  const readme = `# ${projectName} — WLC.IA\n\n${description}\n\n${audience ? `**Público-alvo:** ${audience}\n\n` : ""}## Aplicação\n\nUma interface responsiva de chat com histórico local, criação de conversas, sugestões iniciais e um núcleo de inteligência local (v0.1). A conexão com modelo externo é opcional e configurável.\n\n${features.length ? `## Funcionalidades planejadas\n\n${features.map((f) => `- ${f}`).join("\n")}\n\n` : ""}## Estrutura\n\n- \`index.html\`: interface e metadados.\n- \`src/styles.css\`: design system e layout responsivo.\n- \`src/app.js\`: interface, histórico, armazenamento local e integração opcional.\n- \`src/intelligence.js\`: núcleo local, reconhecimento básico de intenções, conhecimento inicial e respostas transparentes para capacidades em desenvolvimento.\n- \`public/favicon.svg\`: ícone da aplicação.\n\n## Conectar uma IA\n\nAbra Configurações no chat e informe um endpoint HTTP que aceite POST com \`{ messages, project, system }\` e retorne JSON com \`reply\`, \`content\`, \`message\` ou \`choices[0].message.content\`. O token, quando informado, é enviado como Bearer. Configure um endpoint confiável e compatível com CORS.\n\nSem endpoint, o chat usa o núcleo local de inteligência: ele responde a interações comuns e perguntas conhecidas sobre o WLC.IA e declara suas limitações quando não tem conhecimento suficiente. Esse núcleo não é um modelo generativo amplo e não deve ser confundido com uma IA conectada. O token é armazenado no localStorage deste navegador. Para produção, prefira um backend próprio que gerencie credenciais.\n\n## Executar localmente\n\nRequer Node.js 20+. Instale e execute: \`npm install\`, \`npm run dev\`. Para gerar arquivos de produção: \`npm run build\`; use \`npm run preview\` para visualizar o build. Também é possível abrir \`index.html\` em um servidor estático.\n\n## Configuração\n\nNão há segredos no código. A configuração da conexão é feita pelo usuário na interface.\n`;
  return [
    { path: "index.html", content: html },
    { path: "src/styles.css", content: css },
    { path: "src/app.js", content: js },
    { path: "src/intelligence.js", content: intelligenceJs },
    { path: "package.json", content: JSON.stringify({ name: packageName, private: true, version: "1.0.0", type: "module", description: `${projectName} — chat WLC.IA`, scripts: { dev: "vite", build: "vite build", preview: "vite preview" }, devDependencies: { vite: "^7.1.0" } }, null, 2) + "\n" },
    { path: "vite.config.js", content: "import { defineConfig } from \"vite\";\n\nexport default defineConfig({\n  server: { host: \"0.0.0.0\" },\n});\n" },
    { path: "public/favicon.svg", content: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#777aff"/><path d="M17 13h8v28h22v8H17z" fill="#fff"/><path d="M17 13h8v16h22v8H17z" fill="#d8d9ff"/></svg>` },
    { path: "README.md", content: readme },
    { path: ".gitignore", content: "node_modules/\ndist/\n.env\n.DS_Store\n" },
    { path: ".env.example", content: "# No secret values required for the static starter. Configure the AI endpoint in the UI.\n" },
  ];
}

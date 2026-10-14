import { io, type Socket } from 'socket.io-client';
import {
  API_URL,
  SOCKET_URL,
  request,
  type ChatMessage,
  type Friend,
  type FriendRequest,
  type User,
} from './api';
import './style.css';

type LoginResult = { accessToken: string; user: User };

const root = document.querySelector<HTMLDivElement>('#app')!;
const logoUrl = chrome.runtime.getURL('icons/icon48.png');
root.innerHTML = `<header class="topbar"><div class="brand"><img class="logo" src="${logoUrl}" alt=""><div><strong>Ryuto</strong><small>MESSENGER</small></div></div><span id="connection" class="connection"><i></i> Desconectado</span></header><main id="screen"></main><div id="toast" class="toast" role="status"></div>`;

const screen = document.querySelector<HTMLElement>('#screen')!;
const connection = document.querySelector<HTMLElement>('#connection')!;
const toastEl = document.querySelector<HTMLElement>('#toast')!;
let token = '';
let me: User | null = null;
let friends: Friend[] = [];
let requests: FriendRequest[] = [];
let activeFriend: Friend | null = null;
let messages: ChatMessage[] = [];
let socket: Socket | null = null;
let view: 'login' | 'register' = 'login';
let toastTimer = 0;

const toast = (message: string) => {
  toastEl.textContent = message;
  toastEl.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => toastEl.classList.remove('visible'),
    3500,
  );
};

const esc = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';

function setConnection(online: boolean) {
  connection.innerHTML = `<i></i> ${online ? 'Conectado' : 'Desconectado'}`;
  connection.classList.toggle('online', online);
}

function renderAuth() {
  const registering = view === 'register';
  screen.innerHTML = `<section class="auth"><div class="eyebrow">SEUS AMIGOS, UM PASSO DE VOCÊ</div><h1>${registering ? 'Crie sua conta' : 'É bom te ver.'}</h1><p class="muted">${registering ? 'Crie sua conta Ryuto e comece a conversar.' : 'Entre na sua conta para continuar conversando.'}</p><form id="auth-form" class="form"><label>Nome de usuário<input name="username" autocomplete="username" placeholder="seu_usuario" required minlength="3" maxlength="30" pattern="[A-Za-z0-9_]+"></label><label>Senha<input name="password" type="password" autocomplete="${registering ? 'new-password' : 'current-password'}" placeholder="${registering ? '8+ caracteres, maiúscula, minúscula e número' : 'Sua senha'}" required minlength="${registering ? 8 : 1}" maxlength="72" ${registering ? 'pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,72}" title="Use pelo menos 8 caracteres, incluindo uma letra maiúscula, uma minúscula e um número."' : ''}></label><button class="primary" type="submit">${registering ? 'Criar conta' : 'Entrar'}<span>→</span></button></form><p class="switch">${registering ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'} <button id="switch-auth" class="text-button">${registering ? 'Fazer login' : 'Criar conta'}</button></p><p class="auth-foot">Servidor: <code>${esc(API_URL)}</code></p></section>`;

  document
    .querySelector<HTMLFormElement>('#auth-form')!
    .addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget as HTMLFormElement;
      const data = new FormData(form);
      const username = String(data.get('username')).trim();
      const password = String(data.get('password'));
      const button = form.querySelector<HTMLButtonElement>('button')!;
      button.disabled = true;
      button.textContent = registering ? 'Criando conta…' : 'Entrando…';

      try {
        if (registering) {
          await request<User>('/auth/register', undefined, {
            method: 'POST',
            body: JSON.stringify({ username, password }),
          });
          view = 'login';
          renderAuth();
          toast('Conta criada! Agora entre com seus dados.');
          return;
        }

        const result = await request<LoginResult>('/auth/login', undefined, {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });
        if (!result.accessToken || !result.user?.id || !result.user.username) {
          throw new Error('Resposta de autenticação inválida.');
        }

        token = result.accessToken;
        me = result.user;
        await chrome.storage.local.set({ orbitToken: token, orbitUser: me });
        renderApp();
      } catch (error) {
        toast(errorMessage(error));
        button.disabled = false;
        button.innerHTML = `${registering ? 'Criar conta' : 'Entrar'}<span>→</span>`;
      }
    });

  document
    .querySelector<HTMLButtonElement>('#switch-auth')!
    .addEventListener('click', () => {
      view = registering ? 'login' : 'register';
      renderAuth();
    });
}

function renderApp() {
  screen.innerHTML = `<section class="app-shell"><aside class="sidebar"><div class="profile"><div class="avatar">${esc((me?.username || '?').slice(0, 1).toUpperCase())}</div><div class="profile-copy"><strong>${esc(me?.username || 'Minha conta')}</strong><small>Conta Ryuto</small></div><button id="logout" class="icon-button" title="Sair da conta" aria-label="Sair da conta">↗</button></div><div class="section-heading"><span>CONVERSAS</span><button id="refresh" class="icon-button" title="Atualizar" aria-label="Atualizar">↻</button></div><div id="friends" class="friend-list"><div class="empty-small">Carregando contatos…</div></div><div class="add-friend"><div class="section-heading"><span>ADICIONAR AMIGO</span></div><form id="add-friend-form" class="add-form"><input name="username" placeholder="Nome de usuário" required minlength="3" maxlength="30" pattern="[A-Za-z0-9_]+"><button class="square-button" aria-label="Enviar convite">+</button></form></div><div class="requests"><div class="section-heading"><span>CONVITES RECEBIDOS</span><span id="request-count" class="count">0</span></div><div id="requests-list" class="requests-list"></div></div></aside><section class="chat"><div id="chat-content" class="chat-empty"><div class="empty-art">✳</div><h2>Sua próxima conversa<br>começa aqui.</h2><p>Escolha um contato ou envie um convite para começar.</p></div></section></section>`;

  document.querySelector<HTMLButtonElement>('#logout')!.onclick = () =>
    void logout();
  document.querySelector<HTMLButtonElement>('#refresh')!.onclick = () =>
    void refreshLists();
  document.querySelector<HTMLFormElement>('#add-friend-form')!.onsubmit =
    sendFriendRequest;
  void refreshLists();
  connectSocket();
}

async function refreshLists() {
  try {
    const [friendships, incomingRequests] = await Promise.all([
      request<{ friendshipId: string; friend: Friend }[]>('/friends', token),
      request<FriendRequest[]>('/friends/requests/incoming', token),
    ]);
    friends = friendships.map(({ friend }) => friend);
    requests = incomingRequests;
    renderFriends();
    renderRequests();
  } catch (error) {
    const friendList = document.querySelector<HTMLElement>('#friends');
    if (friendList) {
      friendList.innerHTML =
        '<div class="empty-small">Não foi possível carregar seus contatos.</div>';
    }
    const requestList = document.querySelector<HTMLElement>('#requests-list');
    if (requestList) {
      requestList.innerHTML =
        '<div class="empty-small">Não foi possível carregar os convites.</div>';
    }
    toast(`Falha ao carregar contatos: ${errorMessage(error)}`);
  }
}

function renderFriends() {
  const element = document.querySelector<HTMLElement>('#friends');
  if (!element) return;
  if (!friends.length) {
    element.innerHTML =
      '<div class="empty-small">Você ainda não tem contatos.<br>Adicione alguém acima.</div>';
    return;
  }

  element.innerHTML = friends
    .map(
      (friend, index) =>
        `<button class="friend ${activeFriend?.id === friend.id ? 'active' : ''}" data-id="${esc(friend.id)}"><span class="avatar friend-avatar color-${(index % 4) + 1}">${esc(friend.username.slice(0, 1).toUpperCase())}<i></i></span><span class="friend-copy"><strong>${esc(friend.username)}</strong><small>Contato Ryuto</small></span><span class="friend-arrow">›</span></button>`,
    )
    .join('');

  element.querySelectorAll<HTMLButtonElement>('.friend').forEach((button) => {
    button.onclick = () => {
      const friend = friends.find((item) => item.id === button.dataset.id);
      if (friend) void openChat(friend);
    };
  });
}

function renderRequests() {
  const element = document.querySelector<HTMLElement>('#requests-list');
  const count = document.querySelector<HTMLElement>('#request-count');
  if (!element || !count) return;
  count.textContent = String(requests.length);
  if (!requests.length) {
    element.innerHTML =
      '<div class="empty-small">Nenhum convite pendente.</div>';
    return;
  }

  element.innerHTML = requests
    .map(
      (requestItem) =>
        `<div class="request-row"><span class="request-avatar">${esc(requestItem.requester.username.slice(0, 1).toUpperCase())}</span><span class="request-copy"><strong>${esc(requestItem.requester.username)}</strong><small>Enviou um convite</small></span><button class="accept-button" data-id="${esc(requestItem.id)}" title="Aceitar convite" aria-label="Aceitar convite">✓</button></div>`,
    )
    .join('');

  element.querySelectorAll<HTMLButtonElement>('.accept-button').forEach((button) => {
    button.onclick = async () => {
      const friendshipId = button.dataset.id;
      if (!friendshipId) return;
      try {
        await request(
          `/friends/requests/${encodeURIComponent(friendshipId)}/accept`,
          token,
          { method: 'PATCH' },
        );
        toast('Convite aceito.');
        await refreshLists();
      } catch (error) {
        toast(errorMessage(error));
      }
    };
  });
}

async function sendFriendRequest(event: SubmitEvent) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const input = form.elements.namedItem('username') as HTMLInputElement;

  try {
    await request('/friends/requests', token, {
      method: 'POST',
      body: JSON.stringify({ username: input.value.trim() }),
    });
    input.value = '';
    toast('Convite de amizade enviado.');
    await refreshLists();
  } catch (error) {
    toast(errorMessage(error));
  }
}

async function openChat(friend: Friend) {
  activeFriend = friend;
  messages = [];
  renderFriends();
  const chat = document.querySelector<HTMLElement>('#chat-content')!;
  chat.className = 'chat-view';
  chat.innerHTML = `<div class="chat-header"><div class="avatar">${esc(friend.username.slice(0, 1).toUpperCase())}</div><div><strong>${esc(friend.username)}</strong><small><span class="online-dot"></span> Ryuto</small></div></div><div id="message-list" class="message-list"><div class="loading">Carregando conversa…</div></div><form id="message-form" class="message-form"><input name="content" autocomplete="off" placeholder="Escreva uma mensagem…" maxlength="4000" required><button class="send-button" aria-label="Enviar mensagem">↑</button></form>`;
  document.querySelector<HTMLFormElement>('#message-form')!.onsubmit =
    sendMessage;

  try {
    messages = await request<ChatMessage[]>(
      `/messages/${encodeURIComponent(friend.id)}`,
      token,
    );
    renderMessages();
  } catch (error) {
    const list = document.querySelector<HTMLElement>('#message-list');
    if (list) {
      list.innerHTML = `<div class="empty-chat">Não foi possível carregar o histórico.<br><small>${esc(errorMessage(error))}</small></div>`;
    }
  }
}

function renderMessages() {
  const element = document.querySelector<HTMLElement>('#message-list');
  if (!element) return;
  if (!messages.length) {
    element.innerHTML =
      '<div class="empty-chat">Ainda não há mensagens. Diga oi 👋</div>';
    return;
  }

  element.innerHTML = messages
    .map((message) => {
      const mine = message.senderId === me?.id;
      const time = new Date(message.createdAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `<div class="message-row ${mine ? 'mine' : ''}"><div class="bubble">${esc(message.content)}<small>${esc(time)}</small></div></div>`;
    })
    .join('');
  element.scrollTop = element.scrollHeight;
}

function addMessage(message: ChatMessage) {
  if (messages.some((item) => item.id === message.id)) return;
  if (
    activeFriend &&
    (message.senderId === activeFriend.id ||
      message.receiverId === activeFriend.id)
  ) {
    messages.push(message);
    renderMessages();
  }
}

function sendMessage(event: SubmitEvent) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const input = form.elements.namedItem('content') as HTMLInputElement;
  const content = input.value.trim();
  if (!content || !activeFriend) return;
  if (!socket?.connected) return toast('Sem conexão com o chat em tempo real.');
  socket.emit('message:send', {
    receiverId: activeFriend.id,
    content,
  });
  input.value = '';
}

function connectSocket() {
  socket?.disconnect();
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  socket.on('connect', () => {
    setConnection(true);
    socket?.emit('user:online');
  });
  socket.on('disconnect', () => setConnection(false));
  socket.on('connect_error', (error) => {
    setConnection(false);
    toast(`Realtime indisponível: ${error.message}`);
  });
  socket.on('message:new', addMessage);
  socket.on('message:sent', addMessage);
  socket.on('message:error', ({ message }: { message: string }) =>
    toast(message),
  );
}

async function logout() {
  socket?.disconnect();
  socket = null;
  token = '';
  me = null;
  friends = [];
  requests = [];
  activeFriend = null;
  messages = [];
  await chrome.storage.local.remove(['orbitToken', 'orbitUser']);
  setConnection(false);
  view = 'login';
  renderAuth();
}

async function init() {
  try {
    const saved = await chrome.storage.local.get(['orbitToken', 'orbitUser']);
    if (saved.orbitToken && saved.orbitUser) {
      token = saved.orbitToken;
      me = saved.orbitUser as User;
      renderApp();
    } else {
      renderAuth();
    }
  } catch {
    toast('Não foi possível restaurar a sessão salva.');
    renderAuth();
  }
}

void init();

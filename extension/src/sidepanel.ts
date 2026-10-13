import { io, type Socket } from 'socket.io-client';
import {
  API_URL,
  SOCKET_URL,
  normaliseList,
  normaliseUser,
  request,
  type ChatMessage,
  type Friend,
  type User,
} from './api';
import './style.css';

type AuthResult = {
  access_token?: string;
  accessToken?: string;
  token?: string;
  user?: any;
  data?: any;
};
const root = document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML = `<header class="topbar"><div class="brand"><div class="logo">O</div><div><strong>Akyriu</strong><small>MESSENGER</small></div></div><span id="connection" class="connection"><i></i> Offline</span></header><main id="screen"></main><div id="toast" class="toast"></div>`;
const screen = document.querySelector<HTMLElement>('#screen')!;
const connection = document.querySelector<HTMLElement>('#connection')!;
const toastEl = document.querySelector<HTMLElement>('#toast')!;
let token = '',
  me: User | null = null,
  friends: Friend[] = [],
  requests: any[] = [],
  activeFriend: Friend | null = null,
  messages: ChatMessage[] = [],
  socket: Socket | null = null,
  view: 'login' | 'register' = 'login',
  toastTimer = 0;
const toast = (message: string) => {
  toastEl.textContent = message;
  toastEl.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(
    () => toastEl.classList.remove('visible'),
    3000,
  );
};
const esc = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
const err = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong.';
function setConnection(online: boolean) {
  connection.innerHTML = `<i></i> ${online ? 'Connected' : 'Offline'}`;
  connection.classList.toggle('online', online);
}
function renderAuth() {
  const register = view === 'register';
  screen.innerHTML = `<section class="auth"><div class="eyebrow">SEUS AMIGOS, UM PASSO DE VOCÊ</div><h1>${register ? 'Crie sua conta' : 'É bom te ver.'}</h1><p class="muted">${register ? 'Acesse Akyriu e inicie uma conversa.' : 'Entre em uma conta e continue conversando. '}</p><form id="auth-form" class="form">${register ? `<label>Nome no App<input name="name" placeholder="Your name" required minlength="2"></label>` : ''}<label>Seu endereço de Email<input name="email" type="email" placeholder="email@exemplo.com" required></label><label>Password<input name="password" type="password" placeholder="Senha" required minlength="8"></label><button class="primary" type="submit">${register ? 'Crie uma conta' : 'Entre'}<span>→</span></button></form><p class="switch">${register ? 'Já possui uma conta?' : 'É novo aqui?'} <button id="switch-auth" class="text-button">${register ? 'Entre' : 'Crie uma conta'}</button></p><p class="auth-foot">Servidor: <code>${esc(API_URL)}</code></p></section>`;
  document
    .querySelector<HTMLFormElement>('#auth-form')!
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      const data = new FormData(form);
      const button = form.querySelector<HTMLButtonElement>('button')!;
      button.disabled = true;
      button.textContent = 'Please wait…';
      try {
        const body: Record<string, string> = {
          email: String(data.get('email')),
          password: String(data.get('password')),
        };
        if (register) body.name = String(data.get('name'));
        const result = await request<AuthResult>(
          register ? '/auth/register' : '/auth/login',
          undefined,
          { method: 'POST', body: JSON.stringify(body) },
        );
        token =
          result.access_token ??
          result.accessToken ??
          result.token ??
          result.data?.access_token ??
          result.data?.accessToken ??
          '';
        if (!token)
          throw new Error('No JWT token in response; check README.md.');
        me = normaliseUser(result);
        await chrome.storage.local.set({ orbitToken: token, orbitUser: me });
        renderApp();
      } catch (e) {
        toast(err(e));
        button.disabled = false;
        button.textContent = register ? 'Crie uma conta' : 'Entrar';
      }
    });
  document
    .querySelector<HTMLButtonElement>('#switch-auth')!
    .addEventListener('click', () => {
      view = register ? 'login' : 'register';
      renderAuth();
    });
}
function renderApp() {
  screen.innerHTML = `<section class="app-shell"><aside class="sidebar"><div class="profile"><div class="avatar">${esc((me?.name || me?.email || 'Y').slice(0, 1).toUpperCase())}</div><div class="profile-copy"><strong>${esc(me?.name || 'Your account')}</strong><small>${esc(me?.email || '')}</small></div><button id="logout" class="icon-button" title="Sign out">↗</button></div><div class="section-heading"><span>CHATS</span><button id="refresh" class="icon-button">↻</button></div><div id="friends" class="friend-list"><div class="empty-small">Loading friends…</div></div><div class="add-friend"><div class="section-heading"><span>ADD A FRIEND</span></div><form id="add-friend-form" class="add-form"><input name="email" type="email" placeholder="Friend's email" required><button class="square-button">+</button></form></div><div class="requests"><div class="section-heading"><span>FRIEND REQUESTS</span><span id="request-count" class="count">0</span></div><div id="requests-list" class="requests-list"></div></div></aside><section class="chat"><div id="chat-content" class="chat-empty"><div class="empty-art">✳</div><h2>Sua próxima conversa<br>começa aqui.</h2><p>Choose a friend or send a friend request.</p></div></section></section>`;
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
    const [fr, rq] = await Promise.all([
      request<any>('/friends', token),
      request<any>('/friends/requests', token),
    ]);
    friends = normaliseList<any>(fr)
      .map((f) => ({
        id: String(f.id ?? f.userId ?? f.friend?.id ?? ''),
        name:
          f.name ??
          f.username ??
          f.friend?.name ??
          f.email ??
          f.friend?.email ??
          'Friend',
        email: f.email ?? f.friend?.email,
      }))
      .filter((f) => f.id);
    requests = normaliseList<any>(rq);
    renderFriends();
    renderRequests();
  } catch (e) {
    const f = document.querySelector<HTMLElement>('#friends');
    if (f)
      f.innerHTML = `<div class="empty-small">Could not load friends.</div>`;
    const r = document.querySelector<HTMLElement>('#requests-list');
    if (r)
      r.innerHTML = `<div class="empty-small">Could not load requests.</div>`;
    toast(`Loading friends failed: ${err(e)}`);
  }
}
function renderFriends() {
  const el = document.querySelector<HTMLElement>('#friends');
  if (!el) return;
  if (!friends.length) {
    el.innerHTML = `<div class="empty-small">No friends yet.<br>Add someone below.</div>`;
    return;
  }
  el.innerHTML = friends
    .map(
      (f, i) =>
        `<button class="friend ${activeFriend?.id === f.id ? 'active' : ''}" data-id="${esc(f.id)}"><span class="avatar friend-avatar color-${i % 5}">${esc((f.name || '?').slice(0, 1).toUpperCase())}<i></i></span><span class="friend-copy"><strong>${esc(f.name)}</strong><small>${esc(f.email || 'Orbit contact')}</small></span><span class="friend-arrow">›</span></button>`,
    )
    .join('');
  el.querySelectorAll<HTMLButtonElement>('.friend').forEach(
    (b) =>
      (b.onclick = () => {
        const f = friends.find((x) => x.id === b.dataset.id);
        if (f) void openChat(f);
      }),
  );
}
function renderRequests() {
  const el = document.querySelector<HTMLElement>('#requests-list'),
    count = document.querySelector<HTMLElement>('#request-count');
  if (!el || !count) return;
  count.textContent = String(requests.length);
  if (!requests.length) {
    el.innerHTML = `<div class="empty-small">No pending requests</div>`;
    return;
  }
  el.innerHTML = requests
    .map((r) => {
      const u = r.requester ?? r.from ?? r.user ?? r;
      return `<div class="request-row"><span class="request-avatar">${esc((u.name || u.email || '?').slice(0, 1).toUpperCase())}</span><span class="request-copy"><strong>${esc(u.name || u.email || 'New friend')}</strong><small>Wants to connect</small></span><button class="accept-button" data-id="${esc(r.id ?? r.requestId ?? '')}">✓</button></div>`;
    })
    .join('');
  el.querySelectorAll<HTMLButtonElement>('.accept-button').forEach(
    (b) =>
      (b.onclick = async () => {
        if (!b.dataset.id) return toast('Request ID missing in API response.');
        try {
          await request('/friends/accept', token, {
            method: 'POST',
            body: JSON.stringify({ requestId: b.dataset.id }),
          });
          toast('Friend request accepted.');
          await refreshLists();
        } catch (e) {
          toast(err(e));
        }
      }),
  );
}
async function sendFriendRequest(e: SubmitEvent) {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement,
    input = form.elements.namedItem('email') as HTMLInputElement;
  try {
    await request('/friends/request', token, {
      method: 'POST',
      body: JSON.stringify({ email: input.value.trim() }),
    });
    input.value = '';
    toast('Friend request sent.');
    await refreshLists();
  } catch (e) {
    toast(err(e));
  }
}
async function openChat(friend: Friend) {
  activeFriend = friend;
  messages = [];
  renderFriends();
  const chat = document.querySelector<HTMLElement>('#chat-content')!;
  chat.className = 'chat-view';
  chat.innerHTML = `<div class="chat-header"><div class="avatar">${esc((friend.name || '?').slice(0, 1).toUpperCase())}</div><div><strong>${esc(friend.name)}</strong><small><span class="online-dot"></span> Orbit contact</small></div></div><div id="message-list" class="message-list"><div class="loading">Loading conversation…</div></div><form id="message-form" class="message-form"><input name="content" autocomplete="off" placeholder="Write a message…" maxlength="4000" required><button class="send-button" aria-label="Send message">↑</button></form>`;
  document.querySelector<HTMLFormElement>('#message-form')!.onsubmit =
    sendMessage;
  try {
    messages = normaliseList<ChatMessage>(
      await request<any>(`/messages/${encodeURIComponent(friend.id)}`, token),
    );
    renderMessages();
  } catch (e) {
    const list = document.querySelector<HTMLElement>('#message-list');
    if (list)
      list.innerHTML = `<div class="empty-chat">Couldn't load history. Check the GET /messages/:otherUserId route in README.md.<br><small>${esc(err(e))}</small></div>`;
  }
}
function renderMessages() {
  const el = document.querySelector<HTMLElement>('#message-list');
  if (!el) return;
  if (!messages.length) {
    el.innerHTML = `<div class="empty-chat">No messages yet. Say hello 👋</div>`;
    return;
  }
  el.innerHTML = messages
    .map((m) => {
      const mine = String(m.senderId ?? (m as any).sender?.id ?? '') === me?.id;
      const time = m.createdAt
        ? new Date(m.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';
      return `<div class="message-row ${mine ? 'mine' : ''}"><div class="bubble">${esc(m.content ?? m.text ?? '')}<small>${esc(time)}</small></div></div>`;
    })
    .join('');
  el.scrollTop = el.scrollHeight;
}
function sendMessage(e: SubmitEvent) {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement,
    input = form.elements.namedItem('content') as HTMLInputElement,
    content = input.value.trim();
  if (!content || !activeFriend) return;
  if (!socket?.connected) return toast('Not connected to chat server.');
  socket.emit('sendMessage', { recipientId: activeFriend.id, content });
  messages.push({
    senderId: me?.id,
    recipientId: activeFriend.id,
    content,
    createdAt: new Date().toISOString(),
  });
  renderMessages();
  input.value = '';
}
function connectSocket() {
  socket?.disconnect();
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    auth: { token },
    extraHeaders: { Authorization: `Bearer ${token}` },
  });
  socket.on('connect', () => {
    setConnection(true);
    if (me?.id) socket?.emit('join', { userId: me.id });
  });
  socket.on('disconnect', () => setConnection(false));
  socket.on('connect_error', (e) => {
    setConnection(false);
    console.warn('Socket error:', e.message);
  });
  socket.on('message', (m: ChatMessage) => {
    const sender = String(m.senderId ?? (m as any).sender?.id ?? ''),
      recipient = String(m.recipientId ?? (m as any).recipient?.id ?? '');
    if (
      activeFriend &&
      (sender === activeFriend.id || recipient === activeFriend.id)
    ) {
      const duplicate = messages.some(
        (x) =>
          x.content === m.content &&
          x.senderId === m.senderId &&
          Math.abs(
            new Date(x.createdAt || 0).getTime() -
              new Date(m.createdAt || 0).getTime(),
          ) < 5000,
      );
      if (!duplicate) messages.push(m);
      renderMessages();
    }
  });
}
async function logout() {
  socket?.disconnect();
  socket = null;
  token = '';
  me = null;
  friends = [];
  requests = [];
  activeFriend = null;
  await chrome.storage.local.remove(['orbitToken', 'orbitUser']);
  setConnection(false);
  view = 'login';
  renderAuth();
}
async function init() {
  try {
    const saved = await chrome.storage.local.get(['orbitToken', 'orbitUser']);
    if (saved.orbitToken) {
      token = saved.orbitToken;
      me = saved.orbitUser || null;
      renderApp();
    } else renderAuth();
  } catch {
    renderAuth();
  }
}
void init();

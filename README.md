# Ryuto Messenger

Mensagens rápidas, sem sair do que você está fazendo.

<img width="253" height="115" alt="image" src="https://github.com/user-attachments/assets/b1f14639-de8b-43f3-a791-27faf8edbabb" />


O Orbit Messenger é um projeto de mensageria leve pensado para o navegador. A proposta é facilitar conversas curtas e diretas durante o trabalho ou o lazer, sem abrir mão do fluxo da página em que você já está.

A experiência busca ser simples: encontrar pessoas, iniciar uma conversa e trocar mensagens em tempo real, com uma interface discreta e fácil de consultar.

> <img width="654" height="390" alt="image" src="https://github.com/user-attachments/assets/8454806e-47bb-44b1-82c7-9fac68b1642c" />


## Objetivos

- Facilitar conversas rápidas enquanto a pessoa continua usando o navegador.
- Manter a experiência leve, direta e sem excesso de elementos.
- Permitir comunicação em tempo real entre pessoas conectadas.
- Evoluir para uma extensão de navegador com acesso rápido ao chat.



## Funcionalidades atuais

- Cadastro e autenticação com username, e-mail confirmado e senha forte.
- Senhas armazenadas com hash usando bcrypt.
- Confirmação de e-mail com link de uso único, válido por 24 horas.
- Autenticação da API com JWT.
- Solicitações de amizade e gerenciamento de contatos.
- Envio de mensagens persistidas no PostgreSQL.
- Comunicação em tempo real com Socket.IO.
- Frontend web em React e TypeScript.

A extensão ainda não está pronta para instalação ou publicação. A pasta `extension/` contém código inicial e precisa ser concluída.

### E-mail e autenticação

O cadastro exige senha de pelo menos 8 caracteres com uma letra minúscula,
uma maiúscula e um número. Para enviar confirmações pelo Resend, configure
uma chave de API e um remetente verificado:

```env
RESEND_API_KEY=re_sua_chave_de_api
EMAIL_FROM=Ryuto <no-reply@seu-dominio-verificado.com>
FRONTEND_URL=http://localhost:5173
```

Guarde a chave do Resend somente nas variáveis de ambiente do backend (por
exemplo, no Render), nunca no frontend nem no GitHub. No plano gratuito, o
Resend limita o envio a 100 e-mails por dia e 3.000 por mês; para enviar a
destinatários arbitrários, verifique seu domínio e o endereço do remetente no
Resend. Aplique a migração com `npx prisma migrate deploy`. Contas antigas sem
e-mail podem cadastrar/atualizar o endereço na tela de login e confirmá-lo
antes de entrar.








## Tecnologias

### Backend

- Node.js
- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Socket.IO
- JWT
- bcrypt

### Frontend web

- React
- TypeScript
- Vite
- Socket.IO Client
- Lucide React

### Extensão

A estrutura de `extension/` é o ponto de partida para a futura experiência no navegador. O manifesto e o fluxo de integração ainda precisam ser implementados antes de carregar a extensão no browser.

## Arquitetura

```text
.
├── prisma/                 # Schema e migrations do banco
├── src/                    # API NestJS
│   ├── auth/                # Cadastro, login e autenticação
│   ├── conversations/       # Conversas
│   ├── friends/             # Solicitações e lista de amigos
│   ├── messages/            # Regras de mensagens
│   ├── realtime/            # Gateway Socket.IO
│   └── database/            # Integração com Prisma
├── web/                     # Aplicação React + Vite
└── extension/               # Estrutura inicial da extensão
```

### Extensão

Futuramente, o Orbit Messenger será disponibilizado como uma extensão para navegador, permitindo acessar conversas rapidamente sem sair da página atual.

## Interface

A interface prioriza simplicidade e acesso rápido às conversas, sem atrapalhar o fluxo de trabalho ou lazer.

## Próximos passos

- Concluir a extensão para navegador.
- Integrar a extensão ao backend e às conversas em tempo real.
- Refinar a experiência de uso.

# App Financeiro - Gerenciador de Finanças Pessoais

Aplicativo financeiro pessoal desenvolvido com Ionic, React, Tailwind CSS e Supabase.

## 🚀 Tecnologias

- **Frontend**: React 19 + TypeScript
- **Framework Mobile**: Ionic 8
- **Estilização**: Tailwind CSS v4 (estilo shadcn)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Gráficos**: Recharts
- **Build Tool**: Vite

## 📋 Funcionalidades

### ✅ Implementadas

- ✅ Sistema de autenticação (Login/Registro) com Supabase
- ✅ Tema Dark/Light mode com persistência
- ✅ Dashboard com:
  - Cards de resumo (Receitas, Despesas, Resultado)
  - Gráfico de histórico financeiro mensal (barras)
  - Gráfico de despesas por categoria (pizza)
  - Progresso de metas financeiras
  - Transações recentes
- ✅ Seletor de período (mês)
- ✅ Schema do banco de dados completo

### 🚧 Em Desenvolvimento

- Página de gestão de transações
- Formulário de adicionar/editar transações
- Gestão de contas e tags
- Configuração de metas financeiras
- Gráficos de evolução (recorrentes/parceladas)
- Sistema de notificações
- Build para Android

## 🛠️ Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
3. Preencha as variáveis de ambiente com suas credenciais do Supabase:
   ```
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima
   ```

### 3. Criar Tabelas no Supabase

Execute o script SQL `supabase-schema.sql` no SQL Editor do Supabase para criar todas as tabelas, políticas RLS e triggers necessários.

### 4. Executar em Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:5173

## 📱 Build para Android

### Configurar Capacitor

```bash
npx cap init
npx cap add android
npx cap sync
```

### Build e Executar

```bash
npm run build
npx cap copy
npx cap open android
```

## 🗄️ Estrutura do Banco de Dados

- **profiles**: Perfis de usuários
- **accounts**: Contas bancárias/carteiras
- **tags**: Categorias de despesas/receitas
- **transactions**: Lançamentos financeiros
- **goals**: Metas financeiras (fixas)
- **goals_config**: Configuração de porcentagens das metas por usuário

## 📊 Metas Financeiras

O sistema utiliza 6 metas financeiras fixas:

1. Liberdade Financeira
2. Custos Fixos
3. Conforto
4. Metas
5. Prazeres
6. Conhecimento

Cada usuário pode configurar a porcentagem de sua renda destinada a cada meta (total deve somar 100%).

## 🎨 Design

O aplicativo utiliza um design moderno inspirado no shadcn/ui, com:

- Componentes reutilizáveis (Card, Button, etc.)
- Sistema de cores HSL customizável
- Dark mode nativo
- Animações suaves
- Layout responsivo

## 📝 Próximos Passos

1. Implementar página de transações com filtros avançados
2. Adicionar formulário completo de transações (recorrentes/parceladas)
3. Criar popup de configuração de metas
4. Implementar notificações push (Android)
5. Adicionar leitura de notificações bancárias (Android)
6. Implementar gráficos de evolução
7. Testes e otimizações

## 📄 Licença

MIT

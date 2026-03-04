# DXB Inventory Management System

Full-stack Inventory Management System built with Next.js 14, Prisma, PostgreSQL, and NextAuth.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth (Auth.js) with email/password
- **Styling:** TailwindCSS + ShadCN UI
- **Validation:** Zod + React Hook Form
- **Package Manager:** pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- pnpm

### Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   - `DATABASE_URL` – PostgreSQL connection string
   - `NEXTAUTH_URL` – e.g. `http://localhost:3000`
   - `NEXTAUTH_SECRET` – run `openssl rand -base64 32` to generate

3. **Database**
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

4. **Run development server**
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Default Login (after seed)

- **Email:** admin@example.com  
- **Password:** admin123

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/     # Protected route group
│   │   ├── dashboard/
│   │   ├── inventory/
│   │   ├── suppliers/
│   │   ├── clients/
│   │   ├── purchases/
│   │   ├── sales/
│   │   └── expenses/
│   ├── api/auth/        # NextAuth API route
│   ├── auth/register/   # Server actions
│   ├── login/
│   └── register/
├── components/
│   ├── layout/          # Sidebar, Header, AppShell
│   ├── ui/              # ShadCN components
│   └── providers/
├── lib/
│   ├── auth.ts          # NextAuth config
│   ├── prisma.ts        # Prisma client
│   └── utils.ts
└── middleware.ts        # Protected routes
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:seed` | Seed admin user |
| `pnpm db:studio` | Open Prisma Studio |

## UI Design

Place Figma export assets in the `./UI-Design` folder.

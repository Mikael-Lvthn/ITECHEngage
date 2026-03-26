# ITechEngage

A modern web application built with Next.js, React, and Supabase designed to deliver engaging learning and interaction experiences.

## Project Overview

ITechEngage is a full-stack platform that leverages cutting-edge technologies to provide a seamless user experience. Built with the latest versions of Next.js and React, it uses Supabase for secure data management and Tailwind CSS for responsive, beautiful interfaces.

## ✨ Features

- **Real-time Interactions**: Powered by Supabase for live data synchronization
- **Modern UI Components**: Built with Radix UI and shadcn component library
- **Responsive Design**: Fully responsive layouts using Tailwind CSS
- **Type-Safe Development**: Full TypeScript support for robust code
- **Optimized Performance**: Next.js 16 with latest React 19 features
- **Developer Friendly**: ESLint configured for code quality

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ (or higher)
- **npm** 9+ (or **yarn**, **pnpm**, **bun**)
- **Git** for version control

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory and add your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

The application will start at [http://localhost:3000](http://localhost:3000)

### 4. Open in Browser

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📚 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Create optimized production build
- `npm start` - Start production server
- `npm run lint` - Run ESLint to check code quality

## 🛠 Tech Stack

- **Frontend**: [Next.js](https://nextjs.org) 16, [React](https://react.dev) 19, [TypeScript](https://www.typescriptlang.org)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) 4, [Class Variance Authority](https://cva.style)
- **Components**: [Radix UI](https://www.radix-ui.com), [shadcn](https://shadcn.com)
- **Backend/Database**: [Supabase](https://supabase.com)
- **Icons**: [Lucide React](https://lucide.dev)
- **Development**: ESLint, TypeScript

## 📖 Project Structure

```
src/
├── app/              # Next.js app directory
├── components/       # Reusable React components
├── lib/             # Utility functions and helpers
└── styles/          # Global and component styles

public/              # Static assets
supabase/            # Supabase configuration and migrations
```

## 🐛 Issues & Support

If you encounter any issues or have questions, please create an issue in the repository.

## 📄 License

This project is private and proprietary.

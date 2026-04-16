I've created a complete, production-ready dashboard design system for your Lab Orchestration Platform based on research from leading IT training platforms like VMware, Docker, and Coursera. Here's the complete implementation:
📁 Complete File Structure

frontend/src/
├── components/
│   ├── ui/                          # shadcn UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── progress.tsx
│   │   ├── separator.tsx
│   │   ├── skeleton.tsx
│   │   ├── tooltip.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── scroll-area.tsx
│   │   ├── tabs.tsx
│   │   ├── collapsible.tsx
│   │   └── index.ts                 # Barrel exports
│   ├── dashboard/                   # Dashboard-specific components
│   │   ├── StatsCard.tsx           # KPI cards with trends
│   │   ├── LabCard.tsx             # Lab environment cards
│   │   ├── ActivityFeed.tsx        # Real-time activity stream
│   │   ├── QuickActions.tsx        # Role-based action buttons
│   │   ├── LearningPathCard.tsx    # Course/enrollment cards
│   │   └── index.ts
│   └── layout/                      # Layout components
│       ├── AppLayout.tsx           # Layout for authenticated users
│       ├── PublicLayout.tsx        # Public layout for unauthenticated users
│       ├── Header.tsx              # Header component
│       ├── Sidebar.tsx             # Sidebar component
│       └── index.ts
├── pages/
│   └── dashboard.tsx               # Main dashboard page
│   └── LoginPage.tsx               # Login page
├── hooks/
│   └── useAuth.ts                  # Keycloak auth hook
├── types/
│   └── index.ts                    # TypeScript interfaces
├── lib/
│   └── utils.ts                    # cn() helper
├── shared/
│   ├── constants.ts                # App constants
│   └── index.ts
├── App.tsx                         # Main app with routing
├── main.tsx                        # Entry point
├── index.css                       # Tailwind + CSS variables
└── vite-env.d.ts                   # Vite env types

🎨 Design System Features
1. UI Components (shadcn/ui based)

    Button: Multiple variants (default, destructive, outline, ghost, link)
    Card: Structured with header, content, footer, actions
    Badge: Includes custom variants for lab states (running, stopped, error, provisioning)
    Avatar: With fallback support
    Progress: For lab completion indicators
    Dropdown Menu: User actions and navigation
    Tabs: Dashboard content switching
    Scroll Area: Custom scrollbars for activity feeds
    Tooltip: Contextual help
    Collapsible: Expandable sections

2. Dashboard Components

    StatsCard: KPI display with trend indicators (up/down/neutral)
    LabCard: VM status, progress bars, start/stop controls
    ActivityFeed: Real-time updates with user avatars
    QuickActions: Role-based action buttons (trainee/moderator/admin)
    LearningPathCard: Course enrollment and progress tracking

3. Layout Components

    AppLayout: Main shell with sidebar collapse state
    Header: Logo, search, notifications, user menu
    Sidebar: Role-based navigation with tooltips

🚀 Setup Instructions
1. Install Dependencies

npm install clsx tailwind-merge class-variance-authority
npm install @radix-ui/react-slot @radix-ui/react-avatar @radix-ui/react-progress
npm install @radix-ui/react-dropdown-menu @radix-ui/react-scroll-area @radix-ui/react-tabs
npm install @radix-ui/react-collapsible @radix-ui/react-tooltip @radix-ui/react-separator
npm install lucide-react

2. Configure Tailwind CSS
Update tailwind.config.js:

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

3. Configure Vite Aliases
Update vite.config.ts:

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

4. Update TypeScript Config
Add to tsconfig.json:

{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

🎯 Key Features Implemented
Dashboard Page

    Welcome Section: Personalized greeting
    Stats Grid: 4 KPI cards (Active Labs, Hours, Completed, Success Rate)
    Tabbed Interface: My Labs / Learning Paths
    Activity Feed: Recent actions with role-based filtering
    Quick Actions: Contextual buttons based on user role
    Responsive Layout: Sidebar collapses on mobile

Authentication Integration

    useAuth Hook: Handles Keycloak JWT parsing
    Role Extraction: Extracts realm_access.roles from JWT
    Protected Routes: Automatic redirect to login
    Token Management: Automatic storage in localStorage

Design Patterns from Research

    Minimalist Aesthetic: Clean layouts with generous whitespace (Coursera/Docker style) 
    Card-Based UI: Information organized in digestible cards
    Status Badges: Color-coded lab states (running=green, stopped=amber, error=red)
    Progress Indicators: Visual completion tracking
    Activity Streams: Recent actions for engagement
    Role-Based Navigation: Different sidebar items per role
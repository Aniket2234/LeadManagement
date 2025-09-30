# Overview

LeadFlow is a comprehensive Lead Management System built with TypeScript, Express.js, and React. The application provides a modern, interactive dashboard for managing leads through the entire sales pipeline, from initial contact to conversion. It features user authentication, CRUD operations for leads, activity tracking, reminders system, and analytics with interactive charts. The system allows users to efficiently track leads through different stages (New → Contacted → Qualified → Converted → Lost), manage follow-up reminders, and gain insights through detailed reporting and analytics.

# Recent Changes

**September 30, 2025** - Successfully set up the GitHub import to run in Replit environment:
- Verified server configuration: binding to `0.0.0.0:5000` for Replit proxy compatibility
- Confirmed Vite dev server has `allowedHosts: true` for iframe proxy support
- Configured workflow "Start application" to run `npm run dev` on port 5000
- Verified MongoDB Atlas connection using credentials from `.env` file
- Tested frontend and backend: application loads successfully showing LeadFlow login page
- Set up deployment configuration for Replit Autoscale with `build:full` and `start` commands
- No LSP diagnostics or errors detected
- **Fixed Vercel deployment reminders API**:
  - Split catch-all route into explicit endpoints for better Vercel compatibility
  - Created `api/reminders/index.ts` for base route (GET, POST)
  - Created `api/reminders/[id].ts` for update route (PUT)
  - Created `api/reminders/[id]/complete.ts` for complete action (POST, PUT)
  - Added extensive console logging throughout all endpoints for debugging
  - **Moved library files**: Relocated `api/lib/*` to `server/lib-vercel/*` to prevent Vercel from counting them as serverless functions
  - Final serverless function count: **11 of 12** (Vercel Hobby plan limit)

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 18** with TypeScript for the user interface
- **Vite** as the build tool and development server
- **TanStack Query (React Query)** for server state management and caching
- **Wouter** for lightweight client-side routing
- **Zustand** for authentication state management with persistence
- **Recharts** for interactive data visualizations and charts
- **shadcn/ui** components built on Radix UI primitives for consistent, accessible UI
- **Tailwind CSS** for styling with CSS variables for theming

## Backend Architecture
- **Express.js** with TypeScript for RESTful API server
- **JWT-based authentication** with bcryptjs for password hashing
- **Middleware-based request logging** for API monitoring
- **Custom error handling** middleware for consistent error responses
- **File-based route registration** for modular API organization

## Data Layer
- **MongoDB** with **Mongoose** for database operations and schema management
- **MongoDB Atlas** as the primary database (cloud-hosted MongoDB)
- **Shared schema definitions** between client and server for type safety
- **Schema validation** using Mongoose models and Zod validation

## Database Schema (MongoDB Collections)
- **Users**: Authentication and user management (_id, name, email, password, timestamps)
- **Leads**: Core lead information (name, contact details, company, source, status, tags, user association)
- **Notes**: Lead-specific notes with timestamps and references to leads and users
- **Activities**: Audit trail for lead actions (created, updated, status_changed, note_added)
- **Reminders**: Follow-up reminders with due dates and completion status

## Authentication & Authorization
- **JWT tokens** for stateless authentication with 7-day expiration
- **Password hashing** using bcryptjs with salt rounds
- **Protected routes** with middleware-based token verification
- **Persistent auth state** using Zustand with localStorage

## API Design
- **RESTful endpoints** following standard HTTP methods
- **Input validation** using Zod schemas shared between client and server
- **Consistent error responses** with proper HTTP status codes
- **Query parameters** for filtering, searching, and pagination
- **Analytics endpoints** for dashboard metrics and reporting

## Real-time Features
- **Activity logging** for all lead interactions and changes
- **Reminder system** with date-based filtering for due/overdue items
- **Live metrics** updated through React Query's automatic refetching

## Development Workflow
- **Hot module replacement** in development with Vite
- **TypeScript compilation** with strict type checking
- **Path aliases** for clean imports (@/, @shared/, @assets/)
- **Replit-specific plugins** for development environment integration

## Replit Environment Configuration
- **Server binding**: Configured to bind to `0.0.0.0:5000` for Replit proxy compatibility
- **Vite dev server**: Configured with `allowedHosts: true` to accept requests from Replit's iframe proxy
- **Development workflow**: `npm run dev` runs the Express server with Vite middleware (fixed to use NODE_ENV directly instead of cross-env)
- **Production build**: `npm run build:full` builds both client (Vite) and server (esbuild)
- **Production start**: `npm run start` runs the compiled server from `dist/index.js`
- **Environment variables**: MongoDB connection string stored in `.env` file as `MONGODB_URI`
- **Deployment**: Configured for Replit Autoscale deployment with build:full and start commands

# External Dependencies

## Core Framework Dependencies
- **mongoose**: MongoDB object modeling for Node.js with built-in type casting and validation
- **@tanstack/react-query**: Server state management and caching
- **express**: Node.js web application framework
- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing and verification
- **zod**: TypeScript-first schema validation

## UI and Styling
- **@radix-ui/***: Headless UI primitives for accessible components
- **tailwindcss**: Utility-first CSS framework
- **recharts**: Composable charting library for React
- **lucide-react**: Icon library with React components
- **class-variance-authority**: Utility for creating component variants
- **clsx** and **tailwind-merge**: CSS class utilities

## Development Tools
- **vite**: Frontend build tool and development server
- **typescript**: Static type checking
- **@replit/vite-plugin-***: Replit-specific development plugins
- **esbuild**: Fast JavaScript bundler for production builds

## Database and Storage
- **MongoDB Atlas**: Cloud-hosted MongoDB database service
- **Mongoose**: MongoDB object document mapper (ODM) for Node.js
- **MONGODB_URI**: Connection string stored securely as Replit secret
- **IP Whitelisting**: MongoDB Atlas requires `0.0.0.0/0` in Network Access for Replit compatibility

## State Management and Routing
- **zustand**: Lightweight state management
- **wouter**: Minimalist router for React
- **@hookform/resolvers**: Form validation resolvers
- **react-hook-form**: Performant form library
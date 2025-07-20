# Appointment Booking System

## Overview

This is a full-stack appointment booking application built with React, Express, TypeScript, and PostgreSQL. The application appears to be designed for service appointment scheduling, featuring a multi-step booking process with customer information collection, appointment selection, and verification steps.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for development and bundling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Session Management**: Built-in with connect-pg-simple for PostgreSQL sessions

## Key Components

### Database Layer
- **Schema Location**: `shared/schema.ts` - contains Drizzle table definitions
- **User Table**: Basic user schema with id, username, and password fields
- **Migration System**: Drizzle Kit for database migrations in `./migrations` directory

### API Layer
- **Routes**: Centralized in `server/routes.ts` with `/api` prefix
- **Storage Interface**: Abstract storage interface in `server/storage.ts`
- **Current Implementation**: In-memory storage (MemStorage class) - suitable for development

### Frontend Components
- **UI Components**: Complete shadcn/ui component library in `client/src/components/ui/`
- **Pages**: 
  - Appointment booking page with multi-step wizard
  - 404 Not Found page
- **Hooks**: Custom hooks for mobile detection and toast notifications

### Development Tools
- **Hot Reload**: Vite middleware integration for development
- **Error Handling**: Runtime error overlay in development
- **TypeScript**: Strict mode enabled with path mapping support

## Data Flow

1. **Client Requests**: React frontend makes API calls using React Query
2. **API Processing**: Express server handles requests through registered routes
3. **Data Persistence**: Storage interface abstracts database operations
4. **Response Handling**: JSON responses with error handling middleware
5. **UI Updates**: React Query manages cache invalidation and UI updates

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Database ORM and query builder
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework

### Development Dependencies
- **vite**: Build tool and development server
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for production builds

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: esbuild bundles server code to `dist/index.js`
3. **Database Migrations**: Drizzle Kit pushes schema changes

### Environment Configuration
- **Development**: Uses NODE_ENV=development with hot reload
- **Production**: NODE_ENV=production with optimized builds
- **Database**: Requires DATABASE_URL environment variable for PostgreSQL connection

### Scripts
- `npm run dev`: Development server with hot reload
- `npm run build`: Production build for both client and server
- `npm run start`: Production server startup
- `npm run db:push`: Apply database schema changes

### Current State
The application has a basic user schema and appointment booking UI, but the backend routes are not yet implemented. The storage layer uses in-memory storage for development, which should be replaced with proper database integration for production use.
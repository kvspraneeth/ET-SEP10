# ExpenseTracker PWA - Replit Development Guide

## Overview

ExpenseTracker is a comprehensive Progressive Web App (PWA) built with React and TypeScript for tracking personal expenses offline. The application features a mobile-first design with complete offline functionality, installable on mobile devices, and includes advanced features like budgeting, analytics, and data visualization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: React hooks with Tanstack Query for server state
- **Forms**: React Hook Form with Zod validation schemas
- **Charts**: Recharts library for data visualization

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Architecture Pattern**: RESTful API structure (currently minimal implementation)
- **Middleware**: Custom logging and error handling middleware
- **Development**: Hot module replacement with Vite integration

### Data Storage Strategy
- **Primary Storage**: IndexedDB via Dexie.js for offline-first functionality
- **Database Schema**: Structured around expenses, categories, budgets, and settings
- **Offline Support**: Complete offline functionality with local data persistence
- **Future Database**: Configured for PostgreSQL with Drizzle ORM (ready for server integration)

## Key Components

### Core Data Models
- **Expenses**: Amount, date, time, category, payment method, account, attachments, metadata
- **Categories**: Default categories (Groceries, Food, Transport, Bills, etc.) with icons and colors
- **Budgets**: Category-based budgets with period tracking and progress monitoring
- **Settings**: User preferences including currency, theme, notifications

### User Interface Components
- **Bottom Navigation**: Primary navigation with Home, Expenses, Charts, Budget, Settings
- **Floating Action Button**: Quick expense entry access
- **Responsive Header**: Gradient design with theme toggle and notifications
- **Form Components**: Comprehensive expense entry form with file attachments
- **Chart Components**: Pie charts for categories, bar charts for daily spending
- **Category Selector**: Visual category selection with icons and colors

### PWA Features
- **Service Worker**: Caches resources for offline functionality
- **Web App Manifest**: Enables installation on mobile devices
- **Offline Storage**: Complete functionality without network connection
- **Responsive Design**: Mobile-first approach with touch-friendly interface

## Data Flow

### Expense Management
1. User creates expense through floating action button or quick category selection
2. Form validation using Zod schemas ensures data integrity
3. Data stored locally in IndexedDB via Dexie.js
4. Real-time updates to UI components using Dexie React hooks
5. Analytics and charts automatically update with new data

### Budget Tracking
1. Users create budgets with category association and time periods
2. System tracks spending against budgets in real-time
3. Progress indicators show budget utilization
4. Alerts system (planned) for budget thresholds

### Theme and Settings
1. Theme state managed through React Context
2. Persistent storage in localStorage and IndexedDB
3. CSS variables enable seamless dark/light mode transitions
4. Settings sync across app components

## External Dependencies

### UI and Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **class-variance-authority**: Dynamic className generation

### Data Management
- **Dexie.js**: IndexedDB wrapper for offline storage
- **Tanstack Query**: Server state management and caching
- **React Hook Form**: Form state management and validation
- **Zod**: Runtime type validation and schema definition

### Charts and Visualization
- **Recharts**: React-based charting library
- **date-fns**: Date manipulation and formatting utilities

### Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Static type checking
- **ESBuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Development Environment
- Vite development server with hot module replacement
- Express server integration for future API development
- Replit-specific optimizations and error overlay

### Production Build
- Vite builds optimized client bundle to `dist/public`
- ESBuild bundles server code to `dist/index.js`
- Service worker enables offline functionality
- Static assets served with proper caching headers

### PWA Installation
- Manifest file enables "Add to Home Screen" functionality
- Service worker provides offline capability
- Responsive design ensures mobile compatibility
- Touch-friendly interface optimized for mobile usage

### Future Scalability
- Backend API structure ready for database integration
- Drizzle ORM configured for PostgreSQL migration
- Authentication system placeholder in storage interface
- Export/import functionality for data portability
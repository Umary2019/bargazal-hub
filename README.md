# Bargazal Hub

MASTER DEVELOPMENT PROMPT

Bargazal and Sons Tech Solutions — Business Management System MVP

You are a senior full-stack software architect, UI/UX designer, database engineer, security engineer, and production software developer.

Your task is to design, develop, test, and prepare for deployment a complete MVP business management system for:

Bargazal and Sons Tech Solutions

The system must be a real-world, professional business management application, not a demo, template, mockup, or collection of disconnected CRUD pages.

The application will initially be used by the business owner/admin to manage clients, services, final-year-project services, projects, invoices, payments, expenses, and business reports.

Build the application with a clean architecture so it can be expanded later into a complete ERP/CRM platform.

1. PRIMARY OBJECTIVE

Build a responsive web-based business management system that allows Bargazal and Sons Tech Solutions to manage its daily operations from one application.

The MVP must allow the administrator to:

Log in securely.

View the business dashboard.

Manage clients.

Manage business services.

Manage Final Year Project services.

Manage project chapters.

Manage project software development orders/projects.

Create and manage projects.

Create quotations/invoices.

Record payments.

Record business expenses.

Calculate revenue, expenses, profit, and outstanding balances.

Generate useful business reports.

Search, filter, sort, and paginate records.

View detailed information about clients and projects.

Track project progress and status.

Generate professional invoices.

Maintain proper relationships between clients, services, projects, invoices, payments, and expenses.

2. IMPORTANT PRODUCT PRINCIPLE

Do NOT build unnecessary features for the MVP.

Do NOT build:

Inventory management

HR management

Payroll

Complex accounting

Customer support ticketing

AI features

Social media management

Complex multi-company management

Complicated employee attendance

Unnecessary analytics

Those can be added later.

Focus on a small but complete MVP that can actually be used to operate the business.

3. TECHNOLOGY STACK

Use the following stack unless there is a strong technical reason not to:

Frontend

React

TypeScript

Vite

Tailwind CSS

shadcn/ui

React Router

TanStack Query

React Hook Form

Zod

Recharts

Lucide React icons

Backend / Platform

Use:

Supabase

Use Supabase for:

PostgreSQL database

Authentication

Row Level Security

Storage

Database functions where appropriate

Do NOT create a separate Express backend unless it is genuinely required.

Deployment

Prepare the project for:

Vercel frontend deployment

Supabase backend/database

The application must work correctly after production deployment.

4. APPLICATION STRUCTURE

Create a professional application structure:

Bargazal and Sons Tech Solutions
│
├── Authentication
│
├── Dashboard
│
├── Clients
│
├── Services
│   │
│   ├── All Services
│   ├── Final Year Projects
│   │   ├── Chapters
│   │   ├── Software
│   │   ├── Documentation
│   │   ├── Diagrams
│   │   └── Presentations
│   │
│   ├── Web Development
│   ├── Mobile Development
│   ├── UI/UX Design
│   ├── IT Consulting
│   └── Training
│
├── Projects
│
├── Invoices
│
├── Payments
│
├── Expenses
│
├── Reports
│
└── Settings


The sidebar should be responsive and professional.

5. AUTHENTICATION

Implement secure admin authentication using Supabase Auth.

MVP should initially support:

Administrator


Login page:

Email
Password
Remember session
Login
Forgot password


Requirements:

Protected routes

Automatic session detection

Logout

Authentication error handling

Loading states

Secure database access

RLS policies

Unauthenticated users must not access protected application pages.

6. BUSINESS BRANDING

The application must consistently use:

Bargazal and Sons Tech Solutions

Do not use placeholder company names such as:

Acme

Demo Company

Example Corp

Test Company

Use the real business name everywhere appropriate.

Create a professional technology-business visual identity.

Design direction:

Modern

Clean

Professional

Premium

Corporate

Minimal

Highly readable

Avoid excessive gradients, excessive animations, oversized cards, childish colors, and template-like designs.

7. DASHBOARD

Create a professional dashboard.

Display:

Financial statistics

Total Revenue
Total Expenses
Net Profit
Outstanding Payments


Business statistics

Total Clients
Active Projects
Completed Projects
Pending Projects


Dashboard charts

Include:

Revenue over time

Expenses over time

Revenue vs expenses

Project status distribution

Recent activity

Display:

Recent clients

Recent projects

Recent invoices

Recent payments

Recent expenses

The dashboard must calculate data from the database.

Do NOT hard-code dashboard numbers.

8. CLIENT MANAGEMENT

Create a complete client management module.

Client fields

id
full_name
phone
whatsapp
email
company
address
city
state
notes
created_at
updated_at


Features:

Create client

View client

Edit client

Delete client

Search client

Filter client

Sort client

Pagination

Client profile page should show:

Client Information
Projects
Invoices
Payments
Total Amount
Amount Paid
Outstanding Balance


The client profile should provide a complete history of their business relationship.

9. SERVICES MODULE

Services represent what Bargazal and Sons Tech Solutions sells.

Create service categories.

Main categories

Final Year Projects

Sub-services:

Project Topics
Chapter One
Chapter Two
Chapter Three
Chapter Four
Chapter Five
Complete Documentation
Project Software
System Analysis
System Design
UML Diagrams
ER Diagrams
Flowcharts
Use Case Diagrams
Class Diagrams
Sequence Diagrams
Presentation Slides
Project Corrections
Project Support


Software Development

Web Application Development
Mobile Application Development
Desktop Application Development
Custom Business Software
API Development
Database Development


Design

UI/UX Design
Logo Design
Branding


IT Services

IT Consulting
Computer Services
Networking
Technical Support


Training

Programming Training
Web Development Training
Computer Training
Software Training


Services should have:

name
category
description
price
pricing_type
duration
status
created_at
updated_at


Pricing types:

Fixed
Starting From
Hourly
Custom


The administrator must be able to create, edit, deactivate, and delete services.

10. FINAL YEAR PROJECT MODULE

This is a VERY IMPORTANT part of the application.

Final Year Projects are one of the core services offered by Bargazal and Sons Tech Solutions.

Create a dedicated Final Year Project section.

The system must support:

Project Topic
Project Chapters
Project Software
Documentation
Diagrams
Presentation
Corrections
Project Support


11. FINAL YEAR PROJECT CHAPTERS

Create a chapter service management system.

Default chapters:

Chapter One — Introduction
Chapter Two — Literature Review
Chapter Three — Methodology
Chapter Four — System Analysis and Design
Chapter Five — Implementation, Testing and Conclusion


Each chapter should be treated as a service that can have:

name
description
price
status


Allow the administrator to:

Add chapter service

Edit price

Activate/deactivate chapter

Add description

Assign chapter to client/project

The system must NOT assume every customer purchases all five chapters.

A client may purchase:

Chapter One only


or:

Chapter One + Chapter Two


or:

Complete documentation


or:

Documentation + Software


12. FINAL YEAR PROJECT SOFTWARE

Create a dedicated project software workflow.

A student/customer can purchase software development as part of their final-year project.

Store:

Project title
Client
Institution
Department
Programme
Supervisor
Project description
Requirements
Technology stack
Budget
Amount paid
Outstanding balance
Start date
Deadline
Progress
Status
GitHub URL
Demo URL
Notes


Status:

Pending
Planning
Requirements
Design
Development
Testing
Client Review
Completed
Cancelled


Progress:

0% - 100%


Create a project details page with a visual progress indicator.

13. PROJECT MANAGEMENT

Projects represent actual work being delivered to clients.

Project fields:

project_number
title
client_id
service_id
description
budget
amount_paid
balance
start_date
deadline
progress
status
priority
github_url
demo_url
notes
created_at
updated_at


Automatically calculate:

balance = budget - amount_paid


Do not allow the balance to become negative.

Project page should display:

Project Overview
Client
Service
Budget
Paid
Balance
Deadline
Progress
Status
Technology
Links
Notes


Also show related:

Invoices
Payments
Files


14. PROJECT NUMBER

Generate professional project identifiers.

Example:

BTS-PROJ-0001
BTS-PROJ-0002
BTS-PROJ-0003


They must be unique.

15. INVOICING

Create a professional invoice system.

Invoice fields:

invoice_number
client_id
project_id
issue_date
due_date
subtotal
discount
tax
total
amount_paid
balance
status
notes


Invoice items:

service
description
quantity
unit_price
total


Automatically calculate:

subtotal
discount
tax
total
amount_paid
balance


Invoice status:

Draft
Sent
Partially Paid
Paid
Overdue
Cancelled


Generate invoice numbers:

BTS-INV-2026-0001
BTS-INV-2026-0002


16. PROFESSIONAL INVOICE DESIGN

Create a printable professional invoice.

Header:

Bargazal and Sons Tech Solutions


Include configurable business information:

Business Name
Phone
WhatsApp
Email
Address
Website


Invoice:

Invoice Number
Issue Date
Due Date
Client Information
Services
Subtotal
Discount
Tax
Total
Amount Paid
Balance
Payment Status
Notes


Provide:

Print Invoice
Download/Export Invoice


The invoice must look professional enough to send to a real customer.

17. PAYMENTS

Create payment management.

Fields:

payment_number
client_id
invoice_id
project_id
amount
payment_method
payment_date
reference
notes
created_at


Payment methods:

Cash
Bank Transfer
POS
Online Payment
Other


Generate payment references such as:

BTS-PAY-0001


When a payment is recorded:

Update invoice amount paid

Update invoice balance

Update invoice status

Update project amount paid

Update project balance

Prevent payments greater than the outstanding amount unless explicitly configured for overpayment handling.

18. EXPENSE MANAGEMENT

Create expense tracking.

Fields:

expense_number
category
description
amount
expense_date
payment_method
vendor
notes
created_at


Categories:

Internet
Hosting
Domain
Transportation
Equipment
Software
Marketing
Office
Utilities
Maintenance
Other


Generate:

BTS-EXP-0001


19. FINANCIAL CALCULATIONS

The system must calculate:

Total Revenue
Total Expenses
Net Profit
Outstanding Payments


Formula:

Net Profit = Total Revenue - Total Expenses


Revenue should be based on actual recorded payments, not simply invoice totals.

Outstanding balance should be calculated from unpaid invoice/project balances.

20. REPORTS

Create a Reports module.

Reports:

Financial

Revenue Report
Expense Report
Profit Report
Outstanding Payments


Business

Client Report
Project Report
Service Performance
Invoice Report
Payment Report


Allow filtering by:

Today
This Week
This Month
This Year
Custom Date Range


Provide export/print functionality where practical.

21. SEARCH AND FILTERING

Every major list must support:

Search

Filtering

Sorting

Pagination

Examples:

Clients:

Search by name, phone, email


Projects:

Search by project title/client/project number
Filter by status
Filter by date


Invoices:

Search invoice number/client
Filter status
Filter date


Expenses:

Filter category
Filter date


22. DATABASE DESIGN

Use PostgreSQL through Supabase.

Create normalized tables.

Minimum tables:

profiles
clients
service_categories
services
projects
project_services
invoices
invoice_items
payments
expenses


Use proper:

Primary keys

Foreign keys

Unique constraints

Indexes

Timestamps

Check constraints where appropriate

Use UUIDs where appropriate.

Use database-level constraints for important financial integrity.

23. DATABASE RELATIONSHIPS

Use relationships such as:

Client
  │
  ├── Projects
  │
  ├── Invoices
  │      └── Invoice Items
  │
  └── Payments

Service
  │
  └── Projects

Project
  │
  ├── Client
  ├── Service
  ├── Invoices
  └── Payments


Do not duplicate information unnecessarily.

24. SECURITY

Security is extremely important.

Implement Supabase Row Level Security.

All business data must be protected.

Authenticated administrators should have access according to their role.

Do not expose:

service role keys

database passwords

secrets

private credentials

Never place sensitive Supabase service-role credentials in frontend code.

Use environment variables.

25. ENVIRONMENT VARIABLES

Create:

.env.example


Include only placeholders such as:

VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=


Do NOT commit real secrets.

Also create a clear README section explaining how to configure environment variables.

26. UI/UX REQUIREMENTS

The UI must look like a genuine modern SaaS/business application.

Use:

Professional sidebar

Responsive navbar

Breadcrumbs

Cards

Tables

Dialogs

Drawers

Tabs

Forms

Dropdowns

Badges

Toast notifications

Skeleton loaders

Empty states

Confirmation dialogs

Support:

Desktop
Laptop
Tablet
Mobile


Do not simply shrink the desktop layout on mobile.

Create responsive layouts intentionally.

27. DESIGN SYSTEM

Use shadcn/ui consistently.

Use a restrained professional color palette.

Typography must be clean and readable.

Buttons should have clear actions.

Dangerous operations such as delete must require confirmation.

Use status badges consistently.

Examples:

Paid
Partially Paid
Pending
Completed
Cancelled
Overdue


Use appropriate semantic styling.

28. LOADING STATES

Every database operation must have proper loading states.

Examples:

Loading clients...
Loading projects...
Creating invoice...
Saving payment...
Generating report...


Do not leave blank screens while data is loading.

Use skeletons where appropriate.

29. ERROR HANDLING

Handle:

Network errors

Authentication errors

Database errors

Validation errors

Duplicate records

Missing records

Invalid financial values

Display user-friendly messages.

Never expose raw database errors directly to normal users.

For example, instead of:

Postgres error 23505


display:

This invoice number already exists. Please try again.


30. FORM VALIDATION

Use:

React Hook Form
+
Zod


Validate:

Required fields

Email format

Phone numbers

Positive monetary values

Dates

Project deadlines

Invoice items

Payment amounts

Prevent invalid submissions.

31. EMPTY STATES

Every module must have a meaningful empty state.

Example:

No clients yet

Start by adding your first client.

[ Add Client ]


Do not display broken-looking empty tables.

32. CONFIRMATION DIALOGS

For destructive actions:

Delete Client?


Explain the consequence clearly.

Use:

Cancel
Delete


Do not immediately delete important records without confirmation.

For financial records, consider soft deletion/status cancellation instead of destructive deletion where appropriate.

33. AUDITABILITY

For important financial/business records, preserve timestamps.

Track:

created_at
updated_at


Where practical, maintain an activity history for:

Projects

Invoices

Payments

The goal is to make business records traceable.

34. FILE STORAGE

Prepare Supabase Storage for project-related files.

The MVP may support:

Project Documents
Invoices
Receipts
Project Files


Files should be associated with projects or invoices.

Do not expose private files publicly unless intentionally configured.

35. SETTINGS

Create a basic Settings page.

Business information:

Business Name
Phone
WhatsApp
Email
Address
Website
Logo
Invoice Prefix
Currency


Default currency:

NGN / ₦


The business information should be configurable instead of hard-coded throughout the application.

36. BUSINESS CURRENCY

Use Nigerian Naira.

Display:

₦150,000


Do not use dollar signs by default.

Store monetary values safely and consistently.

Avoid floating-point calculations for financial values where possible.

37. NOTIFICATIONS

Implement toast notifications for important actions:

Client created successfully
Project updated successfully
Invoice created successfully
Payment recorded successfully
Expense added successfully


Errors should also provide clear notifications.

38. ROUTING

Create clean routes such as:

/login

/dashboard

/clients
/clients/:id

/services
/services/:id

/projects
/projects/:id

/invoices
/invoices/:id

/payments

/expenses

/reports

/settings


Protect authenticated routes.

39. COMPONENT ARCHITECTURE

Do not create one massive component.

Use reusable components.

Example:

components/
├── layout/
├── dashboard/
├── clients/
├── services/
├── projects/
├── invoices/
├── payments/
├── expenses/
├── reports/
├── forms/
├── tables/
├── dialogs/
└── ui/


Keep business logic separate from presentation where practical.

40. DATA ACCESS

Create a clean data-access layer.

Do not scatter raw Supabase queries randomly throughout components.

Use reusable functions/hooks for:

clients
services
projects
invoices
payments
expenses
reports


Use TanStack Query for server state where appropriate.

41. PERFORMANCE

Optimize for a small business application.

Use:

Pagination

Database indexes

Efficient queries

Lazy loading where useful

Proper caching

Avoid unnecessary re-renders

Do not load thousands of records unnecessarily.

42. ACCESSIBILITY

The UI should support:

Keyboard navigation

Proper labels

Accessible buttons

Form error messages

Good contrast

Screen-reader-friendly controls

Do not use icons without accessible labels where the meaning is unclear.

43. RESPONSIVE MOBILE EXPERIENCE

The business owner must be able to use the application from a phone.

On mobile:

Sidebar becomes a drawer

Tables become responsive

Cards stack

Forms become single-column

Buttons remain accessible

Important actions remain easy to reach

Do not allow horizontal overflow unnecessarily.

44. SEED DATA

Create development seed/sample data.

Use realistic Nigerian business examples.

For example:

Client:
Ahmad Musa

Institution:
Gombe State University

Project:
Student Attendance Management System

Service:
Final Year Project Software


Also create sample:

Clients

Services

Projects

Invoices

Payments

Expenses

Clearly distinguish development seed data from real production data.

45. REAL-WORLD FINAL YEAR PROJECT WORKFLOW

Implement this workflow:

Lead/Client
      ↓
Client Registered
      ↓
Service Selected
      ↓
Project Created
      ↓
Quotation/Invoice
      ↓
Payment
      ↓
Project Development
      ↓
Progress Tracking
      ↓
Client Review
      ↓
Corrections
      ↓
Completed
      ↓
Final Delivery


The system should support this workflow naturally.

46. SERVICE → PROJECT → INVOICE CONNECTION

Make these modules connected.

Example:

A student purchases:

Chapter One                 ₦15,000
Chapter Two                 ₦20,000
Project Software           ₦150,000


The system should be able to create an invoice:

Subtotal = ₦185,000
Paid = ₦100,000
Balance = ₦85,000


The associated project should show:

Budget: ₦185,000
Paid: ₦100,000
Balance: ₦85,000


Do not require the administrator to manually calculate these values.

47. DASHBOARD EXAMPLE

Create dashboard cards such as:

Total Revenue
₦1,250,000
+12.5%

Total Expenses
₦350,000

Net Profit
₦900,000

Outstanding
₦280,000


But calculate all values dynamically from the database.

48. PROJECT STATUS UI

Use a professional progress visualization.

Example:

Secure QR Attendance System

████████████████░░░░ 80%

Status:
Testing

Deadline:
September 20, 2026


49. PROFESSIONAL TABLE DESIGN

Tables should include:

Clear headers

Search

Filters

Pagination

Row actions

View

Edit

Delete/cancel where appropriate

Example:

Client          Project              Amount       Status
---------------------------------------------------------
Ahmad Musa      QR Attendance        ₦150,000     In Progress
Aisha Bello     E-Commerce App       ₦250,000     Completed


50. NO FAKE FUNCTIONALITY

This is extremely important.

Do NOT create buttons that do nothing.

Do NOT create fake statistics.

Do NOT create fake invoices.

Do NOT create fake authentication.

Do NOT use static JSON as the production data source.

Every visible business feature must actually work.

If a feature is not implemented, do not pretend it is implemented.

51. DATABASE MIGRATIONS

Provide Supabase SQL migrations for:

Tables

Relationships

Indexes

Constraints

RLS

Functions/triggers where required

Keep database structure version-controlled.

52. README

Create a complete README containing:

Project Overview
Features
Technology Stack
Architecture
Database Setup
Supabase Setup
Environment Variables
Local Development
Running the Application
Building for Production
Deployment to Vercel
Security
Database Migration
Seed Data
Future Roadmap


53. CODE QUALITY

Write professional TypeScript.

Avoid:

any


unless absolutely necessary.

Use:

Strong types

Reusable functions

Clear naming

Small components

Consistent formatting

Error handling

Comments only where useful

Do not over-engineer.

54. TESTING

Before considering the MVP complete, test:

Authentication

Login

Logout

Invalid credentials

Protected routes

Clients

Create

Read

Update

Delete

Search

Services

Create

Update

Activate/deactivate

Projects

Create

Update

Progress

Status

Client relationship

Invoices

Create

Calculate totals

Calculate balance

Status changes

Payments

Record payment

Update invoice

Update project

Expenses

Create

Edit

Delete/cancel

Report calculation

Reports

Revenue

Expenses

Profit

Outstanding balances

55. SECURITY TESTING

Verify:

Unauthenticated users cannot access protected data.

RLS policies work.

Users cannot access unauthorized records.

Secrets are not exposed.

Environment variables are correctly used.

Database constraints prevent invalid financial data.

56. PRODUCTION CHECKLIST

Before declaring the project complete, verify:

[ ] Authentication works
[ ] Database works
[ ] RLS works
[ ] Dashboard uses real data
[ ] Clients work
[ ] Services work
[ ] FYP services work
[ ] Chapters work
[ ] Software projects work
[ ] Projects work
[ ] Invoices work
[ ] Payments work
[ ] Expenses work
[ ] Reports work
[ ] Search works
[ ] Filters work
[ ] Forms validate
[ ] Error handling works
[ ] Mobile UI works
[ ] Desktop UI works
[ ] Invoice printing works
[ ] No fake data in production
[ ] No broken buttons
[ ] No console errors
[ ] No exposed secrets
[ ] README completed
[ ] Production build succeeds


57. DEVELOPMENT APPROACH

Do not attempt to generate the entire application blindly in one step.

Work in phases.

Phase 1

Build:

Project foundation
Authentication
Database
Application layout
Navigation
Settings


Phase 2

Build:

Clients
Services
Final Year Project services


Phase 3

Build:

Projects
Project progress
Project details


Phase 4

Build:

Invoices
Invoice items
Payments


Phase 5

Build:

Expenses
Dashboard calculations
Reports


Phase 6

Build:

Files
Printing
Responsive optimization
Error handling
Security hardening


Phase 7

Perform:

Testing
Bug fixing
Performance optimization
Production build
Deployment preparation


58. IMPORTANT DEVELOPMENT RULE

After completing each phase:

Run the application.

Check for TypeScript errors.

Check for build errors.

Check the browser console.

Test the implemented features.

Fix errors before proceeding.

Do not leave known errors for later.

Do not simply generate code and assume it works.

59. FINAL PRODUCT STANDARD

The finished application should feel similar in quality to a modern SaaS business application.

It must NOT look like:

A student project
A basic CRUD tutorial
A generated dashboard template
A collection of random pages


It should feel like:

A real business product


The owner should be able to open the system and immediately understand:

How much money the business made
How much was spent
How much profit was made
Who the clients are
What projects are active
Which invoices are unpaid
What services the business offers
Which final-year projects are being developed


60. FUTURE-READY ARCHITECTURE

Do not implement these yet, but structure the application so they can be added later:

Client Portal
Staff Management
Role-Based Access Control
WhatsApp Notifications
Email Notifications
Online Payments
Inventory
Accounting
CRM Leads
Quotations
Contracts
Subscription Services
AI Business Assistant
Mobile Application
Multi-user Team Management
Advanced Analytics


Do not build these features unless required for the MVP.

61. FINAL INSTRUCTION

Start by inspecting the existing project if one exists.

Do not destroy existing working functionality without a reason.

If the existing architecture is poor, refactor it into a clean structure.

First analyze:

Current project structure
package.json
Environment configuration
Existing database
Existing Supabase configuration
Existing components
Existing routes
Existing authentication


Then create an implementation plan.

After the plan, implement the MVP phase-by-phase.

At the end:

Run all available checks.

Fix TypeScript errors.

Fix build errors.

Fix runtime errors.

Verify database relationships.

Verify authentication.

Verify RLS.

Verify financial calculations.

Verify responsive design.

Verify all major workflows.

Update README.

Leave the application in a working production-ready state.

Do not stop after creating the UI.

The final result must be a fully functional Bargazal and Sons Tech Solutions Business Management System MVP connected to Supabase with real database operations.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/18d13daf-de72-4f2c-9104-8e12f89fef6b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

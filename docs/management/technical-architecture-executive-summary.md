# Technical Architecture Executive Summary

KariGO uses one coordinated codebase so the customer app, rider app, vendor dashboard,
admin portal, shared designs/types, and backend evolve together without duplicating core
rules.

## Product Surfaces

- Customer and rider mobile applications are built with Expo/React Native.
- Vendor and admin web products are built with Next.js.
- A NestJS backend provides versioned APIs and enforces business and access rules.
- PostgreSQL stores operational records; Prisma provides a controlled database layer.

## Trust And Control

JWT authentication identifies users. Role-based controls separate customer, vendor,
rider, and admin actions. Orders keep status history; sensitive admin actions create
audit records. Payment totals and status transitions are controlled by the backend.
Delivery requires the correct OTP.

## Provider Strategy

Payment and communication capabilities use provider abstractions, allowing KariGO to
retain mock providers for demos and later certify Paystack, Termii, email, WhatsApp, or
push providers without rewriting core order workflows. No real provider is currently
approved for production.

## Documentation And Operations

Swagger documents the API. Health checks, consistent responses/errors, seed/demo data,
tests, smoke journeys, deployment runbooks, incident/escalation templates, and launch
gates support controlled operations.

## Growth Approach

The shared backend and role-based product surfaces can support more vendors, riders,
zones, and cities. Scaling still requires production hosting, monitoring, backups,
security/session hardening, provider certification, operational capacity, legal review,
and evidence-based city expansion. No credentials or sensitive implementation details
are included in this summary.

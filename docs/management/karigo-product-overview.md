# KariGO Product Overview

## What KariGO Is

KariGO is a delivery and local-commerce platform designed to help people and businesses
in Kano request everyday deliveries and errands through one coordinated system.

## The Problem

Local delivery is often fragmented: customers struggle to find reliable fulfilment,
vendors lack consistent order tools, riders receive poorly coordinated jobs, and
operators have limited visibility when something goes wrong. KariGO brings these roles
into one managed workflow.

## Core MVP Services

- Food delivery
- Grocery and market delivery
- Parcel delivery
- SME and corporate errands

## Four Product Surfaces

- **Customer app:** registration, addresses, vendor browsing, ordering, payment,
  tracking, support, and notifications.
- **Rider app:** availability, assigned jobs, delivery progress, OTP completion,
  earnings, and notifications.
- **Vendor dashboard:** paid orders, acceptance/rejection, preparation, pickup readiness,
  and basic operational views.
- **Admin portal:** dashboard, orders, dispatch, support, refunds, promotions, reports,
  settlements, riders, vendors, and users.

## How An Order Works

The customer creates and pays for an order. The vendor accepts and prepares it. An admin
assigns an available rider. The rider collects and delivers it, then completes delivery
with the customer's OTP. KariGO records vendor settlement and rider earnings, while
support and reporting give the operations team oversight.

## Kano Pilot Approach

KariGO proposes a limited Kano pilot using selected zones, vendors, riders, invite-only
customers, controlled hours, manual oversight, daily reporting, and clear pause/expansion
rules. The proposed pilot remains subject to formal approval and blocker closure.

## Current Status

The MVP backend and all four product surfaces are implemented and verified for an
internal demo using synthetic data and mock providers. The complete food/parcel,
vendor, dispatch, delivery, support, refund, promo, notification, settlement, and
reporting journeys have automated and live smoke-test evidence.

## What Remains Mock

Payment, OTP/SMS, email, WhatsApp, push notifications, and bank payouts are not live.
Paystack and Termii have preparation work but are not approved for production use.

## Required Before Public Launch

KariGO still requires production infrastructure and monitoring, certified payment and
OTP providers, secure dashboard sessions, physical-device/browser testing, operational
rehearsal, real vendor/rider onboarding, and legal, privacy, security, and policy approval.

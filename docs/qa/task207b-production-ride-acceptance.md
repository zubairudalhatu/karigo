# Task 207B Production Ride Acceptance Checklist

## Scope

Use this checklist after backend migration/deploy, Admin deploy, Customer OTA and Captain OTA. A successful build or OTA does not equal real-device acceptance.

## Admin Setup

| Check | Expected result | Status |
| --- | --- | --- |
| Backend health | API is healthy | Pending |
| Ride config | Production enabled, dispatch mode manual, automatic matching disabled | Pending |
| Service areas | Kano and Abuja active | Pending |
| Ride Captain application | Approved | Pending |
| Required Ride documents | Approved | Pending |
| Ride profile | `ACTIVE` | Pending |
| Captain account | Active, phone verified, login ready | Pending |
| Admin Dispatch | KariGO Ride Dispatch loads | Pending |

## Captain Online

| Check | Expected result | Status |
| --- | --- | --- |
| Captain signs in | Session stays valid | Pending |
| Ride availability on | Foreground location requested only when needed | Pending |
| Admin sees Captain | Online for Ride with recent location | Pending |
| Old wording | No pilot, staging or test text on production screens | Pending |

## Customer Ride Request

| Check | Expected result | Status |
| --- | --- | --- |
| Open Customer Rides | Map-first Ride flow loads | Pending |
| Select pickup/destination | Route, distance, duration and fare estimate appear | Pending |
| Submit Ride | One `REQUESTED` Ride is created | Pending |
| Customer status | Finding a KariGO Captain | Pending |
| Duplicate guard | Second active Ride request is blocked safely | Pending |

## Manual Dispatch

| Check | Expected result | Status |
| --- | --- | --- |
| Admin sees Ride | Appears under Awaiting assignment | Pending |
| Eligible Captains | List shows only active, online, recent-location Captains | Pending |
| Assign Captain | Ride moves to Awaiting Captain acceptance | Pending |
| Customer update | Customer sees assigned Captain state | Pending |
| Captain update | Captain sees assigned Ride offer | Pending |

## Captain Acceptance And Trip Lifecycle

| Check | Expected result | Status |
| --- | --- | --- |
| Accept assignment | Ride moves to Accepted | Pending |
| Customer tracking | Customer sees Captain on the way | Pending |
| Arrive pickup | Customer sees Ride PIN | Pending |
| Wrong PIN | Start is rejected | Pending |
| Correct PIN | Ride moves to Started | Pending |
| Arrive destination | Ride shows destination-arrived state | Pending |
| Complete Ride | Receipt/history show completed Ride | Pending |
| Post-completion | Captain availability restores from saved preferences | Pending |

## Decline And Reassignment

| Check | Expected result | Status |
| --- | --- | --- |
| Assign Ride | Captain receives offer | Pending |
| Decline with reason | Ride returns to Awaiting assignment if still valid | Pending |
| Work lock release | Captain availability restores safely | Pending |
| Reassign | Another eligible Captain can be assigned | Pending |

## Dual-Mode Work Lock

| Check | Expected result | Status |
| --- | --- | --- |
| Delivery online only | Eligible only for Delivery | Pending |
| Ride online only | Eligible only for Ride | Pending |
| Both online | Admin shows Online for Delivery and Ride | Pending |
| Assign Delivery | Ride becomes Paused immediately | Pending |
| Attempt Ride assignment | Backend returns cross-mode conflict | Pending |
| Release Delivery | Prior desired availability restores | Pending |
| Assign Ride | Delivery becomes Paused immediately | Pending |
| Attempt Delivery assignment | Backend returns cross-mode conflict | Pending |
| App restart during work | Active lock remains | Pending |

## Delivery Application Revision

Use controlled application reference `KGO-CAPTAIN-2026-8D3355` only when it belongs unambiguously to the signed-in KariGO account.

| Check | Expected result | Status |
| --- | --- | --- |
| Application status | Revision required appears | Pending |
| CTA | Upload requested documents is visible | Pending |
| Revision route | Same application reference appears | Pending |
| Ride access | Active Ride access remains unchanged | Pending |
| Upload documents | Secure uploads complete | Pending |
| Submit updates | Status becomes Under review or equivalent | Pending |
| Admin review | New documents appear under same application | Pending |
| Duplicate check | No duplicate Delivery application or user is created | Pending |

## Trash And Restore

| Check | Expected result | Status |
| --- | --- | --- |
| Reject Delivery application | Move to Trash appears | Pending |
| Trash with reason | Removed from active list | Pending |
| Restore Delivery | Returns to rejected list | Pending |
| Reject Ride application | Move to Trash appears | Pending |
| Trash with reason | Removed from active list | Pending |
| Restore Ride | Returns to rejected list | Pending |
| Account safety | KariGO user and documents are not deleted | Pending |
| Audit records | Trash/restore events are present | Pending |

## Acceptance Decision

Do not mark KariGO Rides live until every required section is passed on real devices and Admin confirms operational readiness.

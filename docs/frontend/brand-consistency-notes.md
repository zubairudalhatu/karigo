# Brand Consistency Notes

## Brand System

The shared source of truth is `packages/config/src/index.ts`.

- Primary red: `#E11D2E`
- Primary dark red: `#B81422`
- Charcoal: `#202124`
- Black: `#111111`
- White: `#FFFFFF`
- Light-grey background: `#F5F6F8`
- Muted text: `#6B7280`
- Border: `#E5E7EB`

Success, warning, error, and information colours are used only to communicate state; they
do not replace KariGO red as the primary action/brand colour.

## Logo Placement

The approved logo is available in the shared config assets and each app's appropriate
asset/public folder. It is shown with `contain` behavior or proportional web sizing on:

- Customer splash/welcome and home header
- Rider splash/login/dashboard header
- Vendor login and dashboard navigation
- Admin login and portal navigation

Do not stretch, crop, recolour, rotate, or place the logo on a visually noisy background.

## Shared Interaction Rules

- Primary actions use KariGO red.
- Secondary actions use a white surface with a light-grey border.
- Destructive actions require confirmation and use clear warning copy.
- Status badges use consistent readable labels and semantic colours.
- Cards use white surfaces, subtle borders, generous spacing, and restrained shadows.
- Empty/error/loading states always explain what is happening rather than leaving blank
  screens or raw API output.

## Future Brand Work

- Produce final app-store icon and splash variants with appropriate safe areas.
- Define typography and icon libraries after the pilot.
- Add approved photography/illustration direction for local commerce and delivery.
- Complete a contrast/accessibility review on physical devices and target browsers.

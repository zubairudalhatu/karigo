const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// May also run against the exact Build 1 source checkout; never loads app secrets.
const app = process.argv[2] || path.resolve(__dirname, '..');
const dashboard = fs.readFileSync(path.join(app, 'app/tabs/dashboard.tsx'), 'utf8');
const background = fs.readFileSync(path.join(app, 'src/lib/background-location.ts'), 'utf8');
const selector = dashboard.match(/const activeRide = useMemo\(\(\) => (.*), \[rideTrips\]\);/)[1];
const declaration = name => dashboard.match(new RegExp('const ' + name + ' = ([\\s\\S]*?);'))[1];
const select = rideTrips => vm.runInNewContext(selector, { rideTrips });
const state = { desiredRideOnline: false, activeWorkMode: null, rideEligibility: { eligible: true } };
const context = { readinessAllowsOnline: true, workState: state, availabilityUpdating: false, projection: { ride: { active: true } },
  launchAvailabilityLoading: false, rideLaunch: { available: true }, rideCanRefreshStaleLocation: false };
context.canToggle = vm.runInNewContext(declaration('canToggle'), context);
context.canStartRide = vm.runInNewContext(declaration('canStartRide'), context);
assert.equal(select([]), null, 'unassigned REQUESTED fixture is absent from Captain feeds');
assert.equal(context.canToggle, true);
assert.equal(vm.runInNewContext(declaration('canToggleRide'), context), true);
assert.match(dashboard, /if \(activeRide\) \{[\s\S]*?Busy — Ride/);
for (const status of ['DRIVER_ASSIGNED', 'ACCEPTED', 'ARRIVED_PICKUP', 'STARTED', 'ARRIVED_DESTINATION']) {
  assert.equal(select([{ status }]).status, status, 'existing assigned/accepted workspace unchanged');
}
for (const status of ['COMPLETED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_ADMIN', 'EXPIRED']) {
  assert.equal(select([{ status }]), null);
}
const acceptedExpression = background.match(/function hasAcceptedActiveWork[^\{]+\{\s*return ([^;]+);/)[1];
const tracks = (activeWorkMode, lockStage) => vm.runInNewContext(acceptedExpression, { state: { activeWorkMode, lockStage } });
assert.equal(tracks(null, null), false);
assert.equal(tracks('RIDE', 'OFFERED'), false);
assert.equal(tracks('RIDE', 'ACCEPTED'), true);
assert.equal(tracks('RIDE', 'IN_PROGRESS'), true);
assert.equal(tracks(null, 'IN_PROGRESS'), false);
console.log('PASS: unassigned pre-offer feed keeps availability/no Busy; existing offered/accepted/terminal UI and accepted-work tracking unchanged');

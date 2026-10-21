import { Alert, AppState, Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { captainAccessApi, type CaptainWorkState } from "../api/captain-access.api";
import { authApi } from "../api/auth.api";
import { authSessionStore } from "../api/client";
import { toOperationalLocationPayload } from "./location";
import { acknowledgeRideTracePoints, beginWorkTraceScope, bufferBackgroundRideTrace, clearActiveWorkTraceBuffer, readActiveWorkTraceScope, sameTraceScope, traceUploadContext, type RideTraceScope } from "./ride-trace-buffer";
import { diagnosticFailure, locationDiagnostic } from "./location-diagnostics";
export const CAPTAIN_BACKGROUND_LOCATION_TASK = "karigo-captain-active-work-location";
export const ACTIVE_WORK_LOCATION_DISCLOSURE = "KariGO Captain collects your location while the app is minimized or not in use during an accepted Ride or Delivery assignment. This enables live trip or delivery tracking and safety. Background tracking stops when your active assignment ends. Your location is not used for advertising. Choose Continue to allow background location, or Not now to keep working with the app open.";
let generation = 0;
let transition: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = transition.then(operation, operation); transition = result.catch(() => undefined); return result;
}
export function hasAcceptedActiveWork(state: Pick<CaptainWorkState, "activeWorkMode" | "lockStage"> | null | undefined) {
  return Boolean(state?.activeWorkMode && (state.lockStage === "ACCEPTED" || state.lockStage === "IN_PROGRESS"));
}
function workId(state: CaptainWorkState) { return state.activeWorkMode === "RIDE" ? state.activeRideTripId : state.activeDeliveryAssignmentId; }
function matches(state: CaptainWorkState, scope: RideTraceScope) { return hasAcceptedActiveWork(state) && state.activeWorkMode === scope.mode && workId(state) === scope.workId; }
async function diagnosedWorkState(workRef?: string) {
  try { const state=await captainAccessApi.workState(); await locationDiagnostic("WORK",{stateAvailable:true,workRef}); return state; }
  catch(e) { await locationDiagnostic("WORK",{stateAvailable:false,workRef,...diagnosticFailure(e)}); throw e; }
}
export function activeWorkLocationOptions(): Location.LocationTaskOptions {
  return {
    accuracy: Location.Accuracy.Balanced, activityType: Location.ActivityType.AutomotiveNavigation,
    distanceInterval: 50, deferredUpdatesDistance: 100, deferredUpdatesInterval: 60_000,
    // Accepted-work progress must continue after stops/traffic. Never used for idle work.
    pausesUpdatesAutomatically: Platform.OS === "ios" ? false : true,
    showsBackgroundLocationIndicator: true,
    foregroundService: { notificationTitle: "KariGO Captain active Ride or Delivery", notificationBody: "Location is updating while your accepted assignment is active.", notificationColor: "#E31E24", killServiceOnDestroy: true }
  };
}
export async function inspectActiveWorkLocationTask() {
  await locationDiagnostic("NATIVE_STATE",{defined:TaskManager.isTaskDefined(CAPTAIN_BACKGROUND_LOCATION_TASK)});
  try {
    const [registered, started, fg, bg, options] = await Promise.all([
      TaskManager.isTaskRegisteredAsync(CAPTAIN_BACKGROUND_LOCATION_TASK), Location.hasStartedLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK),
      Location.getForegroundPermissionsAsync(), Location.getBackgroundPermissionsAsync(), TaskManager.getTaskOptionsAsync(CAPTAIN_BACKGROUND_LOCATION_TASK)
    ]);
    const expected=activeWorkLocationOptions();
    const nativeOptions = options as Partial<Location.LocationTaskOptions> | null;
    const keys=["accuracy","activityType","distanceInterval","deferredUpdatesDistance","deferredUpdatesInterval","pausesUpdatesAutomatically","showsBackgroundLocationIndicator"] as const;
    const effective: Partial<Location.LocationTaskOptions>={};
    for (const k of keys) if (nativeOptions?.[k] !== undefined) Object.assign(effective,{[k]:nativeOptions[k]});
    const result={ defined:TaskManager.isTaskDefined(CAPTAIN_BACKGROUND_LOCATION_TASK), registered, started,
      foregroundGranted:fg.granted, backgroundGranted:bg.granted, optionsMatch:!!nativeOptions && keys.every(k=>nativeOptions[k]===expected[k]), ...effective };
    await locationDiagnostic("NATIVE_STATE",result); return result;
  } catch(e) { await locationDiagnostic("FAILURE",diagnosticFailure(e)); return null; }
}
function showDisclosure() {
  return new Promise<boolean>(resolve => Alert.alert("Location during active work", ACTIVE_WORK_LOCATION_DISCLOSURE, [
    {text:"Not now",style:"cancel",onPress:()=>resolve(false)}, {text:"Continue",onPress:()=>resolve(true)}
  ],{cancelable:true,onDismiss:()=>resolve(false)}));
}
TaskManager.defineTask<{locations?: Location.LocationObject[]}>(CAPTAIN_BACKGROUND_LOCATION_TASK, async ({data,error}) => {
  await locationDiagnostic("CALLBACK",{locationCount:data?.locations?.length??0,appForeground:AppState.currentState === "active",reason:error?"TASK_ERROR":"OK",
    ...(typeof error?.code === "number" ? {nativeErrorCode:error.code} : {})});
  if(error || !data?.locations?.length) return;
  const sampleGeneration=generation, authGeneration=authSessionStore.currentGeneration();
  const ownsRuntime = () => sampleGeneration === generation && authSessionStore.isCurrent(authGeneration);
  let capturedScope: RideTraceScope | null | undefined;
  try {
    let session: Awaited<ReturnType<typeof authSessionStore.readSession>>;
    try { session=await authSessionStore.readSession(); }
    catch(e) { await locationDiagnostic("AUTH",{sessionAvailable:false,...diagnosticFailure(e)}); if(ownsRuntime()) await disableActiveWorkBackgroundLocation(); return; }
    await locationDiagnostic("AUTH",{sessionAvailable:!!session});
    if(!session) { if(ownsRuntime()) await disableActiveWorkBackgroundLocation(); return; }
    const scope=await readActiveWorkTraceScope();
    capturedScope=scope;
    if(!scope) { await locationDiagnostic("FILTER",{accepted:false,reason:"NO_SCOPE"}); await disableActiveWorkBackgroundLocation(null); return; }
    let identity: Awaited<ReturnType<typeof authApi.me>>;
    try { identity=await authApi.me(); }
    catch(e) { await locationDiagnostic("AUTH",{sessionAvailable:false,...diagnosticFailure(e)}); await disableActiveWorkBackgroundLocation(scope); return; }
    let state: CaptainWorkState;
    try { state=await diagnosedWorkState(scope.epoch); }
    catch { await disableActiveWorkBackgroundLocation(scope); return; }
    if(sampleGeneration!==generation || !authSessionStore.isCurrent(authGeneration) || !sameTraceScope(await readActiveWorkTraceScope(),scope)) { await locationDiagnostic("FILTER",{accepted:false,reason:"SESSION_CHANGED"}); return; }
    if(identity.id!==scope.captainUserId || !matches(state,scope)) { await locationDiagnostic("FILTER",{accepted:false,reason:"WORK_CHANGED"}); await disableActiveWorkBackgroundLocation(scope); return; }
    let tracePoints: Awaited<ReturnType<typeof bufferBackgroundRideTrace>>;
    try { tracePoints=await bufferBackgroundRideTrace(scope,data.locations); }
    catch { await locationDiagnostic("BUFFER",{reason:"STORAGE_ERROR",workRef:scope.epoch}); return; }
    await locationDiagnostic("BUFFER",{bufferedCount:tracePoints.length,workRef:scope.epoch});
    if(!tracePoints.length) { await locationDiagnostic("FILTER",{accepted:false,reason:"INVALID_OR_OLD_SAMPLE"}); return; }
    // Recheck after storage/network awaits; the backend also atomically binds the request.
    const latestState=await diagnosedWorkState(scope.epoch);
    if(sampleGeneration!==generation || !authSessionStore.isCurrent(authGeneration) || !sameTraceScope(await readActiveWorkTraceScope(),scope) || !matches(latestState,scope)) {
      await locationDiagnostic("FILTER",{accepted:false,reason:"WORK_CHANGED"}); await disableActiveWorkBackgroundLocation(scope); return;
    }
    const latest=tracePoints[tracePoints.length-1];
    await locationDiagnostic("FILTER",{accepted:true,reason:"OK",workRef:scope.epoch});
    await locationDiagnostic("UPLOAD",{uploadAttempted:true,workRef:scope.epoch});
    try {
      const updated=await captainAccessApi.updateAvailability({...toOperationalLocationPayload(latest),tracePoints,traceContext:traceUploadContext(scope)});
      await locationDiagnostic("UPLOAD",{uploadAttempted:true,httpStatus:200,reason:"OK",workRef:scope.epoch});
      await acknowledgeRideTracePoints(scope,tracePoints.map(p=>p.clientPointId));
      if(!matches(updated,scope)) await disableActiveWorkBackgroundLocation(scope);
    } catch(e) {
      await locationDiagnostic("UPLOAD",{uploadAttempted:true,...diagnosticFailure(e),workRef:scope.epoch});
      const status=(e as {status?:number})?.status;
      if(status===401 || status===403 || status===409) await disableActiveWorkBackgroundLocation(scope);
      // Transient failure retains only this scope's bounded buffer for the next callback.
    }
  } catch(e) { await locationDiagnostic("FAILURE",diagnosticFailure(e)); if(capturedScope !== undefined || ownsRuntime()) await disableActiveWorkBackgroundLocation(capturedScope); }
});
void locationDiagnostic("DEFINED",{defined:TaskManager.isTaskDefined(CAPTAIN_BACKGROUND_LOCATION_TASK)});
export function enableActiveWorkBackgroundLocation() {
  const request=++generation;
  return serialize(async()=>{
    const current=()=>request===generation;
    if(!current() || AppState.currentState!=="active") return false;
    await locationDiagnostic("START_REQUEST",{appForeground:true});
    const state=await diagnosedWorkState();
    if(!current() || !hasAcceptedActiveWork(state) || !workId(state)) return false;
    const session=await authSessionStore.readSession();
    await locationDiagnostic("AUTH",{sessionAvailable:!!session});
    if(!session) return false;
    const identity=await authApi.me();
    const foreground=await Location.getForegroundPermissionsAsync();
    await locationDiagnostic("PERMISSION",{foregroundGranted:foreground.granted});
    if(!current() || !foreground.granted) return false;
    const started=await Location.hasStartedLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK);
    const snapshot=await inspectActiveWorkLocationTask();
    const existingScope=await readActiveWorkTraceScope();
    const belongsToThisWork=existingScope?.captainUserId===identity.id && existingScope.mode===state.activeWorkMode && existingScope.workId===workId(state);
    const canReuse=!!(belongsToThisWork && started && snapshot?.registered && snapshot.optionsMatch && snapshot.foregroundGranted && snapshot.backgroundGranted);
    const scope=await beginWorkTraceScope(identity.id,state.activeWorkMode!,workId(state)!,canReuse);
    if(canReuse) return current();
    if(started) await Location.stopLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK);
    if(!current() || AppState.currentState!=="active" || !await showDisclosure()) { await locationDiagnostic("PERMISSION",{reason:"CONSENT_DECLINED"}); return false; }
    if(!current() || AppState.currentState!=="active") return false;
    const background=await Location.requestBackgroundPermissionsAsync();
    await locationDiagnostic("PERMISSION",{backgroundGranted:background.granted});
    if(!current() || !background.granted) return false;
    const latestState=await diagnosedWorkState(scope.epoch);
    if(!current() || !matches(latestState,scope)) { await clearActiveWorkTraceBuffer(scope); return false; }
    await Location.startLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK,activeWorkLocationOptions());
    if(!current()) { await Location.stopLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK); await clearActiveWorkTraceBuffer(scope); return false; }
    await locationDiagnostic("STARTED",{started:true,workRef:scope.epoch});
    const result=await inspectActiveWorkLocationTask();
    return !!result?.defined && !!result.registered && !!result.started && result.optionsMatch;
  });
}
export function disableActiveWorkBackgroundLocation(expected?: RideTraceScope | null) {
  // Explicit logout/work-end cancels startup immediately. A late callback may stop
  // only its captured scope, never a newer assignment's native task or buffer.
  if (expected === undefined) ++generation;
  return serialize(async()=>{
    if (expected !== undefined) {
      const current=await readActiveWorkTraceScope();
      if (expected === null ? current !== null : !sameTraceScope(current,expected)) return;
      ++generation;
    }
    try { if(await Location.hasStartedLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK)) await Location.stopLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK); }
    finally {
      await clearActiveWorkTraceBuffer(expected ?? undefined);
      try { await locationDiagnostic("STOP",{started:await Location.hasStartedLocationUpdatesAsync(CAPTAIN_BACKGROUND_LOCATION_TASK)}); }
      catch(e) { await locationDiagnostic("FAILURE",diagnosticFailure(e)); }
    }
  });
}

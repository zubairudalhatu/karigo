#import <math.h>
#import "EXKariGOLocationDiagnostics.h"
#import <UIKit/UIKit.h>

// Diagnostic payloads never contain native locations, task payloads or identifiers.
// Access is serialized independently of the React Native/JS lifecycle.
@implementation EXKariGOLocationDiagnostics
+ (NSURL *)file {
  NSURL *base = [[[NSFileManager defaultManager] URLsForDirectory:NSApplicationSupportDirectory inDomains:NSUserDomainMask] firstObject];
  return [base URLByAppendingPathComponent:@"karigo-native-location-qa-v1.json"];
}
+ (void)erase {
  [[NSFileManager defaultManager] removeItemAtURL:[self file] error:nil];
}
+ (NSMutableDictionary *)load {
  NSData *data = [NSData dataWithContentsOfURL:[self file]];
  id value = data ? [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingMutableContainers error:nil] : nil;
  NSTimeInterval now = [[NSDate date] timeIntervalSince1970];
  if (![value isKindOfClass:[NSMutableDictionary class]] || ![value[@"expires"] isKindOfClass:[NSNumber class]] ||
      [value[@"expires"] doubleValue] <= now || [value[@"expires"] doubleValue] > now + 1800 ||
      ![value[@"events"] isKindOfClass:[NSMutableArray class]] || [value[@"events"] count] > 64) {
    [self erase]; return nil;
  }
  NSMutableArray *rows = value[@"events"];
  NSIndexSet *old = [rows indexesOfObjectsPassingTest:^BOOL(id row, NSUInteger idx, BOOL *stop) {
    return ![row isKindOfClass:[NSDictionary class]] || ![row[@"at"] isKindOfClass:[NSNumber class]] || now - [row[@"at"] doubleValue] > 1800;
  }];
  [rows removeObjectsAtIndexes:old];
  return value;
}
+ (BOOL)save:(NSDictionary *)state {
  NSURL *file = [self file];
  [[NSFileManager defaultManager] createDirectoryAtURL:[file URLByDeletingLastPathComponent] withIntermediateDirectories:YES attributes:nil error:nil];
  NSData *data = [NSJSONSerialization dataWithJSONObject:state options:0 error:nil];
  return data && [data writeToURL:file options:NSDataWritingAtomic | NSDataWritingFileProtectionCompleteUntilFirstUserAuthentication error:nil];
}
+ (BOOL)enabled {
  @synchronized(self) { return [self load] != nil; }
}
+ (BOOL)arm {
  @synchronized(self) {
    // Do not reset evidence silently; the QA screen requires explicit arming.
    return [self save:@{@"expires": @([[NSDate date] timeIntervalSince1970] + 1800), @"events": @[]}];
  }
}
+ (void)clear { @synchronized(self) { [self erase]; } }
+ (NSDictionary *)read {
  @synchronized(self) {
    NSDictionary *state = [self load];
    return @{@"enabled": @(state != nil), @"maxEvents": @64, @"retentionSeconds": @1800, @"events": state[@"events"] ?: @[]};
  }
}
+ (void)recordStage:(NSString *)stage fields:(NSDictionary *)fields {
  @synchronized(self) {
    NSMutableDictionary *state = [self load]; if (!state) return;
    NSSet *stages = [NSSet setWithArray:@[@"CORELOCATION", @"CONSUMER_REGISTER", @"CONSUMER_EXECUTE", @"BATCH_GATE", @"NATIVE_ERROR", @"MANAGER_LOOKUP", @"TASK_BEGIN", @"TASK_QUEUED", @"HEADLESS_BEGIN", @"HEADLESS_RESULT", @"JS_EVENT_EMIT", @"JS_EVENT_QUEUED", @"TASK_COMPLETE", @"CONSUMER_STOP"]];
    if (![stages containsObject:stage]) return;
    NSMutableDictionary *row = [@{@"at": @([[NSDate date] timeIntervalSince1970]), @"stage": stage} mutableCopy];
    NSSet *booleans = [NSSet setWithArray:@[@"background", @"distancePassed", @"timePassed", @"ready", @"managerFound", @"success", @"diagnosticDeferral", @"allowsBackground", @"restricted", @"denied"]];
    NSSet *counts = [NSSet setWithArray:@[@"count", @"buffered", @"distanceBucket", @"elapsedSeconds", @"errorCode"]];
    NSSet *reasons = [NSSet setWithArray:@[@"WAIT_DISTANCE", @"WAIT_TIME", @"BATCH_READY", @"EMPTY", @"AUTHORIZATION_DENIED", @"AUTHORIZATION_RESTRICTED", @"LOCATION_UNAVAILABLE", @"CONSUMER_START_FAILURE", @"TASK_EXECUTION_FAILURE", @"NATIVE_ERROR"]];
    for (NSString *key in fields) {
      id v = fields[key];
      if ([booleans containsObject:key] && [v isKindOfClass:[NSNumber class]]) row[key] = @([v boolValue]);
      else if ([counts containsObject:key] && [v isKindOfClass:[NSNumber class]] && isfinite([v doubleValue]) && [v doubleValue] >= 0) row[key] = @(MIN(100000, floor([v doubleValue])));
      else if ([key isEqualToString:@"reason"] && [reasons containsObject:v]) row[key] = v;
    }
    NSMutableArray *rows = state[@"events"]; [rows addObject:row];
    while (rows.count > 64) [rows removeObjectAtIndex:0];
    [self save:state];
  }
}
@end

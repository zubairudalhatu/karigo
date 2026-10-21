#import <math.h>
#import <Foundation/Foundation.h>
// Resolve the optional recorder without adding an ExpoLocation -> TaskManager pod dependency.
static inline id KGLocationDiagnosticCall(SEL selector, NSString *stage, NSDictionary *fields) {
  Class cls = NSClassFromString(@"EXKariGOLocationDiagnostics");
  if (![cls respondsToSelector:selector]) return nil;
  void (*record)(id, SEL, NSString *, NSDictionary *) = (void *)[cls methodForSelector:selector];
  record(cls, selector, stage, fields); return nil;
}
static inline BOOL KGLocationDiagnosticsEnabled(void) {
  Class cls = NSClassFromString(@"EXKariGOLocationDiagnostics"); SEL sel = NSSelectorFromString(@"enabled");
  if (![cls respondsToSelector:sel]) return NO;
  BOOL (*enabled)(id, SEL) = (void *)[cls methodForSelector:sel]; return enabled(cls, sel);
}
static inline void KGLocationRecord(NSString *stage, NSDictionary *fields) {
  KGLocationDiagnosticCall(NSSelectorFromString(@"recordStage:fields:"), stage, fields);
}

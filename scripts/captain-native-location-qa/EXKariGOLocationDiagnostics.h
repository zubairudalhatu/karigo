#import <Foundation/Foundation.h>
@interface EXKariGOLocationDiagnostics : NSObject
+ (void)recordStage:(NSString *)stage fields:(NSDictionary *)fields;
+ (BOOL)enabled;
+ (BOOL)arm;
+ (NSDictionary *)read;
+ (void)clear;
@end

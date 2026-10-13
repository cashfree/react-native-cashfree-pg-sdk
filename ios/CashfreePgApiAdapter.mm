// NOTE: This file implements the Objective-C class `CashfreePgApi` (the name React Native's
// TurboModule lookup requires — see RCTTurboModuleManager.mm's getFallbackClassFromName, which
// resolves NSClassFromString(moduleName) BEFORE ever consulting RCTGetModuleClasses()). It is
// deliberately NOT named/renamed to match this file (CashfreePgApiAdapter.{h,mm}), because the
// underlying Swift implementation class is exposed to Obj-C as `CashfreePgApiImpl` and lives in
// CashfreePgApi.swift. If this file were renamed to CashfreePgApi.{h,mm}, both it and
// CashfreePgApi.swift would compile to the same object file name (CashfreePgApi.o) within this
// single target, silently colliding at link time. Keep the file named *Adapter*; only the
// Objective-C class name inside it is `CashfreePgApi`.
#import "CashfreePgApiAdapter.h"
// CFResponseDelegate (used by CashfreePgApi's generated ObjC interface below) lives in
// CashfreePGCoreSDK's own generated Swift header, which is a separate Clang submodule
// (CashfreePGCoreSDK.Swift) not pulled in by a plain `@import CashfreePGCoreSDK;`. Import it
// explicitly so the protocol is declared before react_native_cashfree_pg_sdk-Swift.h references it.
#import <CashfreePGCoreSDK/CashfreePGCoreSDK-Swift.h>
#import "react_native_cashfree_pg_sdk-Swift.h"

@implementation CashfreePgApi {
  CashfreePgApiImpl *_impl;
}

RCT_EXPORT_MODULE(CashfreePgApi)

- (instancetype)init
{
  if (self = [super init]) {
    _impl = [CashfreePgApiImpl new];
    [[CashfreeEmitter sharedInstance] registerEventEmitterWithEventEmitter:self];
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

// Every payment method presents UIKit: each one calls RCTPresentedViewController(),
// which walks the window tree. Without this, React Native dispatches them onto
// com.meta.react.turbomodulemanager.queue — a background queue shared by every
// TurboModule — and reading UIKit off the main thread is undefined behaviour that
// Xcode's Main Thread Checker flags.
//
// Forcing main is safe here: the Cashfree frameworks contain no DispatchQueue.sync
// (verified with nm across all three binaries), so there is no deadlock path, and no
// method in this module does network, semaphore or file work.
- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[ @"cfSuccess", @"cfFailure", @"cfEvent", @"cfUpiApps" ];
}

RCT_EXPORT_METHOD(doPayment:(NSString *)paymentData) { [_impl doPayment:paymentData]; }
RCT_EXPORT_METHOD(doUPIPayment:(NSString *)paymentData) { [_impl doUPIPayment:paymentData]; }
RCT_EXPORT_METHOD(doWebPayment:(NSString *)paymentData) { [_impl doWebPayment:paymentData]; }
RCT_EXPORT_METHOD(doSubscriptionPayment:(NSString *)paymentData) { [_impl doSubscriptionPayment:paymentData]; }
RCT_EXPORT_METHOD(doCardPayment:(NSString *)paymentData) { [_impl doCardPayment:paymentData]; }
RCT_EXPORT_METHOD(doElementUPIPayment:(NSString *)paymentData) { [_impl doElementUPIPayment:paymentData]; }
RCT_EXPORT_METHOD(doElementNBPayment:(NSString *)paymentData) { [_impl doElementNBPayment:paymentData]; }
RCT_EXPORT_METHOD(doSubsCardPayment:(NSString *)paymentData) { [_impl doSubsCardPayment:paymentData]; }
RCT_EXPORT_METHOD(doSubsUPIPayment:(NSString *)paymentData) { [_impl doSubsUPIPayment:paymentData]; }
RCT_EXPORT_METHOD(doSubsNBPayment:(NSString *)paymentData) { [_impl doSubsNBPayment:paymentData]; }
RCT_EXPORT_METHOD(setCallback) { [_impl setCallback]; }
RCT_EXPORT_METHOD(setEventSubscriber) { [_impl setEventSubscriber]; }
RCT_EXPORT_METHOD(removeEventSubscriber) { [_impl removeEventSubscriber]; }

RCT_EXPORT_METHOD(getInstalledUpiApps:(RCTPromiseResolveBlock)resolve
                              reject:(RCTPromiseRejectBlock)reject)
{
  [_impl getInstalledUpiApps:^(NSString *apps) {
    resolve(apps ?: @"[]");
  }];
}

#ifdef RCT_NEW_ARCH_ENABLED
// Declared by the generated protocol. Events are delivered through RCTEventEmitter
// (supportedEvents / sendEventWithName), so there is nothing to wire here. Implemented
// to satisfy conformance and to avoid an unrecognised-selector crash if RN calls it.
- (void)setEventEmitterCallback:(EventEmitterCallbackWrapper *)eventEmitterCallbackWrapper
{
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeCashfreePgApiSpecJSI>(params);
}
#endif

@end

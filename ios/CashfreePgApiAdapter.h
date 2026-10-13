#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNCashfreePgApiSpec/RNCashfreePgApiSpec.h>

@interface CashfreePgApi : RCTEventEmitter <NativeCashfreePgApiSpec>
@end

#else

@interface CashfreePgApi : RCTEventEmitter <RCTBridgeModule>
@end

#endif

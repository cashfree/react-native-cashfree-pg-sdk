#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>

@interface RCT_EXTERN_MODULE(CashfreePgApi, NSObject)

RCT_EXTERN_METHOD(doPayment:(NSString)paymentObject)

RCT_EXTERN_METHOD(setCallback)

@end

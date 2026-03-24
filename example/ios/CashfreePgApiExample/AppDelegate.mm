#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <WebKit/WebKit.h>
#import <objc/runtime.h>

#if DEBUG
@interface WKWebView (CFInspectable)
@end

@implementation WKWebView (CFInspectable)
+ (void)load {
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    if (@available(iOS 16.4, *)) {
      Method orig = class_getInstanceMethod([WKWebView class], @selector(initWithFrame:configuration:));
      Method swiz = class_getInstanceMethod([WKWebView class], @selector(cf_initWithFrame:configuration:));
      method_exchangeImplementations(orig, swiz);
    }
  });
}
- (instancetype)cf_initWithFrame:(CGRect)frame configuration:(WKWebViewConfiguration *)config {
  WKWebView *wv = [self cf_initWithFrame:frame configuration:config];
  if (@available(iOS 16.4, *)) { wv.inspectable = YES; }
  return wv;
}
@end
#endif

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"CashfreePgApiExample";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self getBundleURL];
}
 
- (NSURL *)getBundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

/// This method controls whether the `concurrentRoot`feature of React18 is turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New Architecture).
/// @return: `true` if the `concurrentRoot` feature is enabled. Otherwise, it returns `false`.
- (BOOL)concurrentRootEnabled
{
  return true;
}

@end

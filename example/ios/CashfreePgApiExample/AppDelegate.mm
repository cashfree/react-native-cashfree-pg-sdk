#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <WebKit/WebKit.h>
#import <objc/runtime.h>

#if DEBUG
@interface WKWebView (Inspectable)
@end

@implementation WKWebView (Inspectable)

+ (void)load {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    Method original = class_getInstanceMethod(self, @selector(initWithFrame:configuration:));
    Method swizzled = class_getInstanceMethod(self, @selector(cf_initWithFrame:configuration:));
    method_exchangeImplementations(original, swizzled);
  });
}

- (instancetype)cf_initWithFrame:(CGRect)frame configuration:(WKWebViewConfiguration *)configuration {
  WKWebView *webView = [self cf_initWithFrame:frame configuration:configuration];
  if ([webView respondsToSelector:@selector(setInspectable:)]) {
    [webView setInspectable:YES];
  }
  return webView;
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

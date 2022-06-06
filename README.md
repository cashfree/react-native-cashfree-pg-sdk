# react-native-cashfree-pg-api
The Cashfree React Native SDK allows you to integrate Cashfree Payment Gateway into your application and start collecting payments from your customers. The React Native SDK has been designed to minimise the complexity of handling and integrating payments in your React Native project.

Click [here](https://docs.cashfree.com/docs/react-native-integration) for more Documentation.

## Installation

```sh
npm install react-native-cashfree-pg-sdk
```

### iOS
Add the following code to application's info.plist file.
```xml
<key>LSApplicationCategoryType</key>
<string></string>
<key>LSApplicationQueriesSchemes</key>
<array>
<string>phonepe</string>
<string>tez</string>
<string>paytm</string>
<string>bhim</string>
</array>
```

## Usage

```js
import {
  CFCallback,
  CFErrorResponse,
  CFPaymentGatewayService,
} from 'react-native-cashfree-pg-sdk';
import {
  CFDropCheckoutPayment,
  CFEnvironment,
  CFSession,
  CFThemeBuilder,
} from 'cashfree-pg-api-contract';

// ...

try {
  const session = new CFSession(
    'order_token',
    'order_id',
    CFEnvironment.SANDBOX
  );
  const theme = new CFThemeBuilder()
    .setNavigationBarBackgroundColor('#E64A19')
    .setNavigationBarTextColor('#FFFFFF')
    .setButtonBackgroundColor('#FFC107')
    .setButtonTextColor('#FFFFFF')
    .setPrimaryTextColor('#212121')
    .setSecondaryTextColor('#757575')
    .build();
  const dropPayment = new CFDropCheckoutPayment(session, null, theme);
  CFPaymentGatewayService.doPayment(dropPayment);
} catch (e: any) {
  console.log(e.message);
}
```

## License

MIT

# react-native-cashfree-pg-sdk

![GitHub](https://img.shields.io/github/license/cashfree/react-native-cashfree-pg-sdk) ![npm](https://img.shields.io/npm/v/react-native-cashfree-pg-sdk) ![downloads](https://img.shields.io/npm/dm/react-native-cashfree-pg-sdk.svg?style=flat) ![Discord](https://img.shields.io/discord/931125665669972018?label=discord) ![GitHub last commit (branch)](https://img.shields.io/github/last-commit/cashfree/react-native-cashfree-pg-sdk/master) [![install size](https://packagephobia.com/badge?p=react-native-cashfree-pg-sdk@2.2.7)](https://packagephobia.com/result?p=react-native-cashfree-pg-sdk@2.2.7)

[![NPM](https://nodei.co/npm/react-native-cashfree-pg-sdk.svg?data=n,v,u,d)](https://nodei.co/npm/react-native-cashfree-pg-sdk/)

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
  CFEnvironment,
  CFSession,
  CFThemeBuilder,
} from 'cashfree-pg-api-contract';

// ...

try {
  const session = new CFSession(paymentSessionId, orderId, CFEnvironment.PRODUCTION/CFEnvironment.SANDBOX);
  console.log('Session', JSON.stringify(session));
  CFPaymentGatewayService.doWebPayment(session);
} catch (e: any) {
  console.log(e.message);
}
```

## Contributing

If you want to contribute please read the [Contributing](CONTRIBUTING.md) guidelines.

## License
<pre>
The Cashfree React Native SDK is licensed under the MIT License.
See the LICENSE file distributed with this work for additional
information regarding copyright ownership.

Except as contained in the LICENSE file, the name(s) of the above copyright
holders shall not be used in advertising or otherwise to promote the sale,
use or other dealings in this Software without prior written authorization.
</pre>

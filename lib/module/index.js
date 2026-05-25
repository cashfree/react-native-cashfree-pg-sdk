function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import { NativeAppEventEmitter, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { version } from '../package.json';
const LINKING_ERROR = `The package 'react-native-cashfree-pg-api' doesn't seem to be linked. Make sure: \n\n` + Platform.select({
  ios: "- You have run 'pod install'\n",
  default: ''
}) + '- You rebuilt the app after installing the package\n' + '- You are not using Expo managed workflow\n';
const CashfreePgApi = NativeModules.CashfreePgApi ? NativeModules.CashfreePgApi : new Proxy({}, {
  get() {
    throw new Error(LINKING_ERROR);
  }

});

class CFPaymentGateway {
  constructor() {
    _defineProperty(this, "emitter", void 0);

    _defineProperty(this, "successSubscription", null);

    _defineProperty(this, "failureSubscription", null);

    this.emitter = Platform.OS === 'ios' ? new NativeEventEmitter(NativeModules.CashfreeEventEmitter) : NativeAppEventEmitter;
  }

  doPayment(checkoutPayment) {
    checkoutPayment.version = version;
    CashfreePgApi.doPayment(JSON.stringify(checkoutPayment));
  }

  setCallback(cfCallback) {
    // this.cfCallback = cfCallback;
    let successFunction = orderID => {
      console.log('response is : ' + JSON.stringify(orderID));
      cfCallback.onVerify(orderID);
    };

    let failureFunction = error => {
      console.log('reason: ' + JSON.stringify(error));
      const response = new CFErrorResponse(); // @ts-ignore

      const message = JSON.parse(error);
      response.fromJSON(message.error); // @ts-ignore

      cfCallback.onError(response, message.orderID);
    };

    this.successSubscription = this.emitter.addListener('cfSuccess', successFunction);
    this.failureSubscription = this.emitter.addListener('cfFailure', failureFunction);
    CashfreePgApi.setCallback();
  }

  removeCallback() {
    if (this.successSubscription !== undefined && this.successSubscription !== null) {
      this.emitter.removeSubscription(this.successSubscription);
      this.successSubscription = null;
    }

    if (this.failureSubscription !== undefined && this.failureSubscription !== null) {
      this.emitter.removeSubscription(this.failureSubscription);
      this.failureSubscription = null;
    }
  }

}

export class CFErrorResponse {
  constructor() {
    _defineProperty(this, "status", 'FAILED');

    _defineProperty(this, "message", 'payment has failed');

    _defineProperty(this, "code", 'payment_failed');

    _defineProperty(this, "type", 'request_failed');
  }

  fromJSON(errorString) {
    console.log('errorString :' + errorString);
    const object = JSON.parse(errorString);
    console.log('errorStringObject :' + object);
    this.status = object.status;
    this.message = object.message;
    this.code = object.code;
    this.type = object.type;
  }

  getStatus() {
    return this.status;
  }

  getMessage() {
    return this.message;
  }

  getCode() {
    return this.code;
  }

  getType() {
    return this.type;
  }

}
export var CFPaymentGatewayService = new CFPaymentGateway();
//# sourceMappingURL=index.js.map
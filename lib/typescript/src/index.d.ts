import type { CheckoutPayment } from 'cashfree-pg-api-contract';
declare class CFPaymentGateway {
    private emitter;
    private successSubscription;
    private failureSubscription;
    constructor();
    doPayment(checkoutPayment: CheckoutPayment): void;
    setCallback(cfCallback: CFCallback): void;
    removeCallback(): void;
}
export interface CFCallback {
    onVerify(orderID: string): void;
    onError(error: CFErrorResponse, orderID: string): void;
}
export declare class CFErrorResponse {
    private status;
    private message;
    private code;
    private type;
    fromJSON(errorString: string): void;
    getStatus(): string;
    getMessage(): string;
    getCode(): string;
    getType(): string;
}
export declare var CFPaymentGatewayService: CFPaymentGateway;
export {};

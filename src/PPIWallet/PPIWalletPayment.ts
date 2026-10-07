import {
  CFEnvironment,
  CFPPIWallet,
  type CFPPIWalletPayment,
  type CFSession,
} from 'cashfree-pg-api-contract';
import { CFErrorResponse } from '../CFErrorResponse';

const ROUTE = '/pg/orders/sessions';
const BASE_URLS: Record<string, string> = {
  [CFEnvironment.SANDBOX]: 'https://sandbox.cashfree.com',
  [CFEnvironment.PRODUCTION]: 'https://api.cashfree.com',
};

const failure = (message: string, code: string, type: string = code) =>
  new CFErrorResponse({ message, code, type });

const validationError = (message: string) =>
  failure(message, 'validation_error');

const stringField = (body: unknown, key: string): string | undefined => {
  if (body !== null && typeof body === 'object') {
    const value = (body as Record<string, unknown>)[key];
    if (typeof value === 'string' && value !== '') {
      return value;
    }
  }
  return undefined;
};

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

// Validation is repeated here (on top of the contract constructors) because
// JS callers can mutate or hand-build these objects.
function buildRequest(payment: CFPPIWalletPayment) {
  if (
    payment == null ||
    typeof payment.getSession !== 'function' ||
    typeof payment.getWallet !== 'function'
  ) {
    throw validationError('payment cannot be empty.');
  }
  const session: CFSession = payment.getSession();
  if (
    session == null ||
    typeof session.payment_session_id !== 'string' ||
    session.payment_session_id.trim() === ''
  ) {
    throw validationError('payment_session_id cannot be empty.');
  }
  const baseUrl = BASE_URLS[session.environment];
  if (baseUrl === undefined) {
    throw validationError('environment is invalid.');
  }
  let wallet: CFPPIWallet;
  try {
    wallet = new CFPPIWallet(payment.getWallet());
  } catch (error) {
    throw validationError((error as Error).message);
  }
  return {
    url: baseUrl + ROUTE,
    body: JSON.stringify({
      payment_session_id: session.payment_session_id,
      payment_method: {
        app: {
          provider: wallet.provider,
          channel: wallet.channel,
          phone: wallet.phone,
          wallet_id: wallet.walletId,
          user_id: wallet.userId,
          cf_sub_wallet_id: wallet.cfSubWalletId,
        },
      },
    }),
  };
}

/**
 * Creates a PPI wallet order session. Resolves with the API JSON as-is,
 * rejects with CFErrorResponse. Request/response carry PII: never log them.
 */
export async function doPPIWalletPayment(
  payment: CFPPIWalletPayment
): Promise<unknown> {
  const { url, body: requestBody } = buildRequest(payment);

  let response: Response;
  let text: string;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });
    text = await response.text();
  } catch (error) {
    throw failure(
      (error as Error)?.message || 'Network request failed',
      'network_error'
    );
  }

  const responseBody = parseJson(text);
  if (response.ok && responseBody !== undefined) {
    return responseBody;
  }
  throw failure(
    stringField(responseBody, 'message') ??
      'Something went wrong. Please try again.',
    stringField(responseBody, 'code') ?? 'request_failed',
    stringField(responseBody, 'type') ?? 'api_error'
  );
}

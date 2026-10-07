import {
  CFEnvironment,
  CFPPIWallet,
  CFPPIWalletPayment,
  CFSession,
} from 'cashfree-pg-api-contract';
import { CFErrorResponse } from '../CFErrorResponse';
import { doPPIWalletPayment } from '../PPIWallet/PPIWalletPayment';

const walletParams = {
  phone: '9999999999',
  walletId: 'WALLET_PG_07',
  userId: 'PG_TEST_USER_Ajeet',
  cfSubWalletId: '1445673253583338496',
};

const sandboxSession = () =>
  new CFSession('session_abc', 'order_123', CFEnvironment.SANDBOX);

const payment = (session: CFSession = sandboxSession()) =>
  new CFPPIWalletPayment(session, new CFPPIWallet(walletParams));

const mockResponse = (status: number, body: string) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => body,
});

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
});

const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error as CFErrorResponse;
  }
  throw new Error('expected promise to reject');
};

describe('doPPIWalletPayment request', () => {
  it('posts to the sandbox host for a SANDBOX session', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, '{}'));
    await doPPIWalletPayment(payment());
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://sandbox.cashfree.com/pg/orders/sessions'
    );
  });

  it('posts to the production host for a PRODUCTION session', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, '{}'));
    await doPPIWalletPayment(
      payment(new CFSession('s', 'o', CFEnvironment.PRODUCTION))
    );
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.cashfree.com/pg/orders/sessions'
    );
  });

  it('sends the wallet as snake_case payment_method.app', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, '{}'));
    await doPPIWalletPayment(payment());
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({
      payment_session_id: 'session_abc',
      payment_method: {
        app: {
          provider: 'merchantppiwallet',
          channel: 'link',
          phone: '9999999999',
          wallet_id: 'WALLET_PG_07',
          user_id: 'PG_TEST_USER_Ajeet',
          cf_sub_wallet_id: '1445673253583338496',
        },
      },
    });
  });

  it('sends merchant provider and channel overrides', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, '{}'));
    const wallet = new CFPPIWallet({
      ...walletParams,
      provider: 'otherwallet',
      channel: 'collect',
    });
    await doPPIWalletPayment(new CFPPIWalletPayment(sandboxSession(), wallet));
    const app = JSON.parse(fetchMock.mock.calls[0][1].body).payment_method.app;
    expect(app.provider).toBe('otherwallet');
    expect(app.channel).toBe('collect');
  });

  it('drops fields mutated onto the wallet after construction', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, '{}'));
    const p = payment();
    (p.getWallet() as unknown as Record<string, string>).injected = 'x';
    await doPPIWalletPayment(p);
    const app = JSON.parse(fetchMock.mock.calls[0][1].body).payment_method.app;
    expect(app).not.toHaveProperty('injected');
  });
});

describe('doPPIWalletPayment success', () => {
  it('resolves with the parsed API response', async () => {
    const body = { cf_payment_id: '123', data: { url: 'https://x' } };
    fetchMock.mockResolvedValue(mockResponse(200, JSON.stringify(body)));
    await expect(doPPIWalletPayment(payment())).resolves.toEqual(body);
  });
});

describe('doPPIWalletPayment API failure', () => {
  it('rejects with the Cashfree error fields and http status', async () => {
    const body = {
      message: 'payment_session_id is invalid',
      code: 'payment_session_id_invalid',
      type: 'invalid_request_error',
    };
    fetchMock.mockResolvedValue(mockResponse(400, JSON.stringify(body)));
    const error = await rejection(doPPIWalletPayment(payment()));
    expect(error).toBeInstanceOf(CFErrorResponse);
    expect(error.getStatus()).toBe('FAILED');
    expect(error.getCode()).toBe('payment_session_id_invalid');
    expect(error.getMessage()).toBe('payment_session_id is invalid');
    expect(error.getType()).toBe('invalid_request_error');
  });

  it('rejects with a generic error when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(mockResponse(502, '<html>Bad Gateway</html>'));
    const error = await rejection(doPPIWalletPayment(payment()));
    expect(error.getType()).toBe('api_error');
    expect(error.getCode()).toBe('request_failed');
    expect(error.getMessage()).toBe('Something went wrong. Please try again.');
  });
});

describe('doPPIWalletPayment transport failure', () => {
  it('rejects with network_error when fetch throws', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const error = await rejection(doPPIWalletPayment(payment()));
    expect(error.getType()).toBe('network_error');
    expect(error.getCode()).toBe('network_error');
    expect(error.getMessage()).toBe('Network request failed');
  });

  it('rejects with the same generic error when a 2xx body is not JSON', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, 'not json'));
    const error = await rejection(doPPIWalletPayment(payment()));
    expect(error.getType()).toBe('api_error');
    expect(error.getCode()).toBe('request_failed');
    expect(error.getMessage()).toBe('Something went wrong. Please try again.');
  });
});

describe('doPPIWalletPayment validation', () => {
  const expectValidationError = async (
    input: unknown,
    messagePattern: RegExp
  ) => {
    const error = await rejection(
      doPPIWalletPayment(input as CFPPIWalletPayment)
    );
    expect(error).toBeInstanceOf(CFErrorResponse);
    expect(error.getStatus()).toBe('FAILED');
    expect(error.getType()).toBe('validation_error');
    expect(error.getMessage()).toMatch(messagePattern);
    expect(fetchMock).not.toHaveBeenCalled();
  };

  it('rejects a null payment', () =>
    expectValidationError(null, /payment cannot be empty/));

  it('rejects an object that is not a CFPPIWalletPayment', () =>
    expectValidationError({ foo: 1 }, /payment cannot be empty/));

  it('rejects a blank payment_session_id', () => {
    const session = sandboxSession();
    session.payment_session_id = '  ';
    return expectValidationError(
      payment(session),
      /payment_session_id cannot be empty/
    );
  });

  it('rejects an unknown environment', () => {
    const session = sandboxSession();
    session.environment = 'STAGING';
    return expectValidationError(payment(session), /environment is invalid/);
  });

  it('rejects a wallet field blanked after construction', () => {
    const p = payment();
    (p.getWallet() as unknown as Record<string, string>).phone = '';
    return expectValidationError(p, /phone cannot be empty/);
  });
});

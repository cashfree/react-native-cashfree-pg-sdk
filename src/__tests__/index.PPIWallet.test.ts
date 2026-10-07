import {
  CFEnvironment,
  CFPPIWallet,
  CFPPIWalletPayment,
  CFSession,
} from 'cashfree-pg-api-contract';
import { NativeModules } from 'react-native';
import type * as SDK from '../index';

// Native boundary: the iOS event emitter module is absent under Jest.
NativeModules.CashfreeEventEmitter = {
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};
const { CFPaymentGatewayService, CFErrorResponse } =
  require('../index') as typeof SDK;

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
});

it('CFPaymentGatewayService.doPPIWalletPayment resolves with the API response', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => '{"ok":true}',
  });
  const payment = new CFPPIWalletPayment(
    new CFSession('session_abc', 'order_123', CFEnvironment.SANDBOX),
    new CFPPIWallet({
      phone: '9999999999',
      walletId: 'WALLET_PG_07',
      userId: 'PG_TEST_USER_Ajeet',
      cfSubWalletId: '1445673253583338496',
    })
  );
  await expect(
    CFPaymentGatewayService.doPPIWalletPayment(payment)
  ).resolves.toEqual({ ok: true });
});

it('rejects with the exported CFErrorResponse', async () => {
  await expect(
    CFPaymentGatewayService.doPPIWalletPayment(
      null as unknown as CFPPIWalletPayment
    )
  ).rejects.toBeInstanceOf(CFErrorResponse);
});

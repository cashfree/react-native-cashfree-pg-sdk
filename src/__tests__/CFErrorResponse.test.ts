import { CFErrorResponse } from '../CFErrorResponse';

describe('CFErrorResponse', () => {
  it('keeps the existing defaults when built with no arguments', () => {
    const error = new CFErrorResponse();
    expect(error.getStatus()).toBe('FAILED');
    expect(error.getMessage()).toBe('payment has failed');
    expect(error.getCode()).toBe('payment_failed');
    expect(error.getType()).toBe('request_failed');
  });

  it('takes message, code and type from the constructor', () => {
    const error = new CFErrorResponse({
      message: 'phone cannot be empty.',
      code: 'validation_error',
      type: 'validation_error',
    });
    expect(error.getStatus()).toBe('FAILED');
    expect(error.getMessage()).toBe('phone cannot be empty.');
    expect(error.getCode()).toBe('validation_error');
    expect(error.getType()).toBe('validation_error');
  });

  it('still reads native error JSON via fromJSON', () => {
    const error = new CFErrorResponse();
    error.fromJSON(
      '{"status":"FAILED","message":"cancelled","code":"action_cancelled","type":"request_failed"}'
    );
    expect(error.getMessage()).toBe('cancelled');
    expect(error.getCode()).toBe('action_cancelled');
  });
});

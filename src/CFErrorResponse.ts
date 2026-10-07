export class CFErrorResponse {
  private status: string = 'FAILED';
  private message: string = 'payment has failed';
  private code: string = 'payment_failed';
  private type: string = 'request_failed';

  constructor(fields?: { message?: string; code?: string; type?: string }) {
    if (fields?.message !== undefined) this.message = fields.message;
    if (fields?.code !== undefined) this.code = fields.code;
    if (fields?.type !== undefined) this.type = fields.type;
  }

  fromJSON(errorString: string) {
    console.log('errorString :' + errorString);
    const object = JSON.parse(errorString);
    console.log('errorStringObject :' + object);
    this.status = object.status;
    this.message = object.message;
    this.code = object.code;
    this.type = object.type;
  }

  getStatus(): string {
    return this.status;
  }

  getMessage(): string {
    return this.message;
  }

  getCode(): string {
    return this.code;
  }

  getType(): string {
    return this.type;
  }
}

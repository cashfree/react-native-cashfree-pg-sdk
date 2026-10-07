export class CFErrorResponse {
    status = 'FAILED';
    message = 'payment has failed';
    code = 'payment_failed';
    type = 'request_failed';
    constructor(fields) {
        if (fields?.message !== undefined)
            this.message = fields.message;
        if (fields?.code !== undefined)
            this.code = fields.code;
        if (fields?.type !== undefined)
            this.type = fields.type;
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

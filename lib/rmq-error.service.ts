import { Inject, Injectable } from '@nestjs/common';
import { RMQError } from './classes/rmq-error.class';
import { hostname } from 'os';
import { Message } from 'amqplib';
import { RMQErrorHandler } from './classes/rmq-error-handler.class';
import { IRMQServiceOptions } from './interfaces/rmq-options.interface';
import { RMQ_MODULE_OPTIONS } from './constants';

@Injectable()
export class RmqErrorService {
	private options: IRMQServiceOptions;

	constructor(@Inject(RMQ_MODULE_OPTIONS) options: IRMQServiceOptions) {
		this.options = options;
	}

	public buildError(error: Error | RMQError) {
		if (!error) {
			return null;
		}
		let errorHeaders = {};
		const modifiedError = this.modifyError(error);
		errorHeaders['-x-error'] = modifiedError.message;
		errorHeaders['-x-host'] = hostname();
		errorHeaders['-x-service'] = this.options.serviceName;
		if (this.isRMQError(modifiedError)) {
			errorHeaders = {
				...errorHeaders,
				'-x-status-code': modifiedError.code,
				'-x-data': modifiedError.data,
				'-x-type': modifiedError.type,
			};
		}
		return errorHeaders;
	}

	public errorHandler(msg: Message): any {
		const { headers } = msg.properties;
		if (this.options.errorHandler) {
			return this.options.errorHandler.handle(headers);
		}
		return RMQErrorHandler.handle(headers);
	}

	protected isRMQError(error: Error | RMQError): error is RMQError {
		return (error as RMQError).code !== undefined;
	}

	protected modifyError(error: Error | RMQError): Error | RMQError {
		return error;
	}
}

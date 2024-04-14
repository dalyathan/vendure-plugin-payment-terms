import { Customer, Order, RequestContext, VendureEvent } from '@vendure/core';

/**
 * @description
 * This event is fired whenever a ProductReview is submitted.
 */
export class PaymentTermsDueEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public customer: Customer,
        public order: Order 
    ) {
        super();
    }
}
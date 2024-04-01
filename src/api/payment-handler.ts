import { PaymentMethodHandler, CreatePaymentResult, SettlePaymentResult, LanguageCode, EntityHydrator, CustomerService } from '@vendure/core';
let entityHydrator: EntityHydrator;
let customerService: CustomerService;
export const paymentWithTermsHandler = new PaymentMethodHandler({
  code: 'payment-terms-handler',
  description: [{
    languageCode: LanguageCode.en,
    value: 'Payment Terms Handler',
  }],
  args: {
   
  },
  init(injector) {
    entityHydrator= injector.get(EntityHydrator);
    customerService= injector.get(CustomerService);
  },
  createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
    await entityHydrator.hydrate(ctx, order,{relations: ['customer']})
    if(order.customer?.customFields.paymentLimit && order.customer.customFields.paymentLimit >= order.totalWithTax){
      order.customer.customFields.paymentLimit-=order.totalWithTax;
      await customerService.update(ctx, order.customer)
      return {
        amount: order.totalWithTax,
        state: 'Settled' as const,
        transactionId: metadata.paymentIntentI,
        metadata: {
          currentPaymentLimit: order.customer.customFields.paymentLimit,
          ...metadata
        },
      }
    }
      return {
        amount: order.totalWithTax,
        state: 'Declined' as const,
        metadata: {
          errorMessage: `Payment Limit Exceeded, the current value is ${order?.customer?.customFields.paymentLimit}`,
          ...metadata
        },
      };
  },
  settlePayment: async (ctx, order, payment, args): Promise<SettlePaymentResult> => {
    return { success: true };
  }
});
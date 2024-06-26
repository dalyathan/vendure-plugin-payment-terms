import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, ActiveOrderService, EntityHydrator, UserInputError, PaymentMethodService } from '@vendure/core';
import {PaymentMethodQuote} from '@vendure/common/lib/generated-types';
import { paymentTermsEligibilityChecker } from './payment-eligibilty-checker';

@Resolver('PaymentMethodQuote')
export class PaymentMethodQuoteFieldResolver {
    constructor(private activeOrderService: ActiveOrderService, private entityHydrator: EntityHydrator, private paymentMethodService: PaymentMethodService) { }

    @ResolveField()
    async customerPaymentLimit(@Ctx() ctx: RequestContext, @Parent() paymentMethodQuote: PaymentMethodQuote) {
        const order = await this.activeOrderService.getActiveOrder(ctx,undefined);
        if(!order){
            throw new UserInputError('No active order found')
        }
        await this.entityHydrator.hydrate(ctx, order, {relations: ['customer']})
        const paymentMethodWithTerms= await this.paymentMethodService.findOne(ctx, paymentMethodQuote.id);
        if(paymentMethodWithTerms?.checker?.code === paymentTermsEligibilityChecker.code){
            return order.customer?.customFields?.paymentLimit
        }
    }
}
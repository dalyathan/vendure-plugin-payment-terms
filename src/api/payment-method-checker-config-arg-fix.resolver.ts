import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, RequestContext, Transaction, Permission, PaymentMethod, PaymentMethodService } from '@vendure/core'
import {MutationUpdatePaymentMethodArgs, MutationCreatePaymentMethodArgs, ConfigurableOperationInput} from '@vendure/common/lib/generated-types';

@Resolver('PaymentMethod')
export class OverridePaymentMethodResolver {
    constructor(private paymentMethodService: PaymentMethodService) {}

    @Transaction()
    @Mutation()
    @Allow(Permission.CreateSettings, Permission.CreatePaymentMethod)
    createPaymentMethod(
        @Ctx() ctx: RequestContext,
        @Args() args: MutationCreatePaymentMethodArgs,
    ): Promise<PaymentMethod> {
        this.stringifyCheckerCustomerGroupIds(args.input.checker);
        return this.paymentMethodService.create(ctx, args.input);
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.UpdateSettings, Permission.UpdatePaymentMethod)
    updatePaymentMethod(
        @Ctx() ctx: RequestContext,
        @Args() args: MutationUpdatePaymentMethodArgs,
    ): Promise<PaymentMethod> {
        this.stringifyCheckerCustomerGroupIds(args.input.checker);
        return this.paymentMethodService.update(ctx, args.input);
    }

    private stringifyCheckerCustomerGroupIds(checker:  ConfigurableOperationInput | undefined){
        for(let dynamicComponent of checker?.arguments??[]){
            if(dynamicComponent.name === 'customerGroupId'){
                dynamicComponent.value= JSON.stringify(dynamicComponent.value)
            }
        }
    }

}
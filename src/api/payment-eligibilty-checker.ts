import {EntityHydrator, LanguageCode, PaymentMethodEligibilityChecker, customerGroup} from '@vendure/core';
let entityHydrator: EntityHydrator;
export const paymentTermsEligibilityChecker = new PaymentMethodEligibilityChecker({
    code: 'payment-terms-eligibility-checker',
    description: [{ languageCode: LanguageCode.en, value: 'Only those customers in this group are allowed to pay with terms' }],
    init(injector) {
        entityHydrator= injector.get(EntityHydrator);
    },
    args: {
        customerGroupId: {
            type: 'string',
            ui: { component: 'customer-group-form-input' },
            label: [{ languageCode: LanguageCode.en, value: 'Customer group' }],
        },
    },
    check: async(ctx, order, args) => {
        await entityHydrator.hydrate(ctx, order,{relations: ['customer.groups']})
        const isEligible= !!order.customer?.groups.find((customerGroup)=> `${customerGroup.id}` === args.customerGroupId)??false;
        return isEligible;
    },
});
import { Customer } from "@vendure/core";
import { PaymentTermsDueEvent } from "./payment-terms-event";

export const mockPaymentDueEvent= new PaymentTermsDueEvent({} as any,new Customer({
    id: '3',
    firstName: 'Test',
    lastName: 'Customer',
    emailAddress: 'test@test.com',
    customFields:{
        paymentLimit: 120000,
        paymentTermsInDays: 3
    }
}))
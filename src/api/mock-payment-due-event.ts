import { AdjustmentType, CurrencyCode, Customer, Order, OrderLine, ProductVariant, ShippingLine } from "@vendure/core";
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
}), new Order({
    id: '6',
    currencyCode: CurrencyCode.USD,
    createdAt: '2018-10-31T11:18:29.261Z',
    updatedAt: '2018-10-31T15:24:17.000Z',
    orderPlacedAt: '2018-10-31T13:54:17.000Z',
    code: 'T3EPGJKTVZPBD6Z9',
    state: 'ArrangingPayment',
    active: true,
    customer: new Customer({
        id: '3',
        firstName: 'Test',
        lastName: 'Customer',
        emailAddress: 'test@test.com',
    }),
    lines: [
        new OrderLine({
            id: '5',
            featuredAsset: {
                preview: '/mailbox/placeholder-image',
            },
            productVariant: new ProductVariant({
                id: '2',
                name: 'Curvy Monitor 24 inch',
                sku: 'C24F390',
            }),
            quantity: 1,
            listPrice: 14374,
            listPriceIncludesTax: true,
            adjustments: [
                {
                    adjustmentSource: 'Promotion:1',
                    type: AdjustmentType.PROMOTION,
                    amount: -1000 as any,
                    description: '$10 off computer equipment',
                },
            ],
            taxLines: [],
        }),
        new OrderLine({
            id: '6',
            featuredAsset: {
                preview: '/mailbox/placeholder-image',
            },
            productVariant: new ProductVariant({
                id: '4',
                name: 'Hard Drive 1TB',
                sku: 'IHD455T1',
            }),
            quantity: 1,
            listPrice: 3799,
            listPriceIncludesTax: true,
            adjustments: [],
            taxLines: [],
        }),
    ],
    subTotal: 15144,
    subTotalWithTax: 18173,
    shipping: 1000,
    shippingLines: [
        new ShippingLine({
            listPrice: 1000,
            listPriceIncludesTax: true,
            taxLines: [{ taxRate: 20, description: 'shipping tax' }],
            shippingMethod: {
                code: 'express-flat-rate',
                name: 'Express Shipping',
                description: 'Express Shipping',
                id: '2',
            },
        }),
    ],
    surcharges: [],
    shippingAddress: {
        fullName: 'Test Customer',
        company: '',
        streetLine1: '6000 Pagac Land',
        streetLine2: '',
        city: 'Port Kirsten',
        province: 'Avon',
        postalCode: 'ZU32 9CP',
        country: 'Cabo Verde',
        phoneNumber: '',
    },
    payments: [],
}))
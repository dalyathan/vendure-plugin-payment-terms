import { SimpleGraphQLClient } from "@vendure/testing";
import { ADD_ITEM_TO_ORDER, ADD_PAYMENT_TO_ORDER, CREATE_PAYMENT_METHOD, SET_BILLING_ADDRESS, SET_SHIPPING_ADDRESS, SET_SHIPPING_METHOD, TRANSITION_TO_STATE } from "./queries";
import { paymentTermsEligibilityChecker } from "../src/api/payment-eligibilty-checker";
import { paymentWithTermsHandler } from "../src/api/payment-handler";
import { ID, Order } from "@vendure/core";
import {CreateAddressInput, TransitionOrderToStateResult,ErrorResult  } from '@vendure/common/lib/generated-types';
import {AddPaymentToOrderResult} from '@vendure/common/lib/generated-shop-types';

export async function createPaymentMethodWithTerms(
    adminClient: SimpleGraphQLClient,
    customerGroupId: string,
    paymentMethodCode: string,
    paymentMethodName: string,
  ) {
    const res = await adminClient.query(CREATE_PAYMENT_METHOD, {
      input: {
        code: paymentMethodCode,
        enabled: true,
        checker: {
          code: paymentTermsEligibilityChecker.code,
          arguments: [{ name: "customerGroupId", value: customerGroupId }],
        },
        handler: {
          code: paymentWithTermsHandler.code,
          arguments: [],
        },
        customFields: {},
        translations: [
          {
            languageCode: "en",
            name: paymentMethodName,
            description: "",
            customFields: {},
          },
        ],
      },
    });
    return res.createPaymentMethod;
  }

  export async function addItem(
    shopClient: SimpleGraphQLClient,
    variantId: string,
    quantity: number
  ): Promise<Order| ErrorResult> {
    const { addItemToOrder } = await shopClient.query(ADD_ITEM_TO_ORDER, {
      productVariantId: variantId,
      quantity,
    });
    return addItemToOrder;
  }


export async function proceedToArrangingPayment(
    shopClient: SimpleGraphQLClient,
    shippingMethodId: string | number,
    shippingAddress: CreateAddressInput,
    billingAddress: CreateAddressInput,
    variants: Array<{ id: string; quantity: number }> = [
        { id: 'T_1', quantity: 1 },
        { id: 'T_2', quantity: 2 },
      ],
  ): Promise<TransitionOrderToStateResult> {
    for (const v of variants) {
        const res= await addItem(shopClient, v.id, v.quantity);
        if ((res as ErrorResult)?.errorCode) {
            throw Error((res as ErrorResult).errorCode);
        }
    }
    await setAddressAndShipping(
      shopClient,
      shippingMethodId,
      shippingAddress,
      billingAddress
    );
    const result = await shopClient.query(TRANSITION_TO_STATE, { state: 'ArrangingPayment' });
    return result.transitionOrderToState;
  }

  export async function setAddressAndShipping(
    shopClient: SimpleGraphQLClient,
    shippingMethodId: string | number,
    shippingAddress: CreateAddressInput,
    billingAddress: CreateAddressInput
  ): Promise<void> {
    await shopClient.query(SET_SHIPPING_ADDRESS, {input: shippingAddress});
    await shopClient.query(SET_BILLING_ADDRESS, {input: billingAddress});
    await shopClient.query(SET_SHIPPING_METHOD, {
      ids: [shippingMethodId],
    });
  }

  export async function addPaymentToOrder(
    shopClient: SimpleGraphQLClient,
    code: string
  ): Promise<AddPaymentToOrderResult> {
    const { addPaymentToOrder } = await shopClient.query(ADD_PAYMENT_TO_ORDER, {
      input: {
        method: code,
        metadata:{
            some: 'other'
        }
      },
    });
    return addPaymentToOrder;
  }
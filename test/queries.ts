import {gql} from 'graphql-tag';

export const OrderFields = gql`
    fragment OrderFields on Order {
      id
      code
      state
      active
      total
      shipping
      totalWithTax
      shippingWithTax
      shippingAddress {
        fullName
        company
        streetLine1
        streetLine2
        city
        postalCode
        country
      }
      billingAddress {
        fullName
        company
        streetLine1
        streetLine2
        city
        postalCode
        country
      }
      customer {
        id
        firstName
        lastName
        emailAddress
      }
      lines {
        id
        quantity
        productVariant {
          id
        }
        discounts {
          adjustmentSource
          amount
          amountWithTax
          description
          type
        }
      }
      couponCodes
      payments{
        id
        transactionId
        method
        metadata
        amount
        state
      }
    }
`;

export const UPDATE_CUSTOMER=gql`
    mutation UpdateCustomer($input: UpdateCustomerInput!){
        updateCustomer(input: $input){
            ... on Customer{
                id
                customFields{
                  paymentLimit
                  paymentTermsInDays
                }
                emailAddress
              }
              __typename
        }
    }
`

export const CREATE_PAYMENT_METHOD = gql`
  mutation CreateShippingMethod($input: CreatePaymentMethodInput!) {
    createPaymentMethod(input: $input) {
      ... on PaymentMethod {
        id
        code
      }
      __typename
    }
  }
`;

export const CREATE_CUSTOMER_GROUP=gql`
  mutation CreateCustomerGroup($input: CreateCustomerGroupInput!){
    createCustomerGroup(input:$input){
      ... on CustomerGroup{
        id
        name
        customers{
          items{
            id
          }
        }
      }
    }
  }
`

export const ADD_ITEM_TO_ORDER = gql`
    mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
  addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
    ... on Order {
      ...OrderFields
    }
    ... on ErrorResult {
      errorCode
      message
    }
  }
}
${OrderFields}`

export const TRANSITION_TO_STATE = gql`
    mutation TransitionToState($state: String!) {
  transitionOrderToState(state: $state) {
    ... on Order{
      ...OrderFields 
    }
    ... on OrderStateTransitionError {
      errorCode
      message
      transitionError
    }
  }
}
${OrderFields}`;

    export const SET_SHIPPING_ADDRESS = gql`
    mutation SetShippingAddress($input: CreateAddressInput!) {
  setOrderShippingAddress(input: $input) {
    ... on Order {
      ...OrderFields
    }
  }
}
    ${OrderFields}`;

    export const SET_BILLING_ADDRESS = gql`
    mutation SetBillingAddress($input: CreateAddressInput!) {
  setOrderBillingAddress(input: $input) {
    ... on Order {
      ...OrderFields
    }
  }
}
    ${OrderFields}`;
    export const SET_SHIPPING_METHOD = gql`
    mutation SetShippingMethod($ids: [ID!]!) {
  setOrderShippingMethod(shippingMethodId: $ids) {
    ... on ErrorResult {
      errorCode
      message
    }
  }
}
    `;

export const GET_ELIGIBLE_SHIPPING_METHODS=gql`
    query GetEligiblePaymentMethods{
      eligiblePaymentMethods{
        id
        isEligible
        name
      }
    }
`
export const ADD_PAYMENT_TO_ORDER = gql`
    mutation AddPaymentToOrder($input: PaymentInput!) {
  addPaymentToOrder(input: $input) {
    ... on Order {
      ...OrderFields
    }
    ... on ErrorResult {
      errorCode
      message
    }
  }
}
    ${OrderFields}`;

export const GET_CUSTOMER_DETAILS=gql`
query GetCustomerDetails($id: ID!){
  customer(id: $id){
    id
    customFields{
      paymentLimit
      paymentTermsInDays
    }
  }
}
`

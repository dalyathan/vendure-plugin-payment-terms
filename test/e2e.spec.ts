import {
  CustomCustomerFields,
    DefaultLogger,
    ErrorResult,
    InitialData,
    LogLevel,
    mergeConfig,
  } from '@vendure/core';
  import {
    createTestEnvironment,
    registerInitializer,
    SimpleGraphQLClient,
    SqljsInitializer,
    testConfig,
  } from '@vendure/testing';
  import { TestServer } from '@vendure/testing/lib/test-server';
  import { afterAll, beforeAll, expect, it } from 'vitest';
  import { initialData } from './initial-data';
import { VendurePluginPaymentTerms } from '../src/plugin';
import { CREATE_CUSTOMER_GROUP, GET_CUSTOMER_DETAILS, GET_ELIGIBLE_SHIPPING_METHODS, UPDATE_CUSTOMER } from './queries';
import {CreateAddressInput} from '@vendure/common/lib/generated-types';
import { addPaymentToOrder, createPaymentMethodWithTerms, proceedToArrangingPayment } from './helpers';
import {Order} from '@vendure/common/lib/generated-shop-types';

  
  let server: TestServer;
  let adminClient: SimpleGraphQLClient;
  let shopClient: SimpleGraphQLClient;
  let serverStarted = false;
  const paymentMethodWithTermsCode= 'payment-method-with-terms'
  const paymentTermsCustomFields: CustomCustomerFields={
    paymentLimit: 100000000,
    paymentTermsInDays: 3
  }
  
  beforeAll(async () => {
    registerInitializer('sqljs', new SqljsInitializer('__data__'));
    const config = mergeConfig(testConfig, {
      apiOptions:{
        port: 1234,
      },
      orderOptions:{
        orderLineItemsLimit: 3000,
        orderItemsLimit: 3000
      },
      logger: new DefaultLogger({ level: LogLevel.Debug }),
      plugins: [VendurePluginPaymentTerms],
    });
    ({ server, adminClient, shopClient } = createTestEnvironment(config));
    await server.init({
      initialData: initialData as InitialData,
      productsCsvPath: './test/product-import.csv',
      customerCount: 2
    });
    serverStarted = true;
    //update the customer with email "hayden.zieme12@hotmail.com", so that it's  paymentTermsInDays is 1 and paymentLimit is 100000000
    await adminClient.asSuperAdmin();
    const {updateCustomer}= await adminClient.query(UPDATE_CUSTOMER, {input: {
      id: 'T_1',
      customFields: paymentTermsCustomFields
    }})
    expect(updateCustomer.id).toBe("T_1")
    expect(updateCustomer.emailAddress).toBe("hayden.zieme12@hotmail.com")
    expect(updateCustomer.customFields.paymentLimit).toBe(paymentTermsCustomFields.paymentLimit)
    expect(updateCustomer.customFields.paymentTermsInDays).toBe(paymentTermsCustomFields.paymentTermsInDays)
    //create a customer group having only "hayden.zieme12@hotmail.com" as member (it's id id T_1)
    const paymentTermsCustomerGroup=`payment-method-with-terms-group`
    const {createCustomerGroup}= await adminClient.query(CREATE_CUSTOMER_GROUP,{input: {
      name: paymentTermsCustomerGroup,
      customerIds: ['T_1'],
    }})
    expect(createCustomerGroup.name).toBe(paymentTermsCustomerGroup)
    expect(createCustomerGroup.customers.items.length).toBe(1)
    expect(createCustomerGroup.customers.items[0].id).toBe('T_1')
    //create payment with terms method
    await createPaymentMethodWithTerms(adminClient,'1',paymentMethodWithTermsCode,paymentMethodWithTermsCode)
  }, 60000);
  
  
  it('Should start successfully', async () => {
    expect(serverStarted).toBe(true);
  });

  it('Should allow payment with terms for hayden.zieme12@hotmail.com', async()=>{
    await shopClient.asUserWithCredentials(
      "hayden.zieme12@hotmail.com",
      "test"
    );
    const createAddressInput: CreateAddressInput={
      countryCode: 'AU',
      streetLine1: 'streetLine1'
    }
    await proceedToArrangingPayment(shopClient,'T_1',createAddressInput,createAddressInput)
    const {eligiblePaymentMethods}= await shopClient.query(GET_ELIGIBLE_SHIPPING_METHODS)
    const paymentMethodQuote=eligiblePaymentMethods.find((paymentMethod)=> paymentMethod.name  === paymentMethodWithTermsCode && paymentMethod.isEligible) 
    expect(paymentMethodQuote).toBeDefined()
    expect(paymentMethodQuote.customerPaymentLimit).toBe(paymentTermsCustomFields.paymentLimit)
  })

  it('Should not allow payment with terms for trevor_donnelly96@hotmail.com', async()=>{
    await shopClient.asUserWithCredentials(
      "trevor_donnelly96@hotmail.com",
      "test"
    );
    const createAddressInput: CreateAddressInput={
      countryCode: 'AU',
      streetLine1: 'streetLine1'
    }
   await proceedToArrangingPayment(shopClient,'T_1',createAddressInput,createAddressInput)
    const {eligiblePaymentMethods}= await shopClient.query(GET_ELIGIBLE_SHIPPING_METHODS)
    expect(eligiblePaymentMethods.find((paymentMethod)=> paymentMethod.name  === paymentMethodWithTermsCode && paymentMethod.isEligible)).toBeUndefined()
  })

  it('Should transition order to PaymentSettled for hayden.zieme12@hotmail.com and deduct the total from his paymentLimit', async()=>{
    await shopClient.asUserWithCredentials(
      "hayden.zieme12@hotmail.com",
      "test"
    );
    const result= await addPaymentToOrder(shopClient, paymentMethodWithTermsCode)
    expect((result as Order).state).toBe('PaymentSettled')// to make sure 
    await adminClient.asSuperAdmin()
    const {customer}= await adminClient.query(GET_CUSTOMER_DETAILS, {id: 'T_1'})
    expect(customer.customFields.paymentLimit).toBe((paymentTermsCustomFields.paymentLimit ?? 0) - (result as Order).totalWithTax)
  })

  it("Should decline a payment when a customer's paymentLimit is exceeded", async()=>{
    await shopClient.asUserWithCredentials(
      "hayden.zieme12@hotmail.com",
      "test"
    );
    const createAddressInput: CreateAddressInput={
      countryCode: 'AU',
      streetLine1: 'streetLine1'
    }
    await proceedToArrangingPayment(shopClient,'T_1',createAddressInput,createAddressInput, [
      { id: 'T_1', quantity: 1000 },
      { id: 'T_2', quantity: 2000 },
    ])
    const result= await addPaymentToOrder(shopClient, paymentMethodWithTermsCode)
    expect((result as ErrorResult).message).toBe( 'The payment was declined')
  })
  
  afterAll(async () => {
    await server.destroy();
  }, 100000);
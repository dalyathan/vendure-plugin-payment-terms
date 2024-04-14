import { CustomerEvent, EventBus, LanguageCode, PluginCommonModule, VendurePlugin, Logger, Customer, OrderService, TransactionalConnection, Order } from '@vendure/core';
import { OnApplicationBootstrap } from '@nestjs/common';
import { paymentTermsEligibilityChecker } from './api/payment-eligibilty-checker';
import { paymentWithTermsHandler } from './api/payment-handler';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob, CronTime } from 'cron';
import {filter} from 'rxjs';
import './api/types'
import  dayjs from 'dayjs';
import { PaymentTermsDueEvent } from './api/payment-terms-event';
import { loggerCtx } from './constants';
import { PaymentMethodQuoteFieldResolver } from './api/payment-method-quote-field.resolver';
import { shopApiExtensions } from './api/schema';
import { OverridePaymentMethodResolver } from './api/payment-method-checker-config-arg-fix.resolver';
const CRON_JOB_PREFIX=`VendurePluginPaymentTerms`

@VendurePlugin({
    imports: [PluginCommonModule, ScheduleModule.forRoot()],
    shopApiExtensions: {resolvers: [PaymentMethodQuoteFieldResolver], schema: shopApiExtensions},
    adminApiExtensions: {resolvers: [OverridePaymentMethodResolver]},
    configuration:(config)=>{
        if(config.paymentOptions.paymentMethodEligibilityCheckers?.length){
            config.paymentOptions.paymentMethodEligibilityCheckers.push(paymentTermsEligibilityChecker)
        }else{
            config.paymentOptions.paymentMethodEligibilityCheckers=[paymentTermsEligibilityChecker]
        }
        config.paymentOptions.paymentMethodHandlers.push(paymentWithTermsHandler)
        config.customFields.Customer.push(
        {
            name: 'paymentTermsInDays',
            type: 'float', 
            defaultValue: 0,
            public: false,
            ui:{component: 'number-form-input', suffix: 'days'},
            label:[
                {
                    languageCode: LanguageCode.en, 
                    value: 'Payment Terms'
                }
            ]
        },{
            name: 'paymentLimit', 
            defaultValue: 0,
            type: 'int', 
            public: false,
            ui: {component: 'currency-form-input'}, 
            label:[
                {
                    languageCode: LanguageCode.en, 
                    value: 'Payment Limit'
                }
            ]
        })
        config.customFields.Address.push({
            name: 'vat',
            label: [
                {languageCode: LanguageCode.en, value: 'VAT Number'}
            ],
            type: 'string'
        },
        {
            name: 'purchaseOrder',
            label: [
                {languageCode: LanguageCode.en, value: 'Purchase Order (PO) Number'}
            ],
            type: 'string'
        })
        config.customFields.Order.push({
            name: 'notReminded',
            type: 'boolean',
            public: false,
            readonly: true,
            defaultValue: true,
            label: [
                {languageCode: LanguageCode.en, value: 'Not Reminded'}
            ],
        })
        return config;
    }
})
export class VendurePluginPaymentTerms implements OnApplicationBootstrap{
    constructor(
        private eventBus: EventBus,
        private conn: TransactionalConnection,
        private orderService: OrderService,
        private schedulerRegistry: SchedulerRegistry){

    }

    onApplicationBootstrap() {
        this.eventBus.ofType(CustomerEvent).pipe(filter((e)=> e.type !== 'deleted' && !!e.entity.customFields.paymentTermsInDays && !! e.entity.emailAddress)).subscribe(({entity, ctx})=>{
            const jobName= this.getCronJobNameForCustomer(entity)
            // const testCronTime=`40 * * * * *`
            try{
                const job = this.schedulerRegistry.getCronJob(jobName);
                const lastTimeExecuted= job.lastDate();
                let everyThisDayFromNow=0;
                let dueDate:dayjs.Dayjs;
                if(lastTimeExecuted){
                    dueDate=  dayjs(lastTimeExecuted).add(entity.customFields.paymentTermsInDays??0, 'days');
                    everyThisDayFromNow= dueDate.diff(new Date(), 'days')
                }else{
                    everyThisDayFromNow= (entity.customFields.paymentTermsInDays ?? 0);
                    dueDate=  dayjs(new Date()).add(everyThisDayFromNow, 'days');
                }
                everyThisDayFromNow= Math.round(everyThisDayFromNow)
                const realCronTimeFormat= `0 0 */${everyThisDayFromNow} * *`;
                job.setTime(new CronTime(realCronTimeFormat))
                Logger.info(`The next payment due remainder  for ${entity.emailAddress} is reset to ${dayjs(job.nextDate().toJSDate()).locale('en').format('ddd, MMM D, YYYY h:mm A')}`, loggerCtx)
                
            }catch(e){
                //no existing cron Job, create new one
                const everyThisDayFromNow= Math.round((entity.customFields.paymentTermsInDays ?? 0));
                const realCronTimeFormat= `0 0 */${everyThisDayFromNow} * *`;
                const job = new CronJob(realCronTimeFormat, async () => {
                    Logger.info(`Notifying ${entity.emailAddress} to update his Payment Terms`);
                    //fire the event
                    const orderRepo= this.conn.getRepository(ctx, Order);
                    const notRemindedCustomerOrders= await orderRepo.createQueryBuilder('order')
                    .leftJoinAndSelect('order.customer','customer')
                    .leftJoinAndSelect('order.lines','line')
                    .where('customer.id=:customerId', {customerId: entity.id})
                    .andWhere('order.customFields.notReminded')
                    .getMany()
                    const orderUpdatePromises:Promise<Order>[]=[]
                    for(let order of notRemindedCustomerOrders){
                        this.eventBus.publish(new PaymentTermsDueEvent(ctx, entity, order ))
                        orderUpdatePromises.push(this.orderService.updateCustomFields(ctx, order.id, {...order.customFields, notReminded: false}))
                    }
                    await Promise.all(orderUpdatePromises);
                    
                });
                this.schedulerRegistry.addCronJob(jobName, job);
                job.start();
                Logger.info(`The next payment due remainder for ${entity.emailAddress} is set to ${dayjs(job.nextDate().toJSDate()).locale('en').format('ddd, MMM D, YYYY h:mm A')}`, loggerCtx)
            }
        })
        this.eventBus.ofType(CustomerEvent).pipe(filter((e)=> e.type === 'deleted')).subscribe(({entity})=>{
            try{
                const name= this.getCronJobNameForCustomer(entity);
                const job = this.schedulerRegistry.getCronJob(name);
                job.stop()
                this.schedulerRegistry.deleteCronJob(name);
                Logger.info(`Stopped the payment due remainder for ${entity.emailAddress}`, loggerCtx)
            }catch(e){
                //no cron Job for customer, ignore
            }
        })
   }

   getCronJobNameForCustomer(customer: Customer){
    return `${CRON_JOB_PREFIX}-${customer.emailAddress}`;
   }
}
import { EmailEventListener } from "@vendure/email-plugin";
import { PaymentTermsDueEvent } from "./payment-terms-event";
import { mockPaymentDueEvent } from "./mock-payment-due-event";

export const paymentDueEventHandler = new EmailEventListener('payment-due')
  .on(PaymentTermsDueEvent)
  .setRecipient((event: PaymentTermsDueEvent) => event.customer.emailAddress)
  .setFrom("{{ fromAddress }}")
  .setSubject(`Payment is due for order(s)`)
  .setTemplateVars((event: PaymentTermsDueEvent) => ({ customer: event.customer, order: event.order }))
  .setMockEvent(mockPaymentDueEvent);
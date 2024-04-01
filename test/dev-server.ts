/* eslint-disable */
import { DefaultLogger, LogLevel, mergeConfig, DefaultSearchPlugin, JobQueueService } from '@vendure/core';
import {
  createTestEnvironment,
  populateCustomers,
  registerInitializer,
  SqljsInitializer,
  testConfig,
} from '@vendure/testing';
import { TestServer } from '@vendure/testing/lib/test-server';
import { compileUiExtensions } from '@vendure/ui-devkit/compiler';
import { initialData } from './initial-data';
import * as path from 'path';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import {VendurePluginPaymentTerms} from '../src/plugin'
import { defaultEmailHandlers, EmailPlugin } from '@vendure/email-plugin';
import {paymentDueEventHandler} from '../src/api/email-event-handlers'

(async () => {
  let server: TestServer;

  registerInitializer('sqljs', new SqljsInitializer('__data__')); 
  const config = mergeConfig(testConfig, {
    logger: new DefaultLogger({ level: LogLevel.Debug }),
    plugins:[
        DefaultSearchPlugin,
        VendurePluginPaymentTerms,
        EmailPlugin.init({
          handlers: [...defaultEmailHandlers, paymentDueEventHandler],
          templatePath: path.join(__dirname, 'static/email/templates'),
          devMode: true,
          outputPath: path.join(__dirname, "../static/email/test-emails"),
          route: "mailbox",
        }),
        AdminUiPlugin.init({
            port: 3002,
            route: 'admin',
            app:  compileUiExtensions({
                outputPath: path.join(__dirname, 'admin-ui'),
                extensions: [],
                devMode: true,
            })
        }),
    ],
    apiOptions: {
      adminApiPlayground: true,
      shopApiPlayground: true,
    },
  });
  ({ server } = createTestEnvironment(config));
  await server.init({
    initialData,
    productsCsvPath: 'test/product-import.csv',
    customerCount: 1,
  });
  const jobQueueService= server.app.get(JobQueueService);
  await jobQueueService.start()
  await populateCustomers(server.app, 20, console.log)
})().catch((err) => {
  console.error(err);
});
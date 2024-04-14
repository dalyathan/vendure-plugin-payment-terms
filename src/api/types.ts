// types.ts

// Note: we are using deep a import here, rather than importing from `@vendure/core` due to
// a possible bug in TypeScript (https://github.com/microsoft/TypeScript/issues/46617) which
// causes issues when multiple plugins extend the same custom fields interface.
import { CustomCustomerFields, CustomOrderFields } from '@vendure/core/dist/entity/custom-entity-fields';

declare module '@vendure/core/dist/entity/custom-entity-fields' {
    interface CustomCustomerFields {
        paymentTermsInDays?: number;
        paymentLimit?: number;
    }

    interface CustomOrderFields{
        notReminded: boolean
    }
}
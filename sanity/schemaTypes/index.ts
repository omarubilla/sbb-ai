import { type SchemaTypeDefinition } from 'sanity'

import { categoryType, subcategoryType } from './categoryType'
import { customerType } from './customerType'
import { orderType } from './orderType'
import { productType } from './productType'
import { paymentLinkType } from './paymentLinkType'

export const schemaTypes: SchemaTypeDefinition[] = [
  categoryType,
  subcategoryType,
  customerType,
  productType,
  orderType,
  paymentLinkType,
]

export const schema: { types: SchemaTypeDefinition[] } = {
  types: schemaTypes,
}

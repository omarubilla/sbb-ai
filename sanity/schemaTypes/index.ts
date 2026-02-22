import { type SchemaTypeDefinition } from 'sanity'

import { categoryType, subcategoryType } from './categoryType'
import { customerType } from './customerType'
import { orderType } from './orderType'
import { productType } from './productType'

export const schemaTypes: SchemaTypeDefinition[] = [
  categoryType,
  subcategoryType,
  customerType,
  productType,
  orderType,
]

export const schema: { types: SchemaTypeDefinition[] } = {
  types: schemaTypes,
}

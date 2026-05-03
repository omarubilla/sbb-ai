import type {StructureResolver} from 'sanity/structure'

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Orders')
        .schemaType('order')
        .child(S.documentTypeList('order').title('Orders')),
      ...S.documentTypeListItems().filter((item) => item.getId() !== 'order'),
    ])

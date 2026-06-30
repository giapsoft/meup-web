import type { CatalogProductDto } from '../api/product'

/** User already has access — owner, purchased, or shared. No buy button needed. */
export function userCanUseCatalogProduct(product: CatalogProductDto): boolean {
  return product.isOwner || product.isPurchased || product.isShared
}

import { getAccount } from '../api/emailAuth'
import {
  listOwnedProducts,
  listPurchasedProducts,
  listSharedProducts,
} from '../api/product'

export type PostLoginLandingPath = '/products' | '/explore'

/**
 * Chọn landing sau đăng nhập / quét QR:
 * - Có owned / purchased / shared (theo cặp ngôn ngữ hiện tại) → Quản lý (`/products`)
 * - Chưa có → Khám phá (`/explore`)
 */
export async function resolvePostLoginLandingPath(
  nativeLang: string,
  studyLang: string,
): Promise<PostLoginLandingPath> {
  try {
    const account = await getAccount()
    const [ownedRes, purchasedRes, sharedRes] = await Promise.all([
      listOwnedProducts(account.userId, { nativeLang, studyLang }),
      listPurchasedProducts(account.userId, { nativeLang, studyLang }),
      listSharedProducts({ nativeLang, studyLang }),
    ])

    if (
      ownedRes.products.length > 0 ||
      purchasedRes.products.length > 0 ||
      sharedRes.products.length > 0
    ) {
      return '/products'
    }
  } catch {
    // Lỗi tải → đưa user vào Khám phá (an toàn hơn trang quản lý trống).
  }
  return '/explore'
}

import { getAccount } from '../api/emailAuth'
import {
  getDevicePrograms,
  listOwnedProducts,
  listPurchasedProducts,
} from '../api/product'
import type { DeviceProgramsDto } from '../utils/deviceProgramsCompact'

export type PostLoginLandingPath = '/products' | '/explore'

function deviceProgramsHasVocabulary(programs: DeviceProgramsDto): boolean {
  return programs.pairs.some(
    (pair) =>
      pair.myProducts.length > 0 ||
      pair.sharedWithMe.length > 0 ||
      pair.buyed.length > 0,
  )
}

/**
 * Chọn landing sau đăng nhập / quét QR:
 * - Có owned / purchased / shared (bất kỳ cặp ngôn ngữ trên device-programs, hoặc owned/purchased theo cặp hiện tại)
 *   → Quản lý (`/products`)
 * - Chưa có → Khám phá (`/explore`)
 */
export async function resolvePostLoginLandingPath(
  nativeLang: string,
  studyLang: string,
): Promise<PostLoginLandingPath> {
  try {
    const account = await getAccount()
    const [ownedRes, purchasedRes, programs] = await Promise.all([
      listOwnedProducts(account.userId, { nativeLang, studyLang }),
      listPurchasedProducts(account.userId, { nativeLang, studyLang }),
      getDevicePrograms(),
    ])

    if (
      ownedRes.products.length > 0 ||
      purchasedRes.products.length > 0 ||
      deviceProgramsHasVocabulary(programs)
    ) {
      return '/products'
    }
  } catch {
    // Lỗi tải → đưa user vào Khám phá (an toàn hơn trang quản lý trống).
  }
  return '/explore'
}

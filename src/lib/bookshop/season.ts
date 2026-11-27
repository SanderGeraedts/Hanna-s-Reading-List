/**
 * What the bookshop is dressed for on a day (T-0123, D-0091): Sinterklaas from mid-November to
 * 5 December, Christmas all December, autumn and Halloween in October, and her birthday when
 * this device knows it (D-0039: the birthday is kept on the device only). More than one can be
 * true at once (Sinterklaas and Christmas share the first days of December). Worked out from the
 * date alone: nothing is saved, nothing is fetched.
 */

export type ShopDecoration = 'sinterklaas' | 'christmas' | 'autumn' | 'birthday'

/** `day` is yyyy-mm-dd; `birthday` is MM-DD (as `useBirthday` keeps it), or nothing. */
export function shopDecorations(day: string, birthday?: string | null): ShopDecoration[] {
  const md = day.slice(5, 10)
  const out: ShopDecoration[] = []
  if (birthday && /^\d{2}-\d{2}$/.test(birthday) && md === birthday) out.push('birthday')
  if (md >= '11-15' && md <= '12-05') out.push('sinterklaas')
  if (md >= '12-01' && md <= '12-31') out.push('christmas')
  if (md >= '10-01' && md <= '10-31') out.push('autumn')
  return out
}

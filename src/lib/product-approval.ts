export type ProductApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export const PRODUCT_SEND_BACK_REASON_PROMPT =
  'მიუთითეთ რა ცვლილებებია საჭირო (ავტორი ეს კომენტარი ნახავს):'

export const PRODUCT_REJECT_REASON_PROMPT =
  'გთხოვთ მიუთითოთ უარყოფის მიზეზი:'

export function getSellerApprovalLabel(
  status?: ProductApprovalStatus | null,
): string {
  if (status === 'APPROVED') return 'დამტკიცებულია'
  if (status === 'REJECTED') return 'ცვლილება საჭიროა'
  return 'ველოდებით დამტკიცებას'
}

export function getAdminApprovalLabel(
  status?: ProductApprovalStatus | null,
): string {
  const map: Record<ProductApprovalStatus, string> = {
    PENDING: 'ველოდებით დამტკიცებას',
    APPROVED: 'დამტკიცებულია',
    REJECTED: 'დასარედაქტირებლად დაბრუნდა',
  }
  return map[status ?? 'PENDING']
}

/** Georgian + Latin letters, spaces, common punctuation, digits */
export const PRODUCT_TEXT_REGEX = /^[\u10A0-\u10FFa-zA-Z\s.,:;!?\-()""''0-9]+$/

export const PRODUCT_NAME_ERROR_MESSAGE =
  'სახელი უნდა შეიცავდეს ქართულ ან ინგლისურ ასოებს, პუნქტუაციას და ციფრებს'

export const PRODUCT_DESCRIPTION_ERROR_MESSAGE =
  'აღწერა უნდა შეიცავდეს ქართულ ან ინგლისურ ასოებს, პუნქტუაციას და ციფრებს'

export function isValidProductText(value: string): boolean {
  return PRODUCT_TEXT_REGEX.test(value)
}

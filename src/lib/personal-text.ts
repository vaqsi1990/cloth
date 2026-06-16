/** Georgian + Latin letters and spaces (names, location) */
export const PERSON_NAME_REGEX = /^[\u10A0-\u10FFa-zA-Z\s'-]+$/

/** Georgian + Latin letters, digits, address punctuation */
export const PERSON_ADDRESS_REGEX = /^[\u10A0-\u10FFa-zA-Z\s0-9№N,.\-:;()\[\]{}/'"!?#\\]+$/

export const PERSON_NAME_FIELD_ERROR =
  'უნდა შეიცავდეს ქართულ ან ინგლისურ ასოებს'

export const PERSON_ADDRESS_FIELD_ERROR =
  'უნდა შეიცავდეს ქართულ ან ინგლისურ ასოებს, ციფრებს, №, N და სასვენი ნიშნებს'

export const PERSON_ADDRESS_DIGIT_ERROR = 'მისამართი უნდა შეიცავდეს ციფრებს'

export function isValidPersonName(value: string): boolean {
  return PERSON_NAME_REGEX.test(value)
}

export function isValidPersonAddress(value: string): boolean {
  return PERSON_ADDRESS_REGEX.test(value)
}

export function getPersonFieldLabel(field: 'name' | 'lastName' | 'location'): string {
  if (field === 'name') return 'სახელი'
  if (field === 'lastName') return 'გვარი'
  return 'ადგილმდებარეობა'
}

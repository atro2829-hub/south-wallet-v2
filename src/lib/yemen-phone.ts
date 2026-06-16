// Yemeni phone number validation utilities

export interface PhoneProvider {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  prefixes: string[];
}

// Yemeni telecom providers with their prefixes
export const yemenProviders: PhoneProvider[] = [
  {
    id: 'yemen-mobile',
    name: 'يمن موبايل',
    nameEn: 'Yemen Mobile',
    color: '#C41E3A',
    prefixes: ['770', '771', '772', '773', '777', '778'],
  },
  {
    id: 'yo',
    name: 'يو',
    nameEn: 'YO',
    color: '#FF6B00',
    prefixes: ['774', '775', '776'],
  },
  {
    id: 'sabafon',
    name: 'سبأفون',
    nameEn: 'Sabafon',
    color: '#2563EB',
    prefixes: ['770', '771'], // Some 770/771 are Sabafon
  },
  {
    id: 'y',
    name: 'واي',
    nameEn: 'Y',
    color: '#059669',
    prefixes: ['779'],
  },
];

/**
 * Validates a Yemeni phone number in +967XXXXXXXXX format
 * Accepts formats:
 * - +9677XXXXXXXX (13 digits with +967)
 * - 9677XXXXXXXX (12 digits with 967)
 * - 7XXXXXXXX (9 digits, local format)
 */
export function isValidYemeniPhone(phone: string): boolean {
  if (!phone) return false;
  
  // Clean the phone number
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check various formats
  let localNumber = '';
  
  if (cleaned.startsWith('+967')) {
    localNumber = cleaned.slice(4);
  } else if (cleaned.startsWith('967')) {
    localNumber = cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    localNumber = cleaned.slice(1);
  } else {
    localNumber = cleaned;
  }
  
  // Must be exactly 9 digits starting with 7
  if (!/^7\d{8}$/.test(localNumber)) return false;
  
  // Must start with valid prefix (77X)
  const prefix = localNumber.slice(0, 3);
  if (!prefix.startsWith('77')) return false;
  
  return true;
}

/**
 * Formats a Yemeni phone number to +967 XXX XXX XXX format
 */
export function formatYemeniPhone(phone: string): string {
  if (!phone) return '';
  
  const cleaned = cleanYemeniPhone(phone);
  if (!cleaned) return phone;
  
  // Extract the 9-digit local number
  let localNumber = '';
  if (cleaned.startsWith('+967')) {
    localNumber = cleaned.slice(4);
  } else if (cleaned.startsWith('967')) {
    localNumber = cleaned.slice(3);
  } else {
    localNumber = cleaned;
  }
  
  if (localNumber.length !== 9) return phone;
  
  // Format as +967 XXX XXX XXX
  return `+967 ${localNumber.slice(0, 3)} ${localNumber.slice(3, 6)} ${localNumber.slice(6, 9)}`;
}

/**
 * Detects the telecom provider from a Yemeni phone number
 * Returns provider ID or empty string if unknown
 */
export function getProviderFromPhone(phone: string): string {
  if (!phone) return '';
  
  const cleaned = cleanYemeniPhone(phone);
  if (!cleaned) return '';
  
  let localNumber = '';
  if (cleaned.startsWith('+967')) {
    localNumber = cleaned.slice(4);
  } else if (cleaned.startsWith('967')) {
    localNumber = cleaned.slice(3);
  } else {
    localNumber = cleaned;
  }
  
  if (localNumber.length < 3) return '';
  
  const prefix = localNumber.slice(0, 3);
  
  // Check providers in order of specificity
  // واي (Y) - 779 only
  if (prefix === '779') return 'y';
  
  // يو (YO) - 774, 775, 776
  if (['774', '775', '776'].includes(prefix)) return 'yo';
  
  // يمن موبايل (Yemen Mobile) - 770, 771, 772, 773, 777, 778
  // Note: 770/771 can also be سبأفون but Yemen Mobile is more common
  if (['770', '771', '772', '773', '777', '778'].includes(prefix)) return 'yemen-mobile';
  
  return '';
}

/**
 * Gets the provider object from a phone number
 */
export function getProviderInfoFromPhone(phone: string): PhoneProvider | null {
  const providerId = getProviderFromPhone(phone);
  return yemenProviders.find(p => p.id === providerId) || null;
}

/**
 * Removes all formatting from a Yemeni phone number
 * Returns the number in +967XXXXXXXXX format or empty string if invalid
 */
export function cleanYemeniPhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except leading +
  const stripped = phone.replace(/[^\d+]/g, '');
  
  let localNumber = '';
  
  if (stripped.startsWith('+967')) {
    localNumber = stripped.slice(4);
  } else if (stripped.startsWith('967')) {
    localNumber = stripped.slice(3);
  } else if (stripped.startsWith('0')) {
    localNumber = stripped.slice(1);
  } else {
    localNumber = stripped;
  }
  
  // Validate the local number
  if (!/^7\d{0,8}$/.test(localNumber)) {
    // Return what we have if it's partially valid
    if (localNumber.startsWith('7') && localNumber.length <= 9) {
      return `+967${localNumber}`;
    }
    return '';
  }
  
  return `+967${localNumber}`;
}

/**
 * Extracts the 9-digit local number from any format
 */
export function getLocalNumber(phone: string): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.startsWith('+967')) {
    return cleaned.slice(4);
  } else if (cleaned.startsWith('967')) {
    return cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    return cleaned.slice(1);
  }
  
  return cleaned;
}

/**
 * Validates a partial Yemeni phone number (during input)
 */
export function isValidPartialYemeniPhone(partial: string): boolean {
  if (!partial) return true; // Empty is valid (user hasn't typed yet)
  
  const digits = partial.replace(/\D/g, '');
  
  // Must start with 7
  if (digits.length > 0 && !digits.startsWith('7')) return false;
  
  // Must not exceed 9 digits
  if (digits.length > 9) return false;
  
  return true;
}

/**
 * Gets validation message in Arabic for a phone number
 */
export function getPhoneValidationMessage(phone: string): string {
  if (!phone) return '';
  
  const local = getLocalNumber(phone);
  
  if (local.length === 0) return '';
  if (!local.startsWith('7')) return 'يجب أن يبدأ الرقم بـ 7';
  if (local.length < 3) return '';
  
  const prefix = local.slice(0, 3);
  if (!prefix.startsWith('77')) return 'بادئة غير صالحة';
  
  if (local.length < 9) return `أدخل ${9 - local.length} أرقام أخرى`;
  if (local.length > 9) return 'الرقم طويل جداً';
  
  // Full validation
  if (isValidYemeniPhone(phone)) {
    const provider = getProviderInfoFromPhone(phone);
    if (provider) {
      return `رقم ${provider.name} صحيح ✓`;
    }
    return 'رقم صحيح ✓';
  }
  
  return 'رقم غير صالح';
}

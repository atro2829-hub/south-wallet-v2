'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  getLocalNumber,
  getProviderFromPhone,
  getProviderInfoFromPhone,
  isValidYemeniPhone,
  getPhoneValidationMessage,
  yemenProviders,
} from '@/lib/yemen-phone';

interface YemeniPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  label?: string;
  showProvider?: boolean;
  showValidation?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function YemeniPhoneInput({
  value,
  onChange,
  placeholder = '7XX XXX XXX',
  error: externalError,
  label = 'رقم الهاتف',
  showProvider = true,
  showValidation = true,
  disabled = false,
  className = '',
}: YemeniPhoneInputProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const inputRef = useRef<HTMLInputElement>(null);

  // Get local 9-digit number from value
  const localNumber = getLocalNumber(value);
  const provider = showProvider ? getProviderInfoFromPhone(value) : null;
  const isValid = localNumber.length === 9 && isValidYemeniPhone(value);
  const validationMsg = showValidation ? getPhoneValidationMessage(value) : '';
  const hasError = externalError || (localNumber.length === 9 && !isValid);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 9);
    // Ensure starts with 7
    if (raw.length > 0 && !raw.startsWith('7')) return;
    // Emit full number with +967 prefix
    onChange(raw ? `+967${raw}` : '');
  }, [onChange]);

  // Format display: "7XX XXX XXX"
  const displayValue = localNumber;

  return (
    <div className={className}>
      {label && (
        <label className="text-xs font-medium block mb-1.5" style={{ color: isDark ? '#AAA' : '#666' }}>
          {label}
        </label>
      )}
      <div
        className="flex items-center gap-2 px-4 py-3.5 rounded-2xl transition-all"
        style={{
          background: isDark ? '#1A1A1A' : '#F8F8F8',
          border: hasError
            ? '1px solid #5C1A1B'
            : isValid
            ? '1px solid #10B981'
            : isDark
            ? '1px solid #333'
            : '1px solid #EEE',
        }}
      >
        {/* Yemen flag indicator */}
        <div className="flex flex-col w-6 h-4 rounded-sm overflow-hidden shrink-0">
          <div className="flex-1 bg-red-600" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-black" />
        </div>

        {/* +967 prefix (non-editable) */}
        <span
          className="text-sm font-medium shrink-0"
          style={{ color: isDark ? '#AAA' : '#888' }}
          dir="ltr"
        >
          +967
        </span>
        <div className="w-px h-5 shrink-0" style={{ background: isDark ? '#444' : '#DDD' }} />

        {/* Phone input */}
        <input
          ref={inputRef}
          type="tel"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
          dir="ltr"
          maxLength={9}
        />

        {/* Provider icon */}
        {showProvider && provider && localNumber.length >= 3 && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${provider.color}15` }}
          >
            <span className="text-[8px] font-bold" style={{ color: provider.color }}>
              {provider.nameEn.charAt(0)}
            </span>
          </div>
        )}

        {/* Validation icon */}
        {localNumber.length === 9 && (
          isValid ? (
            <CheckCircle2 size={16} color="#10B981" className="shrink-0" />
          ) : (
            <AlertCircle size={16} color="#5C1A1B" className="shrink-0" />
          )
        )}
      </div>

      {/* Validation message */}
      {showValidation && validationMsg && localNumber.length > 0 && (
        <div className="flex items-center gap-1.5 mt-1.5 px-1">
          {isValid ? (
            <CheckCircle2 size={10} color="#10B981" />
          ) : hasError ? (
            <AlertCircle size={10} color="#5C1A1B" />
          ) : null}
          <span
            className="text-[10px]"
            style={{ color: isValid ? '#10B981' : hasError ? '#5C1A1B' : isDark ? '#888' : '#AAA' }}
          >
            {validationMsg}
          </span>
        </div>
      )}

      {/* External error */}
      {externalError && (
        <p className="text-[10px] mt-1 px-1" style={{ color: '#5C1A1B' }}>{externalError}</p>
      )}
    </div>
  );
}

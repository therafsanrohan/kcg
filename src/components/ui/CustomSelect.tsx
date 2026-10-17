'use client'

import React from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface CustomSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options?: SelectOption[]
  className?: string
  wrapperClassName?: string
  error?: string
  helperText?: string
}

export default function CustomSelect({
  label,
  options,
  children,
  className = '',
  wrapperClassName = '',
  error,
  helperText,
  disabled,
  id,
  ...props
}: CustomSelectProps) {
  const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={`w-full ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={generatedId}
          className="block text-[11px] font-bold tracking-wider uppercase text-gray-700 mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="relative w-full">
        <select
          id={generatedId}
          disabled={disabled}
          className={`w-full appearance-none rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 transition-all outline-none cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${
            error
              ? 'border-rose-400 focus:border-rose-600 focus:ring-1 focus:ring-rose-600'
              : 'border-gray-300 focus:border-black focus:ring-1 focus:ring-black'
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        {/* Minimalist, perfectly aligned chevron-down icon */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
          <ChevronDown className="h-4 w-4 stroke-[2]" />
        </div>
      </div>

      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-[11px] text-gray-400">{helperText}</p>
      ) : null}
    </div>
  )
}

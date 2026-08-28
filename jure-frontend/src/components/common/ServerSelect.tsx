/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import * as React from 'react'
import { useEffect, useState, useMemo, useRef } from 'react'
import axiosInstance from '@/utils/axiosInstance'
import { devError } from '@/utils/devLog'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CheckIcon, ChevronDownIcon, Loader2, RefreshCw, X } from 'lucide-react'
import { useInFilterPanel } from '@/components/common/filterPanelContext'
import { useAppTranslation } from '@/i18n'

interface ServerSelectOption {
  [key: string]: any
}

interface ServerSelectProps {
  link: string
  value?: any
  onChange?: (value: any) => void
  placeholder?: string
  labelKey?: string | ((option: ServerSelectOption) => React.ReactNode)
  valueKey?: string | ((option: ServerSelectOption) => string)
  id?: string
  nullOption?: ServerSelectOption
  extraOptions?: ServerSelectOption[]
  className?: string
  disabled?: boolean
  searchPlaceholder?: string
  cleanable?: boolean
}

export default function ServerSelect({
  link,
  value,
  onChange,
  placeholder,
  labelKey = "name",
  valueKey = "id",
  id,
  nullOption,
  extraOptions,
  className,
  disabled = false,
  searchPlaceholder,
  cleanable = false
}: ServerSelectProps) {
  const { t, dir } = useAppTranslation()
  const resolvedPlaceholder = placeholder || t.common.selectOption
  const resolvedSearchPlaceholder = searchPlaceholder || t.common.search

  const [options, setOptions] = useState<ServerSelectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inlineMenu = useInFilterPanel()

  useEffect(() => {
    if (!open || !inlineMenu) return
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, inlineMenu])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axiosInstance.get(link)
      const data = Array.isArray(response.data) ? response.data : response.data.results
      setOptions(data)
    } catch (err) {
      setError(t.common.selectError)
      devError('Error fetching options:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [link])

  const allOptions = useMemo(() => {
    const extras = extraOptions ?? []
    const seen = new Set(
      options.map((option) =>
        String(typeof valueKey === 'function' ? valueKey(option) : option[valueKey])
      )
    )
    const mergedExtras = extras.filter((option) => {
      const key = String(typeof valueKey === 'function' ? valueKey(option) : option[valueKey])
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    return [...mergedExtras, ...options, ...(nullOption ? [nullOption] : [])]
  }, [extraOptions, nullOption, options, valueKey])

  const getSelectedLabel = useMemo((): string => {
    if (!value) return resolvedPlaceholder

    const selectedOption = allOptions.find(option => {
      const optionValue = typeof valueKey === 'function'
        ? valueKey(option)
        : option[valueKey]
      return String(optionValue) === String(value)
    })

    if (!selectedOption) return resolvedPlaceholder

    const selectedLabel = typeof labelKey === 'function'
      ? labelKey(selectedOption)
      : selectedOption[labelKey] || ''

    return selectedLabel
  }, [value, resolvedPlaceholder, allOptions, valueKey, labelKey])

  if (loading) {
    return (
      <Button
        variant="outline"
        role="combobox"
        disabled
        type='button'
        className={cn("w-full justify-between", className)}
        {...(id && { id })}
      >
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          <span>{t.common.loading}</span>
        </div>
      </Button>
    )
  }

  if(error)
  return (
    <div className='flex gap-1 items-center'>
      <Button {...(id && { id })} type='button' onClick={fetchData} variant='ghost' className='w-10'>
        <RefreshCw className="size-4" />
      </Button>
      <div className=' line-clamp-1 text-red-500'>
        {error}
      </div>
    </div>
  )

  const optionList = (
    <Command className="h-auto">
        <CommandInput placeholder={resolvedSearchPlaceholder} />
      <CommandList className={inlineMenu ? 'max-h-44' : undefined}>
        <CommandEmpty>{t.common.noResults}</CommandEmpty>
        <CommandGroup>
          {allOptions.map((option) => {
            const optionValue = typeof valueKey === 'function'
              ? valueKey(option)
              : option[valueKey]
            const optionLabel = typeof labelKey === 'function'
              ? labelKey(option)
              : option[labelKey] || ''
            const isSelected = String(value) === String(optionValue)

            return (
              <CommandItem
                key={optionValue}
                value={optionLabel}
                onSelect={() => {
                  onChange?.(optionValue)
                  setOpen(false)
                }}
                disabled={option.disabled}
              >
                <CheckIcon
                  className={cn(
                    "me-2 size-4",
                    isSelected ? "opacity-100" : "opacity-0"
                  )}
                />
                {optionLabel}
              </CommandItem>
            )
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  )

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={cn("w-full justify-between", className)}
      disabled={disabled || loading}
      dir={dir}
      {...(id && { id })}
      onClick={inlineMenu ? () => setOpen((v) => !v) : undefined}
    >
      <span className={cn("min-w-0 flex-1 truncate", dir === "rtl" ? "text-right" : "text-start")}>{getSelectedLabel}</span>
      <div className="flex items-center gap-1">
        {cleanable && value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation()
              onChange?.(undefined)
              setOpen(false)
            }}
          >
            <X className="size-3" />
          </Button>
        )}
        <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
      </div>
    </Button>
  )

  if (inlineMenu) {
    return (
      <div ref={wrapRef} className="relative w-full">
        {triggerButton}
        {open ? (
          <div className="absolute start-0 top-[calc(100%+4px)] z-[90] w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-950">
            {optionList}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <Popover modal={false} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        avoidCollisions={false}
        className="z-[80] w-[var(--radix-popover-trigger-width)] p-0"
      >
        {optionList}
      </PopoverContent>
    </Popover>
  )
}

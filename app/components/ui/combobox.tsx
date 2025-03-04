import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "~/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"

export interface ComboboxProps {
  options: { label: string; value: string }[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  emptyText?: string
  createNewLabel?: string
  name?: string
  className?: string
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  emptyText = "No results found.",
  createNewLabel = "Create new",
  name,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const handleSelect = React.useCallback(
    (currentValue: string) => {
      if (currentValue === "create-new") {
        onChange?.("")
        setSearchValue("")
      } else {
        onChange?.(currentValue)
      }
      setOpen(false)
    },
    [onChange]
  )

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value
              ? options.find((option) => option.value === value)?.label
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <Command>
            <CommandInput
              placeholder={placeholder}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandEmpty>
              {emptyText}
              <Button 
                className="mt-2 w-full" 
                size="sm" 
                variant="outline"
                onClick={() => handleSelect("create-new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                {createNewLabel}
              </Button>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      {name && <input type="hidden" name={name} value={value || ""} />}
    </div>
  )
} 
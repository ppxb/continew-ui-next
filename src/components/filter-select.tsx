import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FilterSelectOption {
  readonly value: string
  readonly label: string
}

interface FilterSelectProps {
  readonly label: string
  readonly options: readonly FilterSelectOption[]
  readonly value: string
  readonly onValueChange: (value: string | null) => void
  readonly className?: string
}

export function FilterSelect({ label, options, value, onValueChange, className }: FilterSelectProps) {
  return (
    <div className={className}>
      <Select items={options} value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <span className="shrink-0 text-muted-foreground">{label}</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="w-auto max-w-md min-w-(--anchor-width)" align="start" alignItemWithTrigger={false}>
          <SelectGroup>
            {options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

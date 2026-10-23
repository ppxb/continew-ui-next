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

/** A labelled select used in list filter rows. */
export function FilterSelect({ label, options, value, onValueChange, className }: FilterSelectProps) {
  return (
    <div className={className}>
      <Select items={options} value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <span className="text-muted-foreground">{label}</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" alignItemWithTrigger={false}>
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

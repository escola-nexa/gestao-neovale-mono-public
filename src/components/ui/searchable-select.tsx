import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Texto extra usado apenas para a busca (ex: códigos, sinônimos) */
  keywords?: string;
};

export interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  allowClear?: boolean;
  /** Largura mínima do popover (default: largura do trigger) */
  contentWidth?: "trigger" | "auto";
  id?: string;
  name?: string;
  "aria-label"?: string;
}

/**
 * Select com busca interna estilo combobox.
 * Aparência idêntica ao SelectTrigger padrão (h-10, borda, ring) para drop-in replacement.
 * Filtragem feita pelo cmdk (Command) — começa enquanto o usuário digita.
 */
export const SearchableSelect = React.forwardRef<HTMLButtonElement, SearchableSelectProps>(
  (
    {
      value,
      onValueChange,
      options,
      placeholder = "Selecione...",
      searchPlaceholder = "Buscar...",
      emptyMessage = "Nada encontrado.",
      disabled,
      className,
      triggerClassName,
      contentClassName,
      allowClear = false,
      contentWidth = "trigger",
      id,
      name,
      "aria-label": ariaLabel,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const selected = React.useMemo(
      () => options.find((o) => o.value === value),
      [options, value],
    );

    return (
      <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            id={id}
            name={name}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            disabled={disabled}
            className={cn(
              "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              className,
              triggerClassName,
            )}
          >
            <span
              className={cn(
                "text-left whitespace-normal break-words flex-1",
                !selected && "text-muted-foreground",
              )}
            >
              {selected ? selected.label : placeholder}
            </span>
            <div className="ml-2 flex items-center gap-1 shrink-0">
              {allowClear && selected && !disabled && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onValueChange("");
                  }}
                />
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "p-0",
            contentWidth === "trigger" && "w-[var(--radix-popover-trigger-width)]",
            contentClassName,
          )}
          align="start"
        >
          <Command
            filter={(itemValue, search, keywords) => {
              const haystack = `${itemValue} ${(keywords ?? []).join(" ")}`.toLowerCase();
              return haystack.includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.keywords ?? ""} ${option.value}`}
                      keywords={[option.label, option.keywords ?? "", option.value]}
                      disabled={option.disabled}
                      onSelect={() => {
                        onValueChange(option.value);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="whitespace-normal break-words">{option.label}</span>
                        {option.description && (
                          <span className="text-xs text-muted-foreground whitespace-normal break-words">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);

SearchableSelect.displayName = "SearchableSelect";

"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import PhoneInputPrimitive, {
  getCountryCallingCode,
  type Country,
  type FlagProps,
  type Value,
} from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DEFAULT_COUNTRY: Country = "PK";

type PhoneInputProps = {
  value: Value;
  onChange: (value: Value) => void;
  onBlur?: () => void;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  className?: string;
};

type CountryOption = {
  value?: Country;
  label: string;
  divider?: boolean;
};

type CountrySelectProps = {
  value?: Country;
  onChange: (country?: Country) => void;
  options: CountryOption[];
  disabled?: boolean;
  readOnly?: boolean;
};

function FlagComponent({ country, countryName }: FlagProps) {
  const Flag = country ? flags[country] : null;

  return (
    <span className="flex h-4 w-6 shrink-0 overflow-hidden rounded-sm bg-muted ring-1 ring-border/40">
      {Flag ? (
        <Flag title={countryName} />
      ) : (
        <span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
          —
        </span>
      )}
    </span>
  );
}

function CountrySelect({
  value,
  onChange,
  options,
  disabled,
  readOnly,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);
  const isDisabled = disabled || readOnly;
  const selectedCountry = value ?? DEFAULT_COUNTRY;
  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = React.useCallback(
    (country: Country) => {
      onChange(country);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={isDisabled}
        className={cn(
          "inline-flex h-11 shrink-0 items-center gap-2 rounded-s-lg border-0 border-r border-border/60 bg-transparent px-3 text-sm font-medium outline-none transition-colors",
          "hover:bg-muted/40 focus-visible:ring-0",
          isDisabled && "pointer-events-none opacity-50"
        )}
      >
        <FlagComponent
          country={selectedCountry}
          countryName={selectedOption?.label ?? selectedCountry}
        />
        <span className="tabular-nums text-foreground">
          +{getCountryCallingCode(selectedCountry)}
        </span>
        <ChevronDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,320px)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {options
                .filter(
                  (option): option is CountryOption & { value: Country } =>
                    Boolean(option.value) && !option.divider
                )
                .map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value} +${getCountryCallingCode(option.value)}`}
                    onSelect={() => handleSelect(option.value)}
                    className="gap-3"
                  >
                    <FlagComponent
                      country={option.value}
                      countryName={option.label}
                    />
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      +{getCountryCallingCode(option.value)}
                    </span>
                    <Check
                      className={cn(
                        "size-4 shrink-0",
                        option.value === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const InputComponent = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 min-w-0 flex-1 rounded-e-lg border-0 bg-transparent px-3 text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm",
      className
    )}
    {...props}
  />
));
InputComponent.displayName = "PhoneInputField";

export function PhoneInput({
  value,
  onChange,
  onBlur,
  disabled,
  id,
  "aria-invalid": ariaInvalid,
  className,
}: PhoneInputProps) {
  return (
    <div
      className={cn(
        "flex h-11 w-full items-stretch overflow-hidden rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        ariaInvalid &&
          "border-destructive/80 focus-within:border-destructive focus-within:ring-destructive/20",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <PhoneInputPrimitive
        id={id}
        international
        defaultCountry={DEFAULT_COUNTRY}
        countrySelectComponent={CountrySelect}
        inputComponent={InputComponent}
        flagComponent={FlagComponent}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className="flex h-full w-full items-center"
        numberInputProps={{
          placeholder: "Phone number",
        }}
      />
    </div>
  );
}

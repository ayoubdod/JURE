import * as React from "react";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { Button } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type CountryEntry = { label: string; value: RPNInput.Country | undefined };

type CountrySelectProps = {
  disabled?: boolean;
  value?: RPNInput.Country;
  onChange: (country: RPNInput.Country | undefined) => void;
  placeholder?: string;
  className?: string;
};

const CountrySelect = ({
  disabled,
  value: selectedCountry,
  onChange,
  placeholder = "Select country...",
  className,
}: CountrySelectProps) => {
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  // Get all countries from react-phone-number-input
  const countryList: CountryEntry[] = React.useMemo(() => {
    const countries = RPNInput.getCountries();
    return countries.map((country) => ({
      label: new Intl.DisplayNames(['en'], { type: 'region' }).of(country) || country,
      value: country,
    }));
  }, []);

  const selectedCountryName = selectedCountry 
    ? new Intl.DisplayNames(['en'], { type: 'region' }).of(selectedCountry) || selectedCountry
    : undefined;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "flex w-full min-w-0 justify-between gap-2 overflow-hidden px-3 py-2",
            !selectedCountry && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {selectedCountry && (
              <FlagComponent
                country={selectedCountry}
                countryName={selectedCountryName}
              />
            )}
            <span className="truncate">
              {selectedCountryName || placeholder}
            </span>
          </div>
          <ChevronsUpDown
            className={cn(
              "size-4 opacity-50",
              disabled ? "hidden" : "opacity-100",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            value={searchValue}
            onValueChange={(value) => {
              setSearchValue(value);
              setTimeout(() => {
                if (scrollAreaRef.current) {
                  const viewportElement = scrollAreaRef.current.querySelector(
                    "[data-radix-scroll-area-viewport]",
                  );
                  if (viewportElement) {
                    viewportElement.scrollTop = 0;
                  }
                }
              }, 0);
            }}
            placeholder="Search country..."
          />
          <CommandList>
            <ScrollArea ref={scrollAreaRef} className="h-72">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countryList.filter(c=>c.value != 'AC').map(({ value, label }) =>
                  value ? (
                    <CountrySelectOption
                      key={value}
                      country={value}
                      countryName={label}
                      selectedCountry={selectedCountry}
                      onChange={onChange}
                      onSelectComplete={() => setIsOpen(false)}
                    />
                  ) : null,
                )}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface CountrySelectOptionProps extends RPNInput.FlagProps {
  selectedCountry?: RPNInput.Country;
  onChange: (country: RPNInput.Country) => void;
  onSelectComplete: () => void;
}

const CountrySelectOption = ({
  country,
  countryName,
  selectedCountry,
  onChange,
  onSelectComplete,
}: CountrySelectOptionProps) => {
  const handleSelect = () => {
    onChange(country);
    onSelectComplete();
  };

  return (
    <CommandItem className="gap-2" onSelect={handleSelect}>
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm">{countryName}</span>
      <CheckIcon
        className={`ml-auto size-4 ${country === selectedCountry ? "opacity-100" : "opacity-0"}`}
      />
    </CommandItem>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20 [&_svg:not([class*='size-'])]:size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
};

export { CountrySelect };
export type { CountrySelectProps }; 
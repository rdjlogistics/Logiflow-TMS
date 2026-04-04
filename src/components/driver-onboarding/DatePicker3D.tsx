import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DatePicker3DProps {
  value: Date | null;
  onChange: (date: Date) => void;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => currentYear - 18 - i);

const WheelColumn = ({
  items,
  selectedIndex,
  onSelect,
  renderItem,
}: {
  items: (string | number)[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  renderItem: (item: string | number) => string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 48;

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = selectedIndex * itemHeight;
    }
  }, [selectedIndex]);

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      const newIndex = Math.round(scrollTop / itemHeight);
      if (newIndex !== selectedIndex && newIndex >= 0 && newIndex < items.length) {
        onSelect(newIndex);
      }
    }
  };

  return (
    <div className="relative h-[240px] flex-1 overflow-hidden">
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-12 bg-muted/50 rounded-lg pointer-events-none z-10" />
      <div className="absolute left-0 right-0 top-0 h-20 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
      <div className="absolute left-0 right-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
      
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
        onScroll={handleScroll}
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{ height: itemHeight * 2 }} />
        
        {items.map((item, index) => {
          const distance = Math.abs(index - selectedIndex);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.5 : 0.25;
          const scale = distance === 0 ? 1 : distance === 1 ? 0.9 : 0.8;
          
          return (
            <div
              key={index}
              className={cn(
                'h-12 flex items-center justify-center font-semibold text-lg snap-center cursor-pointer transition-all duration-200',
                index === selectedIndex ? 'text-foreground' : 'text-muted-foreground'
              )}
              style={{ opacity, transform: `scale(${scale})` }}
              onClick={() => onSelect(index)}
            >
              {renderItem(item)}
            </div>
          );
        })}
        
        <div style={{ height: itemHeight * 2 }} />
      </div>
    </div>
  );
};

export const DatePicker3D = ({ value, onChange }: DatePicker3DProps) => {
  const initialDate = value || new Date(2000, 0, 1);
  
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate() - 1);
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(
    YEARS.findIndex(y => y === initialDate.getFullYear()) >= 0 
      ? YEARS.findIndex(y => y === initialDate.getFullYear()) 
      : 0
  );

  useEffect(() => {
    const newDate = new Date(
      YEARS[selectedYear],
      selectedMonth,
      DAYS[selectedDay]
    );
    onChange(newDate);
  }, [selectedDay, selectedMonth, selectedYear, onChange]);

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <WheelColumn items={DAYS} selectedIndex={selectedDay} onSelect={setSelectedDay} renderItem={(item) => String(item)} />
        <WheelColumn items={MONTHS} selectedIndex={selectedMonth} onSelect={setSelectedMonth} renderItem={(item) => String(item)} />
        <WheelColumn items={YEARS} selectedIndex={selectedYear} onSelect={setSelectedYear} renderItem={(item) => String(item)} />
      </div>
    </div>
  );
};

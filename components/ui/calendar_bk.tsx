"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { ko } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  month: controlledMonth,
  onMonthChange: controlledOnMonthChange,
  ...props
}: CalendarProps) {
  // 외부에서 month를 제어하는 경우와 내부 상태를 사용하는 경우 구분
  const [internalMonth, setInternalMonth] = useState<Date>(controlledMonth || new Date())
  
  const displayMonth = controlledMonth || internalMonth
  
  // 연도 목록 생성 (현재 연도 기준 -50 ~ +10)
  const years = []
  const currentYear = displayMonth.getFullYear()
  const startYear = currentYear - 50
  const endYear = currentYear + 10
  for (let year = endYear; year >= startYear; year--) {
    years.push(year)
  }
  
  // 월 목록
  const months = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ]

  // 외부에서 month가 변경되면 내부 상태도 업데이트
  useEffect(() => {
    if (controlledMonth) {
      setInternalMonth(controlledMonth)
    }
  }, [controlledMonth])

  const updateMonth = (newDate: Date) => {
    if (controlledOnMonthChange) {
      controlledOnMonthChange(newDate)
    } else {
      setInternalMonth(newDate)
    }
  }

  const handleYearChange = (year: string) => {
    const newDate = new Date(displayMonth)
    newDate.setFullYear(parseInt(year))
    updateMonth(newDate)
  }

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(displayMonth)
    newDate.setMonth(parseInt(monthIndex))
    updateMonth(newDate)
  }

  const handlePreviousMonth = () => {
    const newDate = new Date(displayMonth)
    newDate.setMonth(newDate.getMonth() - 1)
    updateMonth(newDate)
  }

  const handleNextMonth = () => {
    const newDate = new Date(displayMonth)
    newDate.setMonth(newDate.getMonth() + 1)
    updateMonth(newDate)
  }

  return (
    <div className={cn("p-4", className)}>
      {/* 연도/월 선택 헤더 */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Select value={displayMonth.getFullYear().toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="h-8 w-24 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={displayMonth.getMonth().toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="h-8 w-20 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((monthName, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {monthName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePreviousMonth}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-8 w-8 p-0"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-8 w-8 p-0"
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 캘린더 */}
      <DayPicker
        showOutsideDays={showOutsideDays}
        locale={ko}
        month={displayMonth}
        onMonthChange={updateMonth}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-2",
          caption: "hidden", // 기본 캡션 숨김
          nav: "hidden", // 기본 네비게이션 숨김
          table: "w-full border-collapse",
          head_row: "flex mb-2",
          head_cell:
            "text-muted-foreground flex-1 font-medium text-xs text-center",
          row: "flex w-full mt-1",
          cell: "h-10 flex-1 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-10 w-full p-0 font-normal hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground font-semibold",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        {...props}
      />

    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

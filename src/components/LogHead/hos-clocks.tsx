import { useState } from "react";
import { HosGauge } from "../hos-gauge";
import type { HosTimers } from "@/lib/hos/calculations-old";
import { Switch } from "../ui/switch";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { HiServerStack } from "react-icons/hi2";
import { MdCalculate } from "react-icons/md";
type HosClocksProps = {
  hosTimers: HosTimers;
};

const toGaugeClock = (value: number, max: number) => ({
  value,
  max,
});

const hosClock = (clock: { usedMs: number; remainingMs: number }) =>
  toGaugeClock(clock.usedMs, clock.usedMs + clock.remainingMs);

const relayClock = (clock?: { accumulatedTime: number; limitTime: number }) =>
  toGaugeClock(clock?.accumulatedTime ?? 0, clock?.limitTime ?? 0);

const HosClocks = ({ hosTimers, driver }: HosClocksProps) => {
  const [enabled, setEnabled] = useState(false);

  const breakClock = enabled
    ? hosClock(hosTimers.breakState)
    : relayClock(driver.breakTime);

  const driveClock = enabled
    ? hosClock(hosTimers.driveState)
    : relayClock(driver.driveTime);

  const shiftClock = enabled
    ? hosClock(hosTimers.shiftState)
    : relayClock(driver.shiftTime);

  const cycleClock = enabled
    ? hosClock(hosTimers.currentCycle)
    : relayClock(driver.cycleTime);

  return (
    <div className="flex gap-2">
      <div className="flex items-center gap-2">
        <HosGauge
          large
          label="Break"
          value={breakClock.value}
          max={breakClock.max}
          color="var(--break)"
        />

        <HosGauge
          large
          label="Drive"
          value={driveClock.value}
          max={driveClock.max}
          color="var(--hos-DS_D-bg)"
        />

        <HosGauge
          large
          label="Shift"
          value={shiftClock.value}
          max={shiftClock.max}
          color="var(--hos-DS_ON-bg)"
        />
        {hosTimers.currentCycle.isRecap && enabled ? (
          <HosGauge
            large
            label="Recap"
            value={cycleClock.value}
            max={cycleClock.max}
            color="var(--recap)"
          />
        ) : (
          <HosGauge
            large
            label="Cycle"
            value={cycleClock.value}
            max={cycleClock.max}
            color="var(--cycle)"
          />
        )}
      </div>
      <div className="flex flex-col items-center gap-2">
        <SwitchPrimitives.Root
          checked={enabled}
          onCheckedChange={setEnabled}
          className="bg-muted relative h-16 w-6 cursor-pointer rounded-full transition-colors data-[state=checked]:bg-[var(--cycle)]"
        >
          <SwitchPrimitives.Thumb className="absolute bottom-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform data-[state=checked]:-translate-y-10">
            {enabled ? <MdCalculate size={12} /> : <HiServerStack size={12} />}
          </SwitchPrimitives.Thumb>
        </SwitchPrimitives.Root>
      </div>
    </div>
  );
};

export default HosClocks;

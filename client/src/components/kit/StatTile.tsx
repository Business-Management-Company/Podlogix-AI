import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { staggerItem } from "./motion";

interface StatTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color?: string;
}

export function StatTile({ label, value, icon: Icon, color = "#10b981" }: StatTileProps) {
  return (
    <motion.div variants={staggerItem} className="flex items-start gap-2.5">
      <div
        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[7px]"
        style={{ background: `${color}18` }}
      >
        <Icon size={13} style={{ color }} />
      </div>
      <div>
        <p className="text-[18px] font-semibold leading-none tracking-[-0.02em] text-zinc-950">
          {value}
        </p>
        <p className="mt-[3px] text-[11px] text-zinc-400">{label}</p>
      </div>
    </motion.div>
  );
}

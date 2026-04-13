"use client";

import { useAppStore } from "@/lib/store";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { M1Inventory } from "@/components/modules/M1Inventory";
import { M2Pipeline } from "@/components/modules/M2Pipeline";
import M3Refining from "@/components/modules/M3Refining";
import M4AltSources from "@/components/modules/M4AltSources";
import { M5Iran } from "@/components/modules/M5Iran";
import { M6Price } from "@/components/modules/M6Price";
import { M7Conservation } from "@/components/modules/M7Conservation";
import { M8Trigger } from "@/components/modules/M8Trigger";
import { ScenarioManager } from "@/components/scenarios/ScenarioManager";
import { ReportPanel } from "@/components/report/ReportPanel";
import { FormulasPanel } from "@/components/modules/FormulasPanel";
import { MapPanel } from "@/components/modules/MapPanel";

export function MainPanel() {
  const activePanel = useAppStore((s) => s.activePanel);

  switch (activePanel) {
    case "dashboard":
      return <Dashboard />;
    case "m1":
      return <M1Inventory />;
    case "m2":
      return <M2Pipeline />;
    case "m3":
      return <M3Refining />;
    case "m4":
      return <M4AltSources />;
    case "m5":
      return <M5Iran />;
    case "m6":
      return <M6Price />;
    case "m7":
      return <M7Conservation />;
    case "m8":
      return <M8Trigger />;
    case "scenarios":
      return <ScenarioManager />;
    case "report":
      return <ReportPanel />;
    case "formulas":
      return <FormulasPanel />;
    case "map":
      return <MapPanel />;
    default:
      return <Dashboard />;
  }
}

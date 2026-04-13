"use client";

import { useMemo, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { ModulePanel, Card } from "@/components/ui/ModulePanel";
import {
  getRiskWeightedBarrels,
  traceRiskWeightedBarrels,
} from "@/lib/calculations/m2-pipeline";
import { InlineFormula } from "@/components/ui/FormulaBreakdown";
import { DEFAULT_LOSS_PROBABILITIES } from "@/lib/defaults";
import type { Cargo, CargoStatus } from "@/types";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const STATUS_OPTIONS: { value: CargoStatus; label: string }[] = [
  { value: "docked", label: "Docked" },
  { value: "in_war_zone", label: "In War Zone" },
  { value: "outside_war_zone", label: "Outside War Zone" },
  { value: "contracted_not_dispatched", label: "Contracted / Not Dispatched" },
];

const STATUS_COLORS: Record<CargoStatus, string> = {
  docked: "#27ae60",
  in_war_zone: "#c0392b",
  outside_war_zone: "#2563eb",
  contracted_not_dispatched: "#d4a017",
};

function generateId(): string {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function M2Pipeline() {
  const cargoes = useAppStore((s) => s.scenario.m2.cargoes);
  const baselineMode = useAppStore((s) => s.scenario.baselineMode);
  const m1 = useAppStore((s) => s.scenario.m1);
  const addCargo = useAppStore((s) => s.addCargo);
  const updateCargo = useAppStore((s) => s.updateCargo);
  const removeCargo = useAppStore((s) => s.removeCargo);

  const handleStatusChange = useCallback(
    (id: string, newStatus: CargoStatus) => {
      updateCargo(id, {
        status: newStatus,
        lossProbability: DEFAULT_LOSS_PROBABILITIES[newStatus],
      });
    },
    [updateCargo],
  );

  const handleAddCargo = useCallback(() => {
    const newCargo: Cargo = {
      id: generateId(),
      vesselName: "",
      imoNumber: "",
      product: "Arab Light",
      quantityBarrels: 0,
      quantityTonnes: 0,
      loadingPort: "",
      eta: new Date().toISOString().slice(0, 10),
      insurer: "",
      flagState: "",
      status: "contracted_not_dispatched",
      lossProbability: DEFAULT_LOSS_PROBABILITIES["contracted_not_dispatched"],
    };
    addCargo(newCargo);
  }, [addCargo]);

  // Computed outputs
  const riskWeightedBarrels = useMemo(
    () => getRiskWeightedBarrels(cargoes, baselineMode),
    [cargoes, baselineMode],
  );
  const rwTrace = useMemo(
    () => traceRiskWeightedBarrels(cargoes, baselineMode),
    [cargoes, baselineMode],
  );

  const riskAdjustedDaysCover = useMemo(() => {
    if (m1.totalPetroleumConsumption <= 0) return 0;
    return riskWeightedBarrels / m1.totalPetroleumConsumption;
  }, [riskWeightedBarrels, m1.totalPetroleumConsumption]);

  const totalNominalBarrels = useMemo(
    () => cargoes.reduce((sum, c) => sum + c.quantityBarrels, 0),
    [cargoes],
  );

  // Chart data
  const chartData = useMemo(
    () =>
      cargoes.map((c) => ({
        name: c.vesselName || c.id,
        barrels: c.quantityBarrels,
        status: c.status,
        fill: STATUS_COLORS[c.status],
      })),
    [cargoes],
  );

  return (
    <ModulePanel
      title="M2 -- Seaborne Supply Pipeline"
      subtitle="Inbound cargoes, status tracking, and risk-weighted supply estimates"
    >
      <p className="text-xs text-slate mb-4">
        Seed data is illustrative. Edit vessel details, adjust statuses, and add
        or remove cargoes as needed.
      </p>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-xs text-slate mb-1">Total Nominal Barrels</div>
          <div className="font-mono text-lg text-navy font-semibold">
            {totalNominalBarrels.toLocaleString()}
          </div>
        </Card>
        <Card>
          <InlineFormula trace={rwTrace}>
            <div>
              <div className="text-xs text-slate mb-1">
                Risk-Weighted Barrels
              </div>
              <div className="font-mono text-lg text-navy font-semibold">
                {Math.round(riskWeightedBarrels).toLocaleString()}
              </div>
            </div>
          </InlineFormula>
        </Card>
        <Card>
          <div className="text-xs text-slate mb-1">
            Risk-Adjusted Days of Cover Added
          </div>
          <div className="font-mono text-lg text-navy font-semibold">
            {riskAdjustedDaysCover.toFixed(1)}
          </div>
        </Card>
      </div>

      {/* Cargo table */}
      <Card title="Cargo Manifest" className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-2 font-medium text-slate">
                  Vessel
                </th>
                <th className="text-left py-2 pr-2 font-medium text-slate">
                  IMO
                </th>
                <th className="text-left py-2 pr-2 font-medium text-slate">
                  Product
                </th>
                <th className="text-right py-2 pr-2 font-medium text-slate">
                  Qty (bbl)
                </th>
                <th className="text-right py-2 pr-2 font-medium text-slate">
                  Qty (t)
                </th>
                <th className="text-left py-2 pr-2 font-medium text-slate">
                  Port
                </th>
                <th className="text-left py-2 pr-2 font-medium text-slate">
                  ETA
                </th>
                <th className="text-left py-2 pr-2 font-medium text-slate">
                  Insurer
                </th>
                <th className="text-left py-2 pr-2 font-medium text-slate">
                  Flag
                </th>
                <th className="text-left py-2 pr-2 font-medium text-slate">
                  Status
                </th>
                <th className="text-right py-2 pr-2 font-medium text-slate">
                  Loss P
                </th>
                <th className="py-2 font-medium text-slate"></th>
              </tr>
            </thead>
            <tbody>
              {cargoes.map((cargo) => (
                <CargoRow
                  key={cargo.id}
                  cargo={cargo}
                  onUpdate={updateCargo}
                  onStatusChange={handleStatusChange}
                  onRemove={removeCargo}
                />
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={handleAddCargo}
          className="mt-3 text-xs font-medium text-navy border border-border rounded px-3 py-1.5 hover:bg-card-hover transition-colors"
        >
          + Add Cargo
        </button>
      </Card>

      {/* Bar chart */}
      <Card title="Cargo Quantities by Status">
        <div className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e0dc" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: "#64748b" }}
                angle={-30}
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                label={{
                  value: "Barrels",
                  angle: -90,
                  position: "insideLeft",
                  offset: 5,
                  fontSize: 11,
                  fill: "#64748b",
                }}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  background: "#ffffff",
                  border: "1px solid #e2e0dc",
                }}
                formatter={(value: unknown) => [
                  Number(value).toLocaleString(),
                  "Barrels",
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              <Bar dataKey="barrels" name="Barrels">
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </ModulePanel>
  );
}

// Individual cargo row component
function CargoRow({
  cargo,
  onUpdate,
  onStatusChange,
  onRemove,
}: {
  cargo: Cargo;
  onUpdate: (id: string, partial: Partial<Cargo>) => void;
  onStatusChange: (id: string, status: CargoStatus) => void;
  onRemove: (id: string) => void;
}) {
  const cellClass = "py-1.5 pr-2";
  const inputClass =
    "w-full bg-input-bg border border-border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-navy";
  const numInputClass = `${inputClass} font-mono text-right`;

  return (
    <tr className="border-b border-border/50 hover:bg-card-hover/50">
      <td className={cellClass}>
        <input
          className={inputClass}
          style={{ minWidth: 110 }}
          value={cargo.vesselName}
          onChange={(e) => onUpdate(cargo.id, { vesselName: e.target.value })}
        />
      </td>
      <td className={cellClass}>
        <input
          className={inputClass}
          style={{ minWidth: 90 }}
          value={cargo.imoNumber}
          onChange={(e) => onUpdate(cargo.id, { imoNumber: e.target.value })}
        />
      </td>
      <td className={cellClass}>
        <input
          className={inputClass}
          style={{ minWidth: 80 }}
          value={cargo.product}
          onChange={(e) => onUpdate(cargo.id, { product: e.target.value })}
        />
      </td>
      <td className={cellClass}>
        <input
          type="number"
          className={numInputClass}
          style={{ minWidth: 80 }}
          value={cargo.quantityBarrels}
          onChange={(e) =>
            onUpdate(cargo.id, {
              quantityBarrels: parseFloat(e.target.value) || 0,
            })
          }
          step={10000}
          min={0}
        />
      </td>
      <td className={cellClass}>
        <input
          type="number"
          className={numInputClass}
          style={{ minWidth: 65 }}
          value={cargo.quantityTonnes}
          onChange={(e) =>
            onUpdate(cargo.id, {
              quantityTonnes: parseFloat(e.target.value) || 0,
            })
          }
          step={1000}
          min={0}
        />
      </td>
      <td className={cellClass}>
        <input
          className={inputClass}
          style={{ minWidth: 80 }}
          value={cargo.loadingPort}
          onChange={(e) => onUpdate(cargo.id, { loadingPort: e.target.value })}
        />
      </td>
      <td className={cellClass}>
        <input
          type="date"
          className={inputClass}
          style={{ minWidth: 110 }}
          value={cargo.eta}
          onChange={(e) => onUpdate(cargo.id, { eta: e.target.value })}
        />
      </td>
      <td className={cellClass}>
        <input
          className={inputClass}
          style={{ minWidth: 80 }}
          value={cargo.insurer}
          onChange={(e) => onUpdate(cargo.id, { insurer: e.target.value })}
        />
      </td>
      <td className={cellClass}>
        <input
          className={inputClass}
          style={{ minWidth: 70 }}
          value={cargo.flagState}
          onChange={(e) => onUpdate(cargo.id, { flagState: e.target.value })}
        />
      </td>
      <td className={cellClass}>
        <select
          className={`${inputClass} pr-5`}
          style={{ minWidth: 120 }}
          value={cargo.status}
          onChange={(e) =>
            onStatusChange(cargo.id, e.target.value as CargoStatus)
          }
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>
      <td className={cellClass}>
        <input
          type="number"
          className={numInputClass}
          style={{ minWidth: 55 }}
          value={cargo.lossProbability}
          onChange={(e) =>
            onUpdate(cargo.id, {
              lossProbability: parseFloat(e.target.value) || 0,
            })
          }
          step={0.01}
          min={0}
          max={1}
        />
      </td>
      <td className="py-1.5">
        <button
          onClick={() => onRemove(cargo.id)}
          className="text-slate hover:text-red-muted transition-colors px-1"
          title="Remove cargo"
        >
          x
        </button>
      </td>
    </tr>
  );
}

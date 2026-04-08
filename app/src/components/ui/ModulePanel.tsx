'use client';

interface ModulePanelProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ModulePanel({ title, subtitle, children }: ModulePanelProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-navy">{title}</h2>
        {subtitle && <p className="text-sm text-slate mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      {title && <h3 className="text-sm font-semibold text-navy mb-3">{title}</h3>}
      {children}
    </div>
  );
}

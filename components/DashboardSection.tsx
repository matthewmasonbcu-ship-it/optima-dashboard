"use client";

type DashboardSectionProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export default function DashboardSection({
  title,
  subtitle,
  children,
}: DashboardSectionProps) {
  return (
    <section
      style={{
        border: "1px solid #333",
        borderRadius: "12px",
        padding: "18px",
        background: "#111",
        color: "white",
        marginBottom: "18px",
      }}
    >
      <div style={{ marginBottom: "14px" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>

        {subtitle && (
          <p
            style={{
              margin: "6px 0 0",
              color: "#aaa",
              fontSize: "14px",
              lineHeight: "1.4",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}
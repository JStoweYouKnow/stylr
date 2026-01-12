"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface WardrobeAnalytics {
  colorDistribution: { color: string; count: number }[];
  typeBreakdown: { type: string; count: number }[];
  styleMetrics: { vibe: string; count: number }[];
  wearFrequency: { itemId: number; itemType: string | null; wearCount: number }[];
  wardrobeDiversity: number;
  missingBasics: string[];
}

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#8dd1e1",
  "#d084d0",
  "#ffb347",
  "#87ceeb",
];

// Map color names to CSS colors for label styling
function getColorValue(colorName: string): string {
  const name = colorName.toLowerCase().trim();

  // Common color mappings
  const colorMap: Record<string, string> = {
    // Basic colors
    black: "#000000",
    white: "#ffffff",
    red: "#dc2626",
    blue: "#2563eb",
    green: "#16a34a",
    yellow: "#eab308",
    orange: "#f97316",
    purple: "#9333ea",
    pink: "#ec4899",
    brown: "#92400e",
    gray: "#6b7280",
    grey: "#6b7280",

    // Common variations
    navy: "#1e3a5a",
    "navy blue": "#1e3a5a",
    beige: "#d4b896",
    cream: "#fffdd0",
    tan: "#d2b48c",
    khaki: "#c3b091",
    maroon: "#800000",
    burgundy: "#800020",
    "lush burgundy": "#800020",
    olive: "#808000",
    teal: "#008080",
    coral: "#ff7f50",
    salmon: "#fa8072",
    mustard: "#e1ad01",
    charcoal: "#36454f",
    ivory: "#fffff0",
    taupe: "#483c32",
    "soft taupe": "#8b7d6b",
    mauve: "#e0b0ff",
    lavender: "#e6e6fa",
    mint: "#98fb98",
    peach: "#ffcba4",
    rust: "#b7410e",
    wine: "#722f37",
    plum: "#8e4585",
    slate: "#708090",
    denim: "#1560bd",
    indigo: "#4b0082",
    aqua: "#00ffff",
    turquoise: "#40e0d0",
    gold: "#ffd700",
    silver: "#c0c0c0",
    bronze: "#cd7f32",
    copper: "#b87333",
    "off white": "#faf9f6",
    "off-white": "#faf9f6",
    bracken: "#4a2c2a",
    camel: "#c19a6b",
    chocolate: "#7b3f00",
    espresso: "#3c2415",
    sand: "#c2b280",
    stone: "#928e85",
  };

  // Check direct match
  if (colorMap[name]) {
    return colorMap[name];
  }

  // Check if any key is contained in the name
  for (const [key, value] of Object.entries(colorMap)) {
    if (name.includes(key)) {
      return value;
    }
  }

  // Try to use the color name directly as CSS (works for basic colors)
  return "#666666"; // Default gray for unknown colors
}

export default function WardrobeStats() {
  const [analytics, setAnalytics] = useState<WardrobeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics/wardrobe");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setAnalytics(data);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        Failed to load analytics
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Diversity Score */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Wardrobe Diversity</h3>
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold">{analytics.wardrobeDiversity}</div>
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all"
                style={{ width: `${analytics.wardrobeDiversity}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Based on variety of types and colors
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Color Distribution */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Color Distribution</h3>
          {analytics.colorDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.colorDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ cx, cy, midAngle, outerRadius, payload }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = (outerRadius ?? 80) * 1.35;
                    const angle = midAngle ?? 0;
                    const centerX = cx ?? 0;
                    const centerY = cy ?? 0;
                    const x = centerX + radius * Math.cos(-angle * RADIAN);
                    const y = centerY + radius * Math.sin(-angle * RADIAN);
                    const colorName = payload?.color ?? "Unknown";
                    const textColor = getColorValue(colorName);

                    return (
                      <text
                        x={x}
                        y={y}
                        fill={textColor}
                        textAnchor={x > centerX ? "start" : "end"}
                        dominantBaseline="central"
                        fontSize={12}
                        fontWeight={500}
                      >
                        {`${colorName}: ${payload?.count ?? 0}`}
                      </text>
                    );
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.colorDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No color data available</p>
          )}
        </div>

        {/* Type Breakdown */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Items by Type</h3>
          {analytics.typeBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.typeBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No type data available</p>
          )}
        </div>

        {/* Style Metrics */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Style Distribution</h3>
          {analytics.styleMetrics.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.styleMetrics}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ payload }) =>
                    `${payload?.vibe ?? "Unknown"}: ${payload?.count ?? 0}`
                  }
                  outerRadius={80}
                  fill="#82ca9d"
                  dataKey="count"
                >
                  {analytics.styleMetrics.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No style data available</p>
          )}
        </div>

        {/* Most Worn Items */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Most Worn Items</h3>
          {analytics.wearFrequency.length > 0 ? (
            <div className="space-y-2">
              {analytics.wearFrequency.slice(0, 5).map((item) => (
                <div key={item.itemId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">
                    {item.itemType || `Item #${item.itemId}`}
                  </span>
                  <span className="text-sm font-semibold">{item.wearCount}x</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No wear data available</p>
          )}
        </div>
      </div>

      {/* Missing Basics */}
      {analytics.missingBasics.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Missing Basics</h3>
          <p className="text-sm text-gray-700 mb-3">
            Consider adding these versatile pieces to your wardrobe:
          </p>
          <div className="flex flex-wrap gap-2">
            {analytics.missingBasics.map((basic) => (
              <span
                key={basic}
                className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
              >
                {basic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


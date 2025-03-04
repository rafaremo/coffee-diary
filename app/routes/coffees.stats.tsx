import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { format, subMonths } from "date-fns";
import { useState } from "react";

import { Card } from "~/components/ui/card";
import type { Coffee } from "~/models/coffee.server";
import { getCoffeeListItems } from "~/models/coffee.server";
import { requireUserId } from "~/session.server";

type TimeRange = "1month" | "3months" | "6months" | "1year" | "all";

// Define a type for coffee data as it comes from the loader (serialized dates)
interface SerializedCoffee {
  id: string;
  name: string;
  brand: string;
  preparation: string;
  shots: number;
  flavor: string;
  rating: number;
  description: string;
  createdAt: string; // Date is serialized as string in JSON
  updatedAt: string;
  userId: string;
}

interface AggregatedCoffee {
  name: string;
  brand: string;
  count: number;
  rating: number;
  avgRating: number;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const coffeeListItems = await getCoffeeListItems({ userId });
  
  return json({ coffeeListItems });
};

export default function StatsPage() {
  const data = useLoaderData<typeof loader>();
  const [timeRange, setTimeRange] = useState<TimeRange>("1month");
  
  // Filter coffees based on selected time range
  const filteredCoffees = filterCoffeesByTimeRange(data.coffeeListItems, timeRange);
  
  // Calculate stats
  const totalCoffees = filteredCoffees.length;
  const coffeesByDay = calculateCoffeesByDay(filteredCoffees);
  const topRatedCoffees = calculateTopRatedCoffees(filteredCoffees);
  const mostConsumedCoffees = calculateMostConsumedCoffees(filteredCoffees);
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Coffee Statistics</h2>
      
      {/* Time range selector */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTimeRange("1month")}
          className={`px-4 py-2 rounded ${timeRange === "1month" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Last Month
        </button>
        <button
          onClick={() => setTimeRange("3months")}
          className={`px-4 py-2 rounded ${timeRange === "3months" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Last 3 Months
        </button>
        <button
          onClick={() => setTimeRange("6months")}
          className={`px-4 py-2 rounded ${timeRange === "6months" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Last 6 Months
        </button>
        <button
          onClick={() => setTimeRange("1year")}
          className={`px-4 py-2 rounded ${timeRange === "1year" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          Last Year
        </button>
        <button
          onClick={() => setTimeRange("all")}
          className={`px-4 py-2 rounded ${timeRange === "all" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
        >
          All Time
        </button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <h3 className="text-lg font-medium">Total Coffees</h3>
          <p className="text-3xl font-bold mt-2">{totalCoffees}</p>
          <p className="text-sm text-gray-500 mt-1">
            {getTimeRangeText(timeRange)}
          </p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-medium">Average per Day</h3>
          <p className="text-3xl font-bold mt-2">
            {totalCoffees > 0 && coffeesByDay.length > 0
              ? (totalCoffees / coffeesByDay.length).toFixed(1)
              : "0"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {getTimeRangeText(timeRange)}
          </p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-medium">Average Rating</h3>
          <p className="text-3xl font-bold mt-2">
            {totalCoffees > 0
              ? (filteredCoffees.reduce((sum, coffee) => sum + coffee.rating, 0) / totalCoffees).toFixed(1)
              : "0"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {getTimeRangeText(timeRange)}
          </p>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-medium">Most Common Preparation</h3>
          <p className="text-3xl font-bold mt-2">
            {calculateMostCommonPreparation(filteredCoffees) || "N/A"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {getTimeRangeText(timeRange)}
          </p>
        </Card>
      </div>
      
      {/* Top Rated Coffees */}
      <div>
        <h3 className="text-xl font-bold mb-4">Top Rated Coffees</h3>
        {topRatedCoffees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2 text-left">Name</th>
                  <th className="border px-4 py-2 text-left">Brand</th>
                  <th className="border px-4 py-2 text-center">Rating</th>
                  <th className="border px-4 py-2 text-center">Times Consumed</th>
                </tr>
              </thead>
              <tbody>
                {topRatedCoffees.map((coffee, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border px-4 py-2">{coffee.name}</td>
                    <td className="border px-4 py-2">{coffee.brand}</td>
                    <td className="border px-4 py-2 text-center">{coffee.rating}/5</td>
                    <td className="border px-4 py-2 text-center">{coffee.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No coffee entries available for this time period.</p>
        )}
      </div>
      
      {/* Most Consumed Coffees */}
      <div>
        <h3 className="text-xl font-bold mb-4">Most Consumed Coffees</h3>
        {mostConsumedCoffees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2 text-left">Name</th>
                  <th className="border px-4 py-2 text-left">Brand</th>
                  <th className="border px-4 py-2 text-center">Times Consumed</th>
                  <th className="border px-4 py-2 text-center">Avg. Rating</th>
                </tr>
              </thead>
              <tbody>
                {mostConsumedCoffees.map((coffee, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border px-4 py-2">{coffee.name}</td>
                    <td className="border px-4 py-2">{coffee.brand}</td>
                    <td className="border px-4 py-2 text-center">{coffee.count}</td>
                    <td className="border px-4 py-2 text-center">{coffee.avgRating.toFixed(1)}/5</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No coffee entries available for this time period.</p>
        )}
      </div>
    </div>
  );
}

// Helper functions

function getTimeRangeText(range: TimeRange) {
  switch (range) {
    case "1month": return "in the last month";
    case "3months": return "in the last 3 months";
    case "6months": return "in the last 6 months";
    case "1year": return "in the last year";
    case "all": return "all time";
  }
}

function filterCoffeesByTimeRange(coffees: SerializedCoffee[], range: TimeRange): SerializedCoffee[] {
  if (range === "all") return coffees;
  
  const now = new Date();
  let startDate: Date;
  
  switch (range) {
    case "1month":
      startDate = subMonths(now, 1);
      break;
    case "3months":
      startDate = subMonths(now, 3);
      break;
    case "6months":
      startDate = subMonths(now, 6);
      break;
    case "1year":
      startDate = subMonths(now, 12);
      break;
    default:
      startDate = subMonths(now, 1);
  }
  
  return coffees.filter(coffee => 
    new Date(coffee.createdAt) >= startDate && new Date(coffee.createdAt) <= now
  );
}

function calculateCoffeesByDay(coffees: SerializedCoffee[]): string[] {
  // Group coffees by day
  const coffeesByDay = coffees.reduce((acc, coffee) => {
    const date = format(new Date(coffee.createdAt), 'yyyy-MM-dd');
    if (!acc.includes(date)) {
      acc.push(date);
    }
    return acc;
  }, []);
  
  return coffeesByDay;
}

function calculateTopRatedCoffees(coffees: SerializedCoffee[]): AggregatedCoffee[] {
  // Group by name and brand
  const groupedCoffees = coffees.reduce<Record<string, AggregatedCoffee>>((acc, coffee) => {
    const key = `${coffee.name}|${coffee.brand}`;
    
    if (!acc[key]) {
      acc[key] = {
        name: coffee.name,
        brand: coffee.brand,
        count: 0,
        rating: 0,
        avgRating: 0,
      };
    }
    
    acc[key].count++;
    acc[key].rating += coffee.rating;
    acc[key].avgRating = acc[key].rating / acc[key].count;
    
    return acc;
  }, {});
  
  // Convert to array and sort by rating
  return Object.values(groupedCoffees)
    .sort((a, b) => b.avgRating - a.avgRating || b.count - a.count)
    .slice(0, 5);
}

function calculateMostConsumedCoffees(coffees: SerializedCoffee[]): AggregatedCoffee[] {
  // Group by name and brand
  const groupedCoffees = coffees.reduce<Record<string, AggregatedCoffee>>((acc, coffee) => {
    const key = `${coffee.name}|${coffee.brand}`;
    
    if (!acc[key]) {
      acc[key] = {
        name: coffee.name,
        brand: coffee.brand,
        count: 0,
        rating: 0,
        avgRating: 0,
      };
    }
    
    acc[key].count++;
    acc[key].rating += coffee.rating;
    acc[key].avgRating = acc[key].rating / acc[key].count;
    
    return acc;
  }, {});
  
  // Convert to array and sort by count
  return Object.values(groupedCoffees)
    .sort((a, b) => b.count - a.count || b.avgRating - a.avgRating)
    .slice(0, 5);
}

function calculateMostCommonPreparation(coffees: SerializedCoffee[]): string | null {
  if (coffees.length === 0) return null;
  
  const preparationCounts = coffees.reduce<Record<string, number>>((acc, coffee) => {
    acc[coffee.preparation] = (acc[coffee.preparation] || 0) + 1;
    return acc;
  }, {});
  
  let maxCount = 0;
  let mostCommon = null;
  
  for (const [preparation, count] of Object.entries(preparationCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = preparation;
    }
  }
  
  return mostCommon;
} 
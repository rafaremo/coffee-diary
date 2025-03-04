import { Link } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function CoffeesIndexPage() {
  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">☕ Coffee Diary</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          Welcome to your Coffee Diary! Track your daily coffee intake and keep notes about your
          favorite brews.
        </p>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li>Record the preparation method</li>
          <li>Track espresso shots</li>
          <li>Describe flavors</li>
          <li>Rate your coffees</li>
          <li>Add custom notes</li>
        </ul>
        <p>
          Select a coffee entry from the sidebar or{" "}
          <Link to="new" className="text-blue-500 hover:underline">
            create a new entry
          </Link>.
        </p>
      </CardContent>
    </Card>
  );
} 
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link } from "@remix-run/react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { getUserId } from "~/session.server";

export const meta: MetaFunction = () => [{ title: "Coffee Diary" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/coffees");
  return json({});
};

export default function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">☕ Coffee Diary</CardTitle>
          <CardDescription>Track your daily coffee experiences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Welcome to Coffee Diary, your personal coffee tracking app. Record your daily coffee
            experiences, track preparation methods, flavors, and more.
          </p>
          <div className="flex flex-col space-y-2">
            <Link to="/join">
              <Button className="w-full" variant="default">
                Sign Up
              </Button>
            </Link>
            <Link to="/login">
              <Button className="w-full" variant="outline">
                Log In
              </Button>
            </Link>
          </div>
        </CardContent>
        <CardFooter className="text-center text-sm text-gray-500">
          <p>Track every cup, discover your preferences</p>
        </CardFooter>
      </Card>
    </div>
  );
}

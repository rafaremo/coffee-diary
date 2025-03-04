import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { CheckCircle, XCircle } from "lucide-react";

import { confirmUserEmail } from "~/models/user.server";
import { createUserSession, getUserId } from "~/session.server";

export const meta: MetaFunction = () => [{ title: "Confirm Email" }];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  
  // If already logged in, redirect to home
  if (userId) {
    return redirect("/");
  }

  const { token } = params;
  if (!token) {
    return json(
      { error: "Invalid confirmation link", success: false },
      { status: 400 }
    );
  }

  const user = await confirmUserEmail(token);
  if (!user) {
    return json(
      {
        error:
          "This confirmation link is invalid or has expired. Please request a new one.",
        success: false,
      },
      { status: 400 }
    );
  }

  // Successfully confirmed email. Log the user in.
  return createUserSession({
    redirectTo: "/",
    remember: false,
    request,
    userId: user.id,
  });
};

export default function ConfirmEmail() {
  const data = useLoaderData<typeof loader>();

  // This component will only render if there was an error,
  // since successful confirmations redirect to home
  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-8">
        <div className="flex flex-col items-center justify-center space-y-6">
          <h1 className="text-2xl font-bold">☕ Coffee Diary</h1>
          
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            {data.error ? (
              <>
                <XCircle className="h-16 w-16 text-red-500" />
                <h2 className="text-xl font-semibold">Email Confirmation Failed</h2>
                <p className="text-gray-600">{data.error}</p>
                <Link
                  to="/login"
                  className="text-blue-500 underline"
                >
                  Go to login page
                </Link>
              </>
            ) : (
              <>
                <CheckCircle className="h-16 w-16 text-green-500" />
                <h2 className="text-xl font-semibold">Email Confirmed!</h2>
                <p className="text-gray-600">Thank you for verifying your email address. You are now being redirected...</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useEffect, useRef } from "react";

import { Button } from "~/components/ui/button";
import { resetPassword, verifyPasswordResetToken } from "~/models/user.server";
import { createUserSession, getUserId } from "~/session.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/");

  const { token } = params;
  if (!token) {
    return redirect("/login");
  }

  const passwordReset = await verifyPasswordResetToken(token);
  if (!passwordReset) {
    return json({ 
      isValidToken: false,
      error: "Invalid or expired reset token. Please request a new password reset link." 
    });
  }

  return json({ isValidToken: true, token, email: passwordReset.user.email });
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const { token } = params;
  if (!token) {
    return json(
      { errors: { password: "Invalid reset attempt" } },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const password = formData.get("password");
  const passwordConfirm = formData.get("passwordConfirm");

  if (typeof password !== "string" || password.length === 0) {
    return json(
      { errors: { password: "Password is required" } },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return json(
      { errors: { password: "Password must be at least 8 characters" } },
      { status: 400 },
    );
  }

  if (password !== passwordConfirm) {
    return json(
      { errors: { passwordConfirm: "Passwords do not match" } },
      { status: 400 },
    );
  }

  const user = await resetPassword(token, password);
  if (!user) {
    return json(
      { errors: { password: "Invalid or expired reset token" } },
      { status: 400 },
    );
  }

  // Log the user in after successful password reset
  return createUserSession({
    request,
    userId: user.id,
    remember: false,
    redirectTo: "/",
  });
};

export const meta: MetaFunction = () => [{ title: "Reset Password" }];

export default function ResetPasswordPage() {
  const { isValidToken, error, email } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmRef = useRef<HTMLInputElement>(null);
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.errors?.password) {
      passwordRef.current?.focus();
    } else if (actionData?.errors?.passwordConfirm) {
      passwordConfirmRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-8">
        <div className="flex justify-center mb-6">
          <h1 className="text-2xl font-bold">☕ Coffee Diary</h1>
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">Reset Password</h1>
        
        {!isValidToken ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
            <div className="mt-4 text-center">
              <a
                href="/forgot-password"
                className="text-blue-500 underline"
              >
                Request a new password reset
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 text-gray-700">
              <p>Enter a new password for <strong>{email}</strong></p>
            </div>
            
            <Form method="post" className="space-y-6">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  New Password
                </label>
                <div className="mt-1">
                  <input
                    ref={passwordRef}
                    id="password"
                    required
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={actionData?.errors?.password ? true : undefined}
                    aria-describedby="password-error"
                    className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                    disabled={isSubmitting}
                  />
                  {actionData?.errors?.password ? (
                    <div className="pt-1 text-red-700" id="password-error">
                      {actionData.errors.password}
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <label
                  htmlFor="passwordConfirm"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm New Password
                </label>
                <div className="mt-1">
                  <input
                    ref={passwordConfirmRef}
                    id="passwordConfirm"
                    required
                    name="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={actionData?.errors?.passwordConfirm ? true : undefined}
                    aria-describedby="passwordConfirm-error"
                    className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                    disabled={isSubmitting}
                  />
                  {actionData?.errors?.passwordConfirm ? (
                    <div className="pt-1 text-red-700" id="passwordConfirm-error">
                      {actionData.errors.passwordConfirm}
                    </div>
                  ) : null}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Resetting password..." : "Reset Password"}
              </Button>
            </Form>
          </>
        )}
      </div>
    </div>
  );
} 
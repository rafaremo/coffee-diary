import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { useEffect, useRef } from "react";

import { Button } from "~/components/ui/button";
import { createPasswordResetToken, getUserByEmail } from "~/models/user.server";
import { sendPasswordResetEmail } from "~/services/email.server";
import { getUserId } from "~/session.server";
import { validateEmail } from "~/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email");

  if (!validateEmail(email)) {
    return json(
      { errors: { email: "Email is invalid" }, status: "error" },
      { status: 400 },
    );
  }

  // Check if user exists
  const user = await getUserByEmail(email);
  
  // Even if user doesn't exist, we don't want to reveal this information
  // We'll still return a success message for security reasons
  if (!user) {
    return json({ 
      status: "success", 
      message: "If your email exists in our system, you will receive a password reset link."
    });
  }

  // Create a password reset token
  const resetData = await createPasswordResetToken(email);
  
  if (!resetData) {
    return json({ 
      status: "success", 
      message: "If your email exists in our system, you will receive a password reset link."
    });
  }

  // Send the password reset email
  const emailSent = await sendPasswordResetEmail(
    resetData.user, 
    resetData.passwordReset.token
  );

  if (!emailSent) {
    return json(
      { 
        errors: { email: "Failed to send reset email. Please try again." },
        status: "error",
      },
      { status: 500 },
    );
  }

  return json({ 
    status: "success", 
    message: "If your email exists in our system, you will receive a password reset link."
  });
};

export const meta: MetaFunction = () => [{ title: "Forgot Password" }];

export default function ForgotPasswordPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const emailRef = useRef<HTMLInputElement>(null);
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-8">
        <div className="flex justify-center mb-6">
          <h1 className="text-2xl font-bold">☕ Coffee Diary</h1>
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">Reset Password</h1>
        
        {actionData?.status === "success" ? (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            <p>{actionData.message}</p>
            <p className="mt-2 text-sm">
              Please check your email for the password reset link. The link will expire in 5 minutes.
            </p>
          </div>
        ) : (
          <Form method="post" className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  ref={emailRef}
                  id="email"
                  required
                  autoFocus={true}
                  name="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={actionData?.errors?.email ? true : undefined}
                  aria-describedby="email-error"
                  className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                  disabled={isSubmitting}
                />
                {actionData?.errors?.email ? (
                  <div className="pt-1 text-red-700" id="email-error">
                    {actionData.errors.email}
                  </div>
                ) : null}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending reset link..." : "Send Password Reset Link"}
            </Button>
            
            <div className="flex items-center justify-center">
              <div className="text-center text-sm text-gray-500">
                Remember your password?{" "}
                <a className="text-blue-500 underline" href="/login">
                  Log in
                </a>
              </div>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
} 
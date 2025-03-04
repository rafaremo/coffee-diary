import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation, useSearchParams } from "@remix-run/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { resendEmailConfirmation, verifyLogin } from "~/models/user.server";
import { sendEmailConfirmation } from "~/services/email.server";
import { createUserSession, getUserId } from "~/session.server";
import { safeRedirect, validateEmail } from "~/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/");
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/");
  const remember = formData.get("remember");
  const intent = formData.get("intent");

  // Handle resend confirmation email
  if (intent === "resend-confirmation" && typeof email === "string" && validateEmail(email)) {
    const result = await resendEmailConfirmation(email);
    
    if (!result) {
      return json(
        { 
          errors: { email: "No account found with this email address", password: null },
          resendStatus: null
        },
        { status: 400 },
      );
    }
    
    // If the user is already verified
    if ('alreadyVerified' in result && result.alreadyVerified) {
      return json(
        {
          errors: { email: null, password: null },
          resendStatus: "already-verified"
        },
        { status: 200 },
      );
    }
    
    // If we have a user and emailConfirmation object
    if ('user' in result && 'emailConfirmation' in result) {
      // Send the confirmation email
      await sendEmailConfirmation(result.user, result.emailConfirmation.token);
      
      return json(
        {
          errors: { email: null, password: null },
          resendStatus: "sent"
        },
        { status: 200 },
      );
    }
    
    return json(
      {
        errors: { email: "Failed to send verification email", password: null },
        resendStatus: "error"
      },
      { status: 500 },
    );
  }

  // Normal login flow
  if (!validateEmail(email)) {
    return json(
      { 
        errors: { email: "Email is invalid", password: null },
        resendStatus: null 
      },
      { status: 400 },
    );
  }

  if (typeof password !== "string" || password.length === 0) {
    return json(
      { 
        errors: { email: null, password: "Password is required" },
        resendStatus: null
      },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return json(
      { 
        errors: { email: null, password: "Password is too short" },
        resendStatus: null
      },
      { status: 400 },
    );
  }

  const user = await verifyLogin(email, password);

  if (!user) {
    return json(
      { 
        errors: { email: "Invalid email or password", password: null },
        resendStatus: null
      },
      { status: 400 },
    );
  }

  // Check if the user needs email verification
  if ('needsVerification' in user) {
    return json(
      { 
        errors: { 
          email: "Your email address has not been verified. Please check your inbox or request a new confirmation email.", 
          password: null 
        },
        pendingVerification: true,
        verificationEmail: email as string,
        resendStatus: null
      } as const,
      { status: 403 },
    );
  }

  return createUserSession({
    redirectTo,
    remember: remember === "on" ? true : false,
    request,
    userId: user.id,
  });
};

export const meta: MetaFunction = () => [{ title: "Login" }];

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef.current?.focus();
    } else if (actionData?.errors?.password) {
      passwordRef.current?.focus();
    }
  }, [actionData]);

  // This function is now just for UI feedback during form submission
  const handleResendConfirmation = () => {
    if (isResending) return;
    setIsResending(true);
    
    // Reset after a delay to ensure the UI updates when form redirects back
    setTimeout(() => setIsResending(false), 3000);
  };

  // Check if form is submitting a resend confirmation
  const isResendingInProgress = 
    navigation.state === "submitting" && 
    navigation.formData?.get("intent") === "resend-confirmation";

  // Type guards for actionData properties
  const hasPendingVerification = 
    actionData !== undefined && 
    'pendingVerification' in actionData && 
    actionData.pendingVerification === true;
    
  const hasVerificationEmail = 
    actionData !== undefined && 
    'verificationEmail' in actionData && 
    typeof actionData.verificationEmail === 'string';
    
  const resendStatus = 
    actionData !== undefined && 
    'resendStatus' in actionData ? 
    actionData.resendStatus : null;

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-8">
        <div className="flex justify-center mb-6">
          <h1 className="text-2xl font-bold">☕ Coffee Diary</h1>
        </div>

        {hasPendingVerification && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Email verification required</h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>Your account has been created, but you need to verify your email address.</p>
                  <Form method="post" className="mt-2">
                    {hasVerificationEmail && (
                      <input type="hidden" name="email" value={actionData.verificationEmail} />
                    )}
                    <input type="hidden" name="intent" value="resend-confirmation" />
                    <Button
                      type="submit"
                      className="text-xs bg-amber-600 hover:bg-amber-700"
                      disabled={isResending || isResendingInProgress}
                      onClick={handleResendConfirmation}
                    >
                      {isResending || isResendingInProgress ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Sending...
                        </>
                      ) : resendStatus === "sent" ? (
                        "Confirmation email sent!"
                      ) : (
                        "Resend confirmation email"
                      )}
                    </Button>
                  </Form>
                </div>
              </div>
            </div>
          </div>
        )}

        {resendStatus === "sent" && !hasPendingVerification && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-800">
              Confirmation email sent! Please check your inbox and follow the instructions.
            </p>
          </div>
        )}
        
        {resendStatus === "already-verified" && (
          <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              Your email is already verified. You can log in with your credentials.
            </p>
          </div>
        )}
        
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
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus={true}
                name="email"
                type="email"
                autoComplete="email"
                aria-invalid={actionData?.errors?.email ? true : undefined}
                aria-describedby="email-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.errors?.email ? (
                <div className="pt-1 text-red-700" id="email-error">
                  {actionData.errors.email}
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                ref={passwordRef}
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={actionData?.errors?.password ? true : undefined}
                aria-describedby="password-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.errors?.password ? (
                <div className="pt-1 text-red-700" id="password-error">
                  {actionData.errors.password}
                </div>
              ) : null}
            </div>
          </div>

          <input type="hidden" name="redirectTo" value={redirectTo} />
          <Button type="submit" className="w-full">
            Log in
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="remember"
                className="ml-2 block text-sm text-gray-900"
              >
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="text-blue-500 hover:text-blue-700"
              >
                Forgot password?
              </Link>
            </div>
          </div>
          <div className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              className="text-blue-500 underline"
              to={{
                pathname: "/join",
                search: searchParams.toString(),
              }}
            >
              Sign up
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
}

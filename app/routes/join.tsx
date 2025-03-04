import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation, useSearchParams } from "@remix-run/react";
import imageCompression from "browser-image-compression";
import { CheckCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { createEmailConfirmationToken, createUnverifiedUser, getUserByEmail } from "~/models/user.server";
import { sendEmailConfirmation } from "~/services/email.server";
import { uploadFileToS3 } from "~/services/s3.server";
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
  const name = formData.get("name");
  const surname = formData.get("surname");
  const avatarData = formData.get("avatarData");
  const favoriteCoffeePreparation = formData.get("favoriteCoffeePreparation");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/");

  if (!validateEmail(email)) {
    return json(
      { errors: { 
        email: "Email is invalid", 
        password: null,
        name: null,
        surname: null,
        avatarUrl: null,
        favoriteCoffeePreparation: null
      } },
      { status: 400 },
    );
  }

  if (typeof password !== "string" || password.length === 0) {
    return json(
      { errors: { 
        email: null, 
        password: "Password is required",
        name: null,
        surname: null,
        avatarUrl: null,
        favoriteCoffeePreparation: null
      } },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return json(
      { errors: { 
        email: null, 
        password: "Password is too short",
        name: null,
        surname: null,
        avatarUrl: null,
        favoriteCoffeePreparation: null
      } },
      { status: 400 },
    );
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return json(
      {
        errors: {
          email: "A user already exists with this email",
          password: null,
          name: null,
          surname: null,
          avatarUrl: null,
          favoriteCoffeePreparation: null
        },
      },
      { status: 400 },
    );
  }

  // Handle avatar upload to S3 if provided
  let avatarUrl = undefined;
  if (typeof avatarData === "string" && avatarData) {
    try {
      // Generate a unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExt = avatarData.includes('image/png') ? 'png' : 
                      avatarData.includes('image/jpeg') ? 'jpg' : 
                      avatarData.includes('image/gif') ? 'gif' : 'jpg';
      
      const fileName = `avatar_${timestamp}_${randomString}.${fileExt}`;
      const contentType = avatarData.includes('image/png') ? 'image/png' : 
                         avatarData.includes('image/jpeg') ? 'image/jpeg' : 
                         avatarData.includes('image/gif') ? 'image/gif' : 'image/jpeg';
      
      // Upload to S3 and get the URL
      avatarUrl = await uploadFileToS3(avatarData, fileName, contentType);
    } catch (error) {
      console.error("Error uploading avatar to S3:", error);
      return json(
        {
          errors: {
            email: null,
            password: null,
            name: null,
            surname: null,
            avatarUrl: "Failed to upload avatar image",
            favoriteCoffeePreparation: null
          },
        },
        { status: 500 },
      );
    }
  }

  // Create user with unverified email status
  const user = await createUnverifiedUser(
    email, 
    password,
    typeof name === "string" ? name : undefined,
    typeof surname === "string" ? surname : undefined,
    avatarUrl,
    typeof favoriteCoffeePreparation === "string" ? favoriteCoffeePreparation : undefined
  );

  // Create email confirmation token
  const confirmationResult = await createEmailConfirmationToken(user.id);
  if (confirmationResult) {
    // Send confirmation email
    try {
      await sendEmailConfirmation(confirmationResult.user, confirmationResult.emailConfirmation.token);
      console.log(`Confirmation email sent to ${email}`);
    } catch (error) {
      console.error("Failed to send confirmation email:", error);
      // We still continue and show success, user can request a new confirmation email
    }
  }

  return createUserSession({
    redirectTo,
    remember: false,
    request,
    userId: user.id,
  });
};

export const meta: MetaFunction = () => [{ title: "Sign Up" }];

export default function Join() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? undefined;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const surnameRef = useRef<HTMLInputElement>(null);
  const favoriteCoffeePreparationRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef.current?.focus();
    } else if (actionData?.errors?.password) {
      passwordRef.current?.focus();
    } else if (actionData?.errors?.name) {
      nameRef.current?.focus();
    } else if (actionData?.errors?.surname) {
      surnameRef.current?.focus();
    } else if (actionData?.errors?.favoriteCoffeePreparation) {
      favoriteCoffeePreparationRef.current?.focus();
    }
  }, [actionData]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      
      // Compress image before upload
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      };
      
      const compressedFile = await imageCompression(file, options);
      
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setIsProcessingImage(false);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error processing image:', error);
      setIsProcessingImage(false);
    }
  };

  const isButtonDisabled = isSubmitting || isProcessingImage;

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-8">
        <div className="flex justify-center mb-6">
          <h1 className="text-2xl font-bold">☕ Coffee Diary</h1>
        </div>
        <Form method="post" className="space-y-6">
          <div className="flex justify-center">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarPreview || ""} alt="Profile" />
              <AvatarFallback>
                {isProcessingImage ? <Loader2 className="h-8 w-8 animate-spin" /> : "U"}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div>
            <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">
              Profile Picture
            </label>
            <div className="mt-1">
              <input
                id="avatarFile"
                name="avatarFile"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={isProcessingImage || isSubmitting}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/80 disabled:opacity-50"
              />
              {avatarPreview && (
                <input
                  type="hidden"
                  name="avatarData"
                  value={avatarPreview}
                />
              )}
              {isProcessingImage && (
                <div className="text-xs text-gray-500 mt-1 flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1" /> Optimizing image...
                </div>
              )}
              {actionData?.errors?.avatarUrl && (
                <div className="pt-1 text-red-700">
                  {actionData.errors.avatarUrl}
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <div className="mt-1">
              <input
                ref={nameRef}
                id="name"
                name="name"
                type="text"
                autoComplete="given-name"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="surname"
              className="block text-sm font-medium text-gray-700"
            >
              Surname
            </label>
            <div className="mt-1">
              <input
                ref={surnameRef}
                id="surname"
                name="surname"
                type="text"
                autoComplete="family-name"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
            </div>
          </div>

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
                autoComplete="new-password"
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

          <div>
            <label
              htmlFor="favoriteCoffeePreparation"
              className="block text-sm font-medium text-gray-700"
            >
              Favorite Coffee Preparation
            </label>
            <div className="mt-1">
              <input
                ref={favoriteCoffeePreparationRef}
                id="favoriteCoffeePreparation"
                name="favoriteCoffeePreparation"
                type="text"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
                placeholder="e.g., Espresso, Pour Over, French Press"
              />
            </div>
          </div>

          <input type="hidden" name="redirectTo" value={redirectTo} />
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isButtonDisabled}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {avatarPreview ? "Uploading & Creating Account..." : "Creating Account..."}
              </>
            ) : (
              "Create Account"
            )}
          </Button>
          <div className="flex items-center justify-center">
            <div className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                className="text-blue-500 underline"
                to={{
                  pathname: "/login",
                  search: searchParams.toString(),
                }}
              >
                Log in
              </Link>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Slider } from "~/components/ui/slider";
import { Textarea } from "~/components/ui/textarea";

import { createCoffee, getUniqueCoffees } from "~/models/coffee.server";
import { requireUserId } from "~/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  
  const uniqueCoffees = await getUniqueCoffees({ userId });
  
  return json({ uniqueCoffees });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);

  const formData = await request.formData();
  const name = formData.get("name");
  const brand = formData.get("brand");
  const preparation = formData.get("preparation");
  const shots = formData.get("shots");
  const flavor = formData.get("flavor");
  const rating = formData.get("rating");
  const description = formData.get("description");

  const errors = {
    name: typeof name !== "string" || name.length === 0 ? "Coffee name is required" : null,
    brand: typeof brand !== "string" || brand.length === 0 ? "Coffee brand is required" : null,
    preparation: typeof preparation !== "string" || preparation.length === 0 ? "Preparation is required" : null,
    shots: typeof shots !== "string" || isNaN(parseInt(shots, 10)) ? "Number of shots is required" : null,
    flavor: typeof flavor !== "string" || flavor.length === 0 ? "Flavor description is required" : null,
    rating: typeof rating !== "string" || isNaN(parseInt(rating, 10)) ? "Rating is required" : null,
    description: typeof description !== "string" || description.length === 0 ? "Description is required" : null,
  };

  const hasErrors = Object.values(errors).some(
    (errorMessage) => errorMessage !== null
  );
  
  if (hasErrors) {
    return json({ errors }, { status: 400 });
  }

  const coffee = await createCoffee({
    name: name as string,
    brand: brand as string,
    preparation: preparation as string,
    shots: parseInt(shots as string, 10),
    flavor: flavor as string,
    rating: parseInt(rating as string, 10),
    description: description as string,
    userId,
  });

  return redirect(`/coffees/${coffee.id}`);
};

export default function NewCoffeePage() {
  const { uniqueCoffees } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  
  const nameRef = useRef<HTMLInputElement>(null);
  const brandRef = useRef<HTMLInputElement>(null);
  const preparationRef = useRef<HTMLSelectElement>(null);
  const shotsRef = useRef<HTMLInputElement>(null);
  const flavorRef = useRef<HTMLInputElement>(null);
  const ratingRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [ratingValue, setRatingValue] = useState(3);
  const [nameValue, setNameValue] = useState("");
  const [brandValue, setBrandValue] = useState("");
  
  const handlePreviousCoffeeSelect = (value: string) => {
    if (value === "new") return;
    
    const [coffeeName, coffeeBrand] = value.split('||');
    setNameValue(coffeeName);
    setBrandValue(coffeeBrand);
  };

  useEffect(() => {
    if (actionData?.errors?.name) {
      nameRef.current?.focus();
    } else if (actionData?.errors?.brand) {
      brandRef.current?.focus();
    } else if (actionData?.errors?.preparation) {
      preparationRef.current?.focus();
    } else if (actionData?.errors?.shots) {
      shotsRef.current?.focus();
    } else if (actionData?.errors?.flavor) {
      flavorRef.current?.focus();
    } else if (actionData?.errors?.rating) {
      ratingRef.current?.focus();
    } else if (actionData?.errors?.description) {
      descriptionRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold mb-6">Add New Coffee Entry</h2>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">New Coffee Details</CardTitle>
        </CardHeader>
        <CardContent>
          {uniqueCoffees.length > 0 && (
            <div className="mb-6">
              <Label htmlFor="previousCoffee">Select a previous entry to pre-fill</Label>
              <Select onValueChange={handlePreviousCoffeeSelect} defaultValue="new">
                <SelectTrigger id="previousCoffee">
                  <SelectValue placeholder="Choose a previous coffee or start from scratch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Start from scratch</SelectItem>
                  {uniqueCoffees.map(coffee => (
                    <SelectItem key={`${coffee.name}||${coffee.brand}`} value={`${coffee.name}||${coffee.brand}`}>
                      {coffee.name} ({coffee.brand})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <Form method="post" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Coffee Name</Label>
                <Input
                  ref={nameRef}
                  id="name"
                  name="name"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  aria-invalid={actionData?.errors?.name ? true : undefined}
                  aria-errormessage={
                    actionData?.errors?.name ? "name-error" : undefined
                  }
                />
                {actionData?.errors?.name && (
                  <p className="text-sm text-red-500" id="name-error">
                    {actionData.errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  ref={brandRef}
                  id="brand"
                  name="brand"
                  value={brandValue}
                  onChange={e => setBrandValue(e.target.value)}
                  aria-invalid={actionData?.errors?.brand ? true : undefined}
                  aria-errormessage={
                    actionData?.errors?.brand ? "brand-error" : undefined
                  }
                />
                {actionData?.errors?.brand && (
                  <p className="text-sm text-red-500" id="brand-error">
                    {actionData.errors.brand}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preparation">Preparation Method</Label>
                <Select name="preparation" defaultValue="Espresso">
                  <SelectTrigger id="preparation" ref={preparationRef}>
                    <SelectValue placeholder="Select preparation method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Espresso">Espresso</SelectItem>
                    <SelectItem value="Americano">Americano</SelectItem>
                    <SelectItem value="Pour Over">Pour Over</SelectItem>
                    <SelectItem value="French Press">French Press</SelectItem>
                    <SelectItem value="Drip">Drip</SelectItem>
                    <SelectItem value="Cold Brew">Cold Brew</SelectItem>
                    <SelectItem value="AeroPress">AeroPress</SelectItem>
                    <SelectItem value="Moka Pot">Moka Pot</SelectItem>
                  </SelectContent>
                </Select>
                {actionData?.errors?.preparation && (
                  <p className="text-sm text-red-500" id="preparation-error">
                    {actionData.errors.preparation}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shots">Shots</Label>
                <Input
                  ref={shotsRef}
                  id="shots"
                  name="shots"
                  type="number"
                  min="1"
                  max="4"
                  defaultValue="1"
                  aria-invalid={actionData?.errors?.shots ? true : undefined}
                  aria-errormessage={
                    actionData?.errors?.shots ? "shots-error" : undefined
                  }
                />
                {actionData?.errors?.shots && (
                  <p className="text-sm text-red-500" id="shots-error">
                    {actionData.errors.shots}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="flavor">Flavor Profile</Label>
                <Input
                  ref={flavorRef}
                  id="flavor"
                  name="flavor"
                  aria-invalid={actionData?.errors?.flavor ? true : undefined}
                  aria-errormessage={
                    actionData?.errors?.flavor ? "flavor-error" : undefined
                  }
                />
                {actionData?.errors?.flavor && (
                  <p className="text-sm text-red-500" id="flavor-error">
                    {actionData.errors.flavor}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating">Rating {ratingValue}/5</Label>
              <Slider
                ref={ratingRef}
                id="rating"
                name="rating-slider"
                defaultValue={[3]}
                min={1}
                max={5}
                step={1}
                onValueChange={(value) => setRatingValue(value[0])}
              />
              <input type="hidden" name="rating" value={ratingValue} />
              {actionData?.errors?.rating && (
                <p className="text-sm text-red-500" id="rating-error">
                  {actionData.errors.rating}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                ref={descriptionRef}
                id="description"
                name="description"
                rows={5}
                aria-invalid={actionData?.errors?.description ? true : undefined}
                aria-errormessage={
                  actionData?.errors?.description ? "description-error" : undefined
                }
              />
              {actionData?.errors?.description && (
                <p className="text-sm text-red-500" id="description-error">
                  {actionData.errors.description}
                </p>
              )}
            </div>

            {actionData?.errors?.form && (
              <div className="bg-red-50 border border-red-400 rounded p-4 mb-4 mt-2">
                <p className="text-red-500">{actionData.errors.form}</p>
              </div>
            )}

            <Button type="submit" className="w-full">Save Coffee Entry</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 
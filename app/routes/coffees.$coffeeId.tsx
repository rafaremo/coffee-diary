import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Slider } from "~/components/ui/slider";
import { Textarea } from "~/components/ui/textarea";

import { deleteCoffee, getCoffee, updateCoffee } from "~/models/coffee.server";
import { requireUserId } from "~/session.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const coffee = await getCoffee({ id: params.coffeeId as string, userId });

  if (!coffee) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ coffee });
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  const coffeeId = params.coffeeId as string;

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await deleteCoffee({ id: coffeeId, userId });
    return redirect("/coffees");
  }

  const name = formData.get("name");
  const brand = formData.get("brand");
  const preparation = formData.get("preparation");
  const shots = formData.get("shots");
  const flavor = formData.get("flavor");
  const rating = formData.get("rating");
  const description = formData.get("description");

  if (
    typeof name !== "string" ||
    typeof brand !== "string" ||
    typeof preparation !== "string" ||
    typeof shots !== "string" ||
    typeof flavor !== "string" ||
    typeof rating !== "string" ||
    typeof description !== "string"
  ) {
    return json(
      { errors: { form: "Form not submitted correctly." } },
      { status: 400 }
    );
  }

  await updateCoffee({
    id: coffeeId,
    userId,
    name,
    brand,
    preparation,
    shots: parseInt(shots, 10),
    flavor,
    rating: parseInt(rating, 10),
    description,
  });

  return json({ success: true });
};

export default function CoffeeDetailsPage() {
  const { coffee } = useLoaderData<typeof loader>();
  const [isEditing, setIsEditing] = useState(false);
  const [ratingValue, setRatingValue] = useState(coffee.rating);

  const handleSubmit = () => {
    setIsEditing(false);
    toast("Coffee entry updated", {
      description: "Your coffee entry has been saved successfully."
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle className="text-xl sm:text-2xl">{coffee.name}</CardTitle>
            <CardDescription className="text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span>{coffee.brand}</span>
              <span className="hidden sm:inline">•</span>
              <span>{coffee.preparation}</span>
              <span className="hidden sm:inline">•</span>
              <span>{new Date(coffee.createdAt).toLocaleDateString()}</span>
              <span className="hidden sm:inline">•</span>
              <span>{coffee.shots} shot{coffee.shots !== 1 ? "s" : ""}</span>
            </CardDescription>
          </div>
          
          <div className="flex gap-2 self-end sm:self-auto">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" form="coffee-form" onClick={handleSubmit}>
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
                <Form method="post">
                  <input type="hidden" name="intent" value="delete" />
                  <Button variant="destructive" type="submit">
                    Delete
                  </Button>
                </Form>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <Form method="post" id="coffee-form" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Coffee Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={coffee.name}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  name="brand"
                  defaultValue={coffee.brand}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preparation">Preparation</Label>
                <Select name="preparation" defaultValue={coffee.preparation}>
                  <SelectTrigger id="preparation">
                    <SelectValue placeholder="Select preparation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Espresso">Espresso</SelectItem>
                    <SelectItem value="Pour Over">Pour Over</SelectItem>
                    <SelectItem value="French Press">French Press</SelectItem>
                    <SelectItem value="Drip">Drip</SelectItem>
                    <SelectItem value="Cold Brew">Cold Brew</SelectItem>
                    <SelectItem value="AeroPress">AeroPress</SelectItem>
                    <SelectItem value="Moka Pot">Moka Pot</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shots">Shots</Label>
                <Input
                  id="shots"
                  name="shots"
                  type="number"
                  min="1"
                  max="4"
                  defaultValue={coffee.shots}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="flavor">Flavor Profile</Label>
                <Input
                  id="flavor"
                  name="flavor"
                  defaultValue={coffee.flavor}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating">Rating {ratingValue}/5</Label>
              <Slider
                id="rating"
                name="rating"
                defaultValue={[coffee.rating]}
                min={1}
                max={5}
                step={1}
                onValueChange={(value) => setRatingValue(value[0])}
              />
              <input type="hidden" name="rating" value={ratingValue} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={coffee.description}
                required
                rows={5}
              />
            </div>
          </Form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold text-sm text-gray-500">Preparation</h3>
                <p>{coffee.preparation}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-500">Shots</h3>
                <p>{coffee.shots}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-500">Flavor Profile</h3>
                <p>{coffee.flavor}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-500">Rating</h3>
              <div className="flex items-center mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${
                      i < coffee.rating ? "text-yellow-400" : "text-gray-300"
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-2 text-gray-600">{coffee.rating} out of 5</span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-500">Description</h3>
              <p className="whitespace-pre-line">{coffee.description}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
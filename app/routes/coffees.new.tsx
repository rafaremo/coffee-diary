import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { Edit, Save, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Slider } from "~/components/ui/slider";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";

import { createCoffee, getUniqueCoffees, getCoffeeListItems, updateCoffee } from "~/models/coffee.server";
import { requireUserId } from "~/session.server";

type ActionDataErrors = {
  errors: {
    name?: string | null;
    brand?: string | null;
    preparation?: string | null;
    shots?: string | null;
    flavor?: string | null;
    rating?: string | null;
    description?: string | null;
    form?: string | null;
  };
};

type ActionDataSuccess = {
  success: boolean;
  coffee: any;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  
  const uniqueCoffees = await getUniqueCoffees({ userId });
  const coffeeList = await getCoffeeListItems({ userId });
  
  return json({ uniqueCoffees, coffeeList });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const _action = formData.get("_action");

  if (_action === "edit") {
    const id = formData.get("id");
    const name = formData.get("name");
    const brand = formData.get("brand");

    if (
      typeof id !== "string" || 
      typeof name !== "string" || 
      typeof brand !== "string"
    ) {
      return json<ActionDataErrors>({ 
        errors: { form: "Invalid form data" } 
      }, { status: 400 });
    }

    const coffee = await updateCoffee({
      id,
      name,
      brand,
      // We need to include all required fields from the Coffee model
      // but we're only updating name and brand, so we'll get the current values
      // for the other fields from the existing coffee
      preparation: formData.get("preparation") as string,
      shots: parseInt(formData.get("shots") as string, 10),
      flavor: formData.get("flavor") as string,
      rating: parseInt(formData.get("rating") as string, 10),
      description: formData.get("description") as string,
      userId,
    });

    return json<ActionDataSuccess>({ success: true, coffee });
  }

  // Handle the original form submission
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
    return json<ActionDataErrors>({ errors }, { status: 400 });
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
  const { uniqueCoffees, coffeeList } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionDataErrors | ActionDataSuccess>();
  const submit = useSubmit();
  
  const nameRef = useRef<HTMLInputElement>(null);
  const brandRef = useRef<HTMLInputElement>(null);
  const shotsRef = useRef<HTMLInputElement>(null);
  const flavorRef = useRef<HTMLInputElement>(null);
  const ratingRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [ratingValue, setRatingValue] = useState(3);
  const [nameValue, setNameValue] = useState("");
  const [brandValue, setBrandValue] = useState("");
  const [selectedCoffee, setSelectedCoffee] = useState<string | null>(null);
  
  // State for editing coffee in the table
  const [editingCoffeeId, setEditingCoffeeId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  
  const handlePreviousCoffeeSelect = (value: string) => {
    if (value === "new") {
      setNameValue("");
      setBrandValue("");
      return;
    }
    
    const [coffeeName, coffeeBrand] = value.split('||');
    setNameValue(coffeeName);
    setBrandValue(coffeeBrand);
    setSelectedCoffee(value);
  };
  
  const startEditing = (coffee: any) => {
    setEditingCoffeeId(coffee.id);
    setEditName(coffee.name);
    setEditBrand(coffee.brand);
  };
  
  const cancelEditing = () => {
    setEditingCoffeeId(null);
  };
  
  const saveEditing = (coffee: any) => {
    const formData = new FormData();
    formData.append("_action", "edit");
    formData.append("id", coffee.id);
    formData.append("name", editName);
    formData.append("brand", editBrand);
    
    // Include all the other required fields
    formData.append("preparation", coffee.preparation);
    formData.append("shots", coffee.shots.toString());
    formData.append("flavor", coffee.flavor);
    formData.append("rating", coffee.rating.toString());
    formData.append("description", coffee.description);
    
    submit(formData, { method: "post" });
    setEditingCoffeeId(null);
  };

  useEffect(() => {
    if (actionData && 'errors' in actionData) {
      if (actionData.errors.name) {
        nameRef.current?.focus();
      } else if (actionData.errors.brand) {
        brandRef.current?.focus();
      } else if (actionData.errors.shots) {
        shotsRef.current?.focus();
      } else if (actionData.errors.flavor) {
        flavorRef.current?.focus();
      } else if (actionData.errors.rating) {
        ratingRef.current?.focus();
      } else if (actionData.errors.description) {
        descriptionRef.current?.focus();
      }
    }
  }, [actionData]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold mb-6">Coffee Manager</h2>
      
      <Tabs defaultValue="new">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="new" className="flex-1">Add New Coffee</TabsTrigger>
          <TabsTrigger value="list" className="flex-1">Coffee List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Your Coffee Collection</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>A list of your coffee entries.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Preparation</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coffeeList.map((coffee) => (
                    <TableRow key={coffee.id}>
                      <TableCell className="font-medium">
                        {editingCoffeeId === coffee.id ? (
                          <Input 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          coffee.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCoffeeId === coffee.id ? (
                          <Input 
                            value={editBrand}
                            onChange={(e) => setEditBrand(e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          coffee.brand
                        )}
                      </TableCell>
                      <TableCell>{coffee.preparation}</TableCell>
                      <TableCell>{coffee.rating}/5</TableCell>
                      <TableCell>{new Date(coffee.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {editingCoffeeId === coffee.id ? (
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => saveEditing(coffee)}
                              title="Save"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={cancelEditing}
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => startEditing(coffee)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">New Coffee Details</CardTitle>
            </CardHeader>
            <CardContent>
              {uniqueCoffees.length > 0 && (
                <div className="mb-6">
                  <Label htmlFor="previousCoffee">Select a previous entry or create a new one</Label>
                  <Select 
                    onValueChange={handlePreviousCoffeeSelect} 
                    defaultValue="new"
                    value={selectedCoffee || "new"}
                  >
                    <SelectTrigger id="previousCoffee">
                      <SelectValue placeholder="Choose a previous coffee or start from scratch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Create a new coffee</SelectItem>
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
                      aria-invalid={actionData && 'errors' in actionData && actionData.errors.name ? true : undefined}
                      aria-errormessage={
                        actionData && 'errors' in actionData && actionData.errors.name ? "name-error" : undefined
                      }
                    />
                    {actionData && 'errors' in actionData && actionData.errors.name && (
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
                      aria-invalid={actionData && 'errors' in actionData && actionData.errors.brand ? true : undefined}
                      aria-errormessage={
                        actionData && 'errors' in actionData && actionData.errors.brand ? "brand-error" : undefined
                      }
                    />
                    {actionData && 'errors' in actionData && actionData.errors.brand && (
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
                      <SelectTrigger id="preparation">
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
                    {actionData && 'errors' in actionData && actionData.errors.preparation && (
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
                      aria-invalid={actionData && 'errors' in actionData && actionData.errors.shots ? true : undefined}
                      aria-errormessage={
                        actionData && 'errors' in actionData && actionData.errors.shots ? "shots-error" : undefined
                      }
                    />
                    {actionData && 'errors' in actionData && actionData.errors.shots && (
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
                      aria-invalid={actionData && 'errors' in actionData && actionData.errors.flavor ? true : undefined}
                      aria-errormessage={
                        actionData && 'errors' in actionData && actionData.errors.flavor ? "flavor-error" : undefined
                      }
                    />
                    {actionData && 'errors' in actionData && actionData.errors.flavor && (
                      <p className="text-sm text-red-500" id="flavor-error">
                        {actionData.errors.flavor}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rating">Rating {ratingValue}/5</Label>
                  <Slider
                    id="rating"
                    name="rating-slider"
                    defaultValue={[3]}
                    min={1}
                    max={5}
                    step={1}
                    onValueChange={(value) => setRatingValue(value[0])}
                  />
                  <input type="hidden" name="rating" value={ratingValue} />
                  {actionData && 'errors' in actionData && actionData.errors.rating && (
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
                    aria-invalid={actionData && 'errors' in actionData && actionData.errors.description ? true : undefined}
                    aria-errormessage={
                      actionData && 'errors' in actionData && actionData.errors.description ? "description-error" : undefined
                    }
                  />
                  {actionData && 'errors' in actionData && actionData.errors.description && (
                    <p className="text-sm text-red-500" id="description-error">
                      {actionData.errors.description}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full">Save Coffee Entry</Button>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
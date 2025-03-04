import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { format } from "date-fns";

import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { getCoffeeListItemsPaginated } from "~/models/coffee.server";
import { requireUserId } from "~/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const perPage = 10; // Fixed at 10 per page as requested
  
  const coffeeData = await getCoffeeListItemsPaginated({ 
    userId, 
    page,
    perPage 
  });
  
  return json({ coffeeData });
};

export default function CoffeeFeedPage() {
  const { coffeeData } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const currentPage = coffeeData.pagination.currentPage;
  
  // Generate pagination links
  const createPaginationLink = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    return `?${params.toString()}`;
  };
  
  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-bold mb-4">Coffee Feed</h2>
      
      <div className="bg-white rounded-md shadow-sm overflow-hidden mb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Preparation</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coffeeData.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No coffee entries yet. <Link to="/coffees/new" className="text-blue-500 underline">Add your first coffee</Link>
                </TableCell>
              </TableRow>
            ) : (
              coffeeData.items.map((coffee) => (
                <TableRow key={coffee.id}>
                  <TableCell className="font-medium">{coffee.name}</TableCell>
                  <TableCell>{coffee.brand}</TableCell>
                  <TableCell>{coffee.preparation}</TableCell>
                  <TableCell>{coffee.rating}/5</TableCell>
                  <TableCell>
                    {coffee.createdAt 
                      ? format(new Date(coffee.createdAt), "MMM d, yyyy")
                      : "—"
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/coffees/${coffee.id}`}>
                      <Button variant="default" size="sm">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination controls */}
      {coffeeData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-sm text-gray-600">
              Showing {coffeeData.items.length} of {coffeeData.pagination.totalItems} entries
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!coffeeData.pagination.hasPrevPage}
              onClick={() => {
                if (coffeeData.pagination.hasPrevPage) {
                  window.location.href = createPaginationLink(currentPage - 1);
                }
              }}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: coffeeData.pagination.totalPages }, (_, i) => i + 1)
                .filter(page => 
                  page === 1 || 
                  page === coffeeData.pagination.totalPages || 
                  Math.abs(page - currentPage) <= 1
                )
                .map((page, index, array) => {
                  // Add ellipsis when there are gaps in the pagination
                  if (index > 0 && page - array[index - 1] > 1) {
                    return (
                      <div key={`ellipsis-${page}`} className="flex items-center">
                        <span className="mx-1">...</span>
                        <Link 
                          to={createPaginationLink(page)}
                          className={`inline-flex items-center justify-center h-8 w-8 rounded-md text-sm ${
                            page === currentPage
                              ? "bg-blue-600 text-white"
                              : "bg-white text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {page}
                        </Link>
                      </div>
                    );
                  }
                  
                  return (
                    <Link 
                      key={page}
                      to={createPaginationLink(page)}
                      className={`inline-flex items-center justify-center h-8 w-8 rounded-md text-sm ${
                        page === currentPage
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {page}
                    </Link>
                  );
                })
              }
            </div>
            
            <Button
              variant="outline"
              size="sm"
              disabled={!coffeeData.pagination.hasNextPage}
              onClick={() => {
                if (coffeeData.pagination.hasNextPage) {
                  window.location.href = createPaginationLink(currentPage + 1);
                }
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 
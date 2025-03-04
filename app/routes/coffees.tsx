import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, Link, NavLink, Outlet, useLoaderData } from "@remix-run/react";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { requireUserId } from "~/session.server";
import { useUser } from "~/utils";
import { getCoffeeListItems } from "~/models/coffee.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const coffeeListItems = await getCoffeeListItems({ userId });
  return json({ coffeeListItems });
};

export default function CoffeesPage() {
  const data = useLoaderData<typeof loader>();
  const user = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="flex items-center justify-between bg-slate-800 p-4 text-white">
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleSidebar} 
            className="block md:hidden text-white"
            aria-label="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-2xl md:text-3xl font-bold">
            <Link to=".">☕ Coffee Diary</Link>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <p className="hidden sm:block text-sm overflow-hidden text-ellipsis">{user.email}</p>
          <Form action="/logout" method="post">
            <Button variant="ghost" size="sm">
              Logout
            </Button>
          </Form>
        </div>
      </header>

      <main className="flex h-full flex-1 bg-white">
        {/* Mobile Sidebar - shown/hidden based on state */}
        <div 
          className={`fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity md:hidden ${
            sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={toggleSidebar}
        ></div>
        
        <div 
          className={`fixed md:static md:flex z-50 h-full w-[250px] md:w-80 border-r bg-gray-50 flex-shrink-0 transform transition-transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="flex flex-col h-full overflow-y-auto w-full">
            <Link to="new" className="block p-4 text-xl text-blue-500">
              <Button className="w-full">
                + New Coffee Entry
              </Button>
            </Link>
            
            <Link to="stats" className="block px-4 pb-4 text-xl text-blue-500">
              <Button className="w-full" variant="outline">
                📊 Statistics
              </Button>
            </Link>

            <hr />

            {data.coffeeListItems.length === 0 ? (
              <div className="p-4">No coffee entries yet</div>
            ) : (
              <ol>
                {data.coffeeListItems.map((coffee) => (
                  <li key={coffee.id}>
                    <NavLink
                      className={({ isActive }) =>
                        `block border-b p-4 text-lg md:text-xl ${isActive ? "bg-white" : ""}`
                      }
                      to={coffee.id}
                      onClick={() => {
                        // Close sidebar on mobile when clicking a link
                        if (window.innerWidth < 768) {
                          setSidebarOpen(false);
                        }
                      }}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between flex-wrap">
                          <span className="font-medium truncate">{coffee.name}</span>
                          <span className="flex items-center text-sm">
                            Rating: {coffee.rating}/5
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {coffee.brand} - {coffee.preparation}
                        </div>
                      </div>
                    </NavLink>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className="flex-1 p-4 md:p-6 overflow-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
} 
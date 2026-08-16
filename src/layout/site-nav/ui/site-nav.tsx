import { Menu, X } from "lucide-react";
import { Button } from "@/shared/ui";
import { siteConfig } from "@/shared/config/site";
import { getCurrentUser, logout } from "@/features/auth";

export async function SiteNav() {
  const user = await getCurrentUser();

  return (
    <header className="relative border-b-2 border-divider">
      <nav className="flex items-center gap-8 px-6 py-4 md:px-12">
        <span className="font-heading text-lg font-extrabold tracking-tight">
          {siteConfig.name}
        </span>

        <ul className="ml-auto hidden items-center gap-6 md:flex">
          {siteConfig.navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-semibold hover:text-accent-500"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto hidden items-center gap-2.5 md:flex">
          {user ? (
            <>
              <a href="/my-garage" className="text-sm font-semibold">
                My Garage
              </a>
              <form action={logout}>
                <Button type="submit" variant="ghost" className="px-0">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button href="/login" variant="secondary">
                Log in
              </Button>
              <Button href="/signup" variant="primary">
                Sign up
              </Button>
            </>
          )}
        </div>

        <details className="group ml-auto md:hidden">
          <summary
            aria-label="Toggle menu"
            className="flex h-9 w-9 list-none items-center justify-center outline-none marker:hidden focus-visible:outline-2 focus-visible:outline-accent-500 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden"
          >
            <Menu className="h-5 w-5 group-open:hidden" />
            <X className="hidden h-5 w-5 group-open:block" />
          </summary>

          <div className="absolute inset-x-0 top-full flex flex-col gap-4 border-t-2 border-divider bg-background px-6 py-5 shadow-lg">
            {siteConfig.navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold"
              >
                {link.label}
              </a>
            ))}
            {user ? (
              <>
                <a href="/my-garage" className="text-sm font-semibold">
                  My Garage
                </a>
                <form action={logout}>
                  <Button
                    type="submit"
                    variant="ghost"
                    className="px-0 text-left"
                  >
                    Log out
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex gap-2.5">
                <Button href="/login" variant="secondary">
                  Log in
                </Button>
                <Button href="/signup" variant="primary">
                  Sign up
                </Button>
              </div>
            )}
          </div>
        </details>
      </nav>
    </header>
  );
}

import { Menu, X } from "lucide-react";
import { Button } from "@/shared/ui";
import { siteConfig } from "@/shared/config/site";
import { isLoggedIn } from "@/shared/session/mock-session";

export function SiteNav() {
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
          {isLoggedIn ? (
            <>
              <a href="/garage" className="text-sm font-semibold">
                My Garage
              </a>
              <button
                type="button"
                className="text-sm font-semibold text-accent-500"
              >
                Log out
              </button>
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
            {isLoggedIn ? (
              <>
                <a href="/garage" className="text-sm font-semibold">
                  My Garage
                </a>
                <button
                  type="button"
                  className="text-left text-sm font-semibold text-accent-500"
                >
                  Log out
                </button>
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
